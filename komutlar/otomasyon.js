const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const db = require("croxydb");
const { getLangSync, t } = require("../dil");
const { isPremium, SAHIP_ID, ownerLog } = require("../utils");
const { ticketKategorisiniGarantiEt } = require("./ticket");

/* Kategori çözümle: etiket > ham ID > otomatik kurulum.
   Ticket sistemi kurulu değilse kategoriyi direkt oluşturur. */
async function kategoriCoz(message, lang, gid, txt) {
  // 1. Etiket
  let kg = message.mentions.channels.find(c => c.type === ChannelType.GuildCategory) || null;
  if (kg) return { kategori: kg, otomatik: false };
  // 2. Ham ID (örn: 123456789012345678)
  const idAday = String(txt || "").replace(/\D/g, "");
  if (idAday) {
    const aday = message.guild.channels.cache.get(idAday) || await message.guild.channels.fetch(idAday).catch(() => null);
    if (aday && aday.type === ChannelType.GuildCategory) return { kategori: aday, otomatik: false };
    return { hata: true };
  }
  // 3. ID de yoksa: ticket sistemi kurulu değilse direkt otomatik kur
  const kayitliId = db.fetch(`ticket_kategori.${gid}`);
  const kayitli = kayitliId ? (message.guild.channels.cache.get(kayitliId) || await message.guild.channels.fetch(kayitliId).catch(() => null)) : null;
  if (kayitli && kayitli.type === ChannelType.GuildCategory) return { kategori: kayitli, otomatik: false };
  const olusan = await ticketKategorisiniGarantiEt(message.guild);
  if (olusan) return { kategori: olusan, otomatik: true };
  return { hata: true };
}

/* Otomasyon durumunu döndürür; kuran premiumu bitmişse DURAKLAT (veri silinmez). */
function otomasyonDurum(guildId) {
  const kayit = db.fetch(`otomasyon_${guildId}`);
  if (!kayit || !kayit.aktif) return null;
  if (kayit.kuran !== SAHIP_ID && !isPremium(kayit.kuran)) {
    if (!kayit.duraklatildi) {
      kayit.duraklatildi = true;
      try { db.set(`otomasyon_${guildId}`, kayit); } catch {}
    }
    return { ...kayit, bitmis: true };
  }
  if (kayit.duraklatildi) {
    kayit.duraklatildi = false;
    try { db.set(`otomasyon_${guildId}`, kayit); } catch {}
  }
  return kayit;
}
exports.otomasyonDurum = otomasyonDurum;

function sunucuSayilari(gid) {
  const all = db.all() || {};
  let soru = 0, cevapsiz = 0;
  for (const k of Object.keys(all)) {
    if (k.startsWith(`otoegitim_${gid}_`)) soru++;
    if (k.startsWith(`otocevapsiz_${gid}_`)) cevapsiz++;
  }
  return { soru, cevapsiz };
}

function kanalAdi(guild, id, varsayilan) {
  const c = id ? guild.channels.cache.get(id) : null;
  return c ? `${c}` : varsayilan;
}

/* Sunucu modlog kanalına yazar (ayarlıysa, sessizce atlar) */
function modlogGonder(guild, icerik) {
  try {
    if (!guild) return;
    const cfg = db.fetch(`otomasyon_${guild.id}`);
    if (!cfg?.modlogKanal) return;
    const kanal = guild.channels.cache.get(cfg.modlogKanal);
    if (!kanal?.isTextBased()) return;
    kanal.send(icerik).catch(() => {});
  } catch {}
}
exports.modlogGonder = modlogGonder;

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  if (!message.guild) return;
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply(t(lang, "ortak.yoneticiGerek")).catch(() => {});

  // 💎 Premium kontrol (sahip muaf)
  if (message.author.id !== SAHIP_ID && !isPremium(message.author.id)) {
    const e = new EmbedBuilder().setColor("Gold")
      .setTitle(t(lang, "otomasyon.aktif"))
      .setDescription(t(lang, "ortak.premiumGerek"));
    return message.reply({ embeds: [e] }).catch(() => {});
  }

  const sub = (args[0] || "").toLowerCase();
  const gid = message.guild.id;

  // --- Kapat: çalışmayı durdurur, VERİLER DURUR ---
  if (sub === "kapat" || sub === "off" || sub === "kapat") {
    const kayit = db.fetch(`otomasyon_${gid}`);
    if (!kayit?.aktif) return message.reply(t(lang, "otomasyon.durumYok")).catch(() => {});
    kayit.aktif = false;
    try { db.set(`otomasyon_${gid}`, kayit); } catch {}
    try { ownerLog(client, `🤖 **Otomasyon kapatıldı (veriler duruyor):** **${message.guild.name}** (${gid}) — ${message.author.tag} (<@${message.author.id}>)`).catch(() => {}); } catch {}
    try { modlogGonder(message.guild, t(lang, "otomasyon.kapatildiDurur")); } catch {}
    return message.reply(t(lang, "otomasyon.kapatildiDurur")).catch(() => {});
  }

  // --- Veri sil: TÜM otomasyon verilerini kalıcı siler ---
  if ((sub === "veri" && (args[1] || "").toLowerCase() === "sil") || sub === "verisil" || sub === "veri-sil") {
    try {
      const all = db.all() || {};
      let n = 0;
      for (const k of Object.keys(all)) {
        if (k.startsWith(`otoegitim_${gid}_`) || k.startsWith(`otocevapsiz_${gid}_`)) { try { db.delete(k); n++; } catch {} }
      }
      db.delete(`otomasyon_${gid}`);
    } catch {}
    try { ownerLog(client, `🗑️ **Otomasyon verileri silindi:** **${message.guild.name}** (${gid}) — ${message.author.tag} (<@${message.author.id}>)`).catch(() => {}); } catch {}
    return message.reply(t(lang, "otomasyon.veriSilOk")).catch(() => {});
  }

  // --- Durum ---
  if (sub === "durum" || sub === "status") {
    const durum = otomasyonDurum(gid);
    if (!durum) return message.reply(t(lang, "otomasyon.durumYok")).catch(() => {});
    if (durum.bitmis) {
      await message.channel.send(t(lang, "otomasyon.duraklatildi")).catch(() => {});
      try { ownerLog(client, `🤖 **Otomasyon duraklatıldı (premium bitti, veriler duruyor):** **${message.guild.name}** (${gid}) — kuran: <@${durum.kuran}>`).catch(() => {}); } catch {}
      try { modlogGonder(message.guild, t(lang, "otomasyon.duraklatildi")); } catch {}
      return;
    }
    const { soru, cevapsiz } = sunucuSayilari(gid);
    const kanal = kanalAdi(message.guild, durum.noAnswerKanal, "-");
    const kat = durum.ticketKategori ? kanalAdi(message.guild, durum.ticketKategori, "-") : "-";
    const mlog = durum.modlogKanal ? kanalAdi(message.guild, durum.modlogKanal, "-") : "-";
    const d = durum.duraklatildi ? t(lang, "otomasyon.durumDuraklatildi") : t(lang, "otomasyon.durumAktif");
    return message.reply(t(lang, "otomasyon.durumVar", { durum: d, sayi: soru, cevapsiz, kanal, kategori: kat }) + `\nModlog: ${mlog}`).catch(() => {});
  }

  // --- Kanal: r!otomasyon kanal #x (no-answer kanalı) ---
  if (sub === "kanal" || sub === "channel" || sub === "cevapsiz" || sub === "cevapsız") {
    const durum = otomasyonDurum(gid);
    if (!durum || durum.bitmis) return message.reply(t(lang, "otomasyon.onceAc")).catch(() => {});
    const kanal = message.mentions.channels.find(c => c.isTextBased?.());
    if (!kanal) return message.reply(t(lang, "otomasyon.ayarKanalYok")).catch(() => {});
    const kayit = db.fetch(`otomasyon_${gid}`) || {};
    kayit.noAnswerKanal = kanal.id;
    try { db.set(`otomasyon_${gid}`, kayit); } catch {}
    try { ownerLog(client, `📋 **Otomasyon no-answer kanalı:** **${message.guild.name}** (${gid}) — ${message.author.tag} — #${kanal.name}`).catch(() => {}); } catch {}
    return message.reply(t(lang, "otomasyon.kanalOk", { kanal: `${kanal}` })).catch(() => {});
  }

  // --- Ayar: r!otomasyon ayar #kanal #kategori [#modlog] ---
  if (sub === "ayar" || sub === "settings" || sub === "ayarla") {
    const durum = otomasyonDurum(gid);
    if (!durum || durum.bitmis) return message.reply(t(lang, "otomasyon.onceAc")).catch(() => {});
    const metinKanallar = [...message.mentions.channels.filter(c => c.isTextBased?.()).values()];
    const kanal = metinKanallar[0];
    const modlog = metinKanallar[1] || null;
    if (!kanal) return message.reply(t(lang, "otomasyon.ayarKanalYok")).catch(() => {});
    const katCozum = await kategoriCoz(message, lang, gid, args.slice(1).join(" "));
    if (katCozum.hata || !katCozum.kategori) return message.reply(t(lang, "otomasyon.kategoriIdYok")).catch(() => {});
    const kategori = katCozum.kategori;
    const kayit = db.fetch(`otomasyon_${gid}`) || {};
    kayit.noAnswerKanal = kanal.id;
    kayit.ticketKategori = kategori.id;
    if (modlog) kayit.modlogKanal = modlog.id;
    try { db.set(`otomasyon_${gid}`, kayit); } catch {}
    try { ownerLog(client, `⚙️ **Otomasyon ayar:** **${message.guild.name}** (${gid}) — ${message.author.tag} — no-answer: #${kanal.name}, kategori: ${kategori.name}${modlog ? `, modlog: #${modlog.name}` : ""}`).catch(() => {}); } catch {}
    try { modlogGonder(message.guild, t(lang, "otomasyon.ayarOk", { kanal: `${kanal}`, kategori: `${kategori}` })); } catch {}
    if (katCozum.otomatik) await message.channel.send(t(lang, "ticket.kategoriOtomatik", { kategori: `${kategori}` })).catch(() => {});
    return message.reply(t(lang, "otomasyon.ayarOk", { kanal: `${kanal}`, kategori: `${kategori}` })).catch(() => {});
  }

  // --- Öğret / Soru ekle: r!otomasyon öğret soru | cevap ---
  if (sub === "öğret" || sub === "ogret" || sub === "teach" || sub === "ekle" || sub === "add" || sub === "soru" || sub === "soruekle" || sub === "soru-ekle") {
    const durum = otomasyonDurum(gid);
    if (!durum) return message.reply(t(lang, "otomasyon.onceAc")).catch(() => {});
    if (durum.bitmis) {
      await message.channel.send(t(lang, "otomasyon.duraklatildi")).catch(() => {});
      try { ownerLog(client, `🤖 **Otomasyon duraklatıldı (premium bitti):** **${message.guild.name}** (${gid})`).catch(() => {}); } catch {}
      return;
    }
    const ham = args.slice(1).join(" ");
    // "soru ekle" yazıldıysa ikinci kelimeyi atla
    const temiz = ham.replace(/^(soru|ekle)\s+/i, "");
    const ayrac = temiz.indexOf("|");
    if (ayrac < 0) return message.reply(t(lang, "otomasyon.kullanimOgret")).catch(() => {});
    const soru = temiz.slice(0, ayrac).trim().slice(0, 500);
    const cevap = temiz.slice(ayrac + 1).trim().slice(0, 2000);
    if (!soru || !cevap) return message.reply(t(lang, "otomasyon.ikisiGerek")).catch(() => {});
    const id = `oto_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
    db.set(`otoegitim_${gid}_${id}`, { soru, cevap, ekleyen: message.author.id, tarih: Date.now() });
    try { ownerLog(client, `🧠 **Otomasyon eğitim** (<@${message.author.id}> ${message.author.tag}) — **${message.guild.name}** (${gid})\n❓ ${soru.slice(0, 300)}\n💡 ${cevap.slice(0, 500)}`).catch(() => {}); } catch {}
    try { modlogGonder(message.guild, `🧠 **Eğitim eklendi** (<@${message.author.id}>)\n❓ ${soru.slice(0, 300)}`); } catch {}
    return message.reply(t(lang, "otomasyon.ogretOk", { soru })).catch(() => {});
  }

  // --- Aç / kurulum ---
  const mevcut = db.fetch(`otomasyon_${gid}`);
  // Zaten kuruluysa tekrar kurulamaz
  if (mevcut?.aktif && !mevcut.duraklatildi) {
    const { soru } = sunucuSayilari(gid);
    return message.reply(t(lang, "otomasyon.zatenKurulu", { sayi: soru }) + `\n\n💡 **${t(lang, "otomasyon.ogretKullanim")}**\n\`r!otomasyon öğret soru | cevap\``).catch(() => {});
  }
  // Duraklatılmışsa ve premium yenilenmişse devam et
  if (mevcut?.aktif && mevcut.duraklatildi) {
    const durum = otomasyonDurum(gid);
    if (durum && !durum.bitmis) {
      return message.reply(t(lang, "otomasyon.devamEdiyor")).catch(() => {});
    }
    return message.reply(t(lang, "otomasyon.duraklatildi")).catch(() => {});
  }

  const metinKanallar = [...message.mentions.channels.filter(c => c.isTextBased?.()).values()];
  const kanal = metinKanallar[0] || null;
  const modlogIlk = metinKanallar[1] || null;
  const kategori = message.mentions.channels.find(c => c.type === ChannelType.GuildCategory) || null;

  // İnteraktif kurulum: önce eğitim sorusu, sonra cevabı
  db.set(`otomasyon_${gid}`, { aktif: false, kuran: message.author.id, tarih: Date.now(), noAnswerKanal: kanal?.id || null, ticketKategori: kategori?.id || null, modlogKanal: modlogIlk?.id || null, kurulumAsama: "soru" });
  try { ownerLog(client, `🤖 **Otomasyon kurulum başladı:** **${message.guild.name}** (${gid}) — kuran: <@${message.author.id}> ${message.author.tag}`).catch(() => {}); } catch {}
  await message.channel.send(t(lang, "otomasyon.kurulumSoru")).catch(() => {});

  const filter = m => m.author.id === message.author.id;
  const collector = message.channel.createMessageCollector({ filter, time: 10 * 60 * 1000 });
  const state = { asama: "soru", soru: "", kanal: kanal?.id || null, kategori: kategori?.id || null, modlog: modlogIlk?.id || null };
  collector.on("collect", async m => {
    try {
      const txt = m.content.trim();
      if (["iptal", "cancel", "vazgeç", "vazgec"].includes(txt.toLowerCase())) {
        collector.stop("iptal");
        try { db.delete(`otomasyon_${gid}`); } catch {}
        await message.channel.send(t(lang, "otomasyon.kurulumIptal")).catch(() => {});
        return;
      }
      if (state.asama === "soru") {
        state.soru = txt.slice(0, 500);
        state.asama = "cevap";
        await message.channel.send(t(lang, "otomasyon.kurulumCevap")).catch(() => {});
      } else if (state.asama === "cevap") {
        const id = `oto_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
        db.set(`otoegitim_${gid}_${id}`, { soru: state.soru, cevap: txt.slice(0, 2000), ekleyen: message.author.id, tarih: Date.now() });
        try { ownerLog(client, `🧠 **Otomasyon ilk eğitim** (<@${message.author.id}>) — **${message.guild.name}** (${gid})\n❓ ${state.soru.slice(0, 300)}`).catch(() => {}); } catch {}
        if (!state.kanal) {
          state.asama = "kanal";
          await message.channel.send(t(lang, "otomasyon.kurulumKanal")).catch(() => {});
        } else if (!state.kategori) {
          state.asama = "kategori";
          await message.channel.send(t(lang, "otomasyon.kurulumKategori")).catch(() => {});
        } else if (!state.modlog) {
          state.asama = "modlog";
          await message.channel.send(t(lang, "otomasyon.modlogSor")).catch(() => {});
        } else {
          collector.stop("bitti"); return kurulumBitir(client, message, lang, gid, state);
        }
      } else if (state.asama === "kanal") {
        const kc = m.mentions.channels.find(c => c.isTextBased?.());
        if (!kc) { await message.channel.send(t(lang, "otomasyon.ayarKanalYok")).catch(() => {}); return; }
        state.kanal = kc.id;
        if (!state.kategori) {
          state.asama = "kategori";
          await message.channel.send(t(lang, "otomasyon.kurulumKategori")).catch(() => {});
        } else if (!state.modlog) {
          state.asama = "modlog";
          await message.channel.send(t(lang, "otomasyon.modlogSor")).catch(() => {});
        } else {
          collector.stop("bitti"); return kurulumBitir(client, message, lang, gid, state);
        }
      } else if (state.asama === "kategori") {
        const cozum = await kategoriCoz(m, lang, gid, txt);
        if (cozum.hata || !cozum.kategori) { await message.channel.send(t(lang, "otomasyon.kategoriIdYok")).catch(() => {}); return; }
        state.kategori = cozum.kategori.id;
        if (cozum.otomatik) {
          await message.channel.send(t(lang, "ticket.kategoriOtomatik", { kategori: `${cozum.kategori}` })).catch(() => {});
        }
        if (!state.modlog) {
          state.asama = "modlog";
          await message.channel.send(t(lang, "otomasyon.modlogSor")).catch(() => {});
        } else {
          collector.stop("bitti"); return kurulumBitir(client, message, lang, gid, state);
        }
      } else if (state.asama === "modlog") {
        if (!["atla", "skip", "geç", "gec"].includes(txt.toLowerCase())) {
          const mk = m.mentions.channels.find(c => c.isTextBased?.());
          if (mk) state.modlog = mk.id;
        }
        collector.stop("bitti"); return kurulumBitir(client, message, lang, gid, state);
      }
    } catch {}
  });
  collector.on("end", async (_c, reason) => {
    try {
      if (reason !== "bitti") {
        try { db.delete(`otomasyon_${gid}`); } catch {}
        await message.channel.send(t(lang, "otomasyon.kurulumZamanAsimi")).catch(() => {});
      }
    } catch {}
  });
};

function kurulumBitir(client, message, lang, gid, state) {
  db.set(`otomasyon_${gid}`, { aktif: true, kuran: message.author.id, tarih: Date.now(), noAnswerKanal: state.kanal, ticketKategori: state.kategori, modlogKanal: state.modlog || null });
  try { ownerLog(client, `🤖 **Otomasyon kuruldu:** **${message.guild.name}** (${gid}) — kuran: <@${message.author.id}> ${message.author.tag}`).catch(() => {}); } catch {}
  try { modlogGonder(message.guild, t(lang, "otomasyon.sssBitti")); } catch {}
  return message.channel.send(t(lang, "otomasyon.sssBitti")).catch(() => {});
}

exports.conf = { enabled: true, guildOnly: true, aliases: ["oto", "otomasyon-ai", "auto"], permLevel: 4, kategori: "yapayzeka" };
exports.help = { name: "otomasyon", description: "Sunucuya özel AI eğitimi (Premium).", usage: "otomasyon | aç [#kanal #kategori #modlog] | öğret soru | cevap | kanal #x | ayar | durum | kapat | veri sil" };
