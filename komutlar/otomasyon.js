const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const db = require("croxydb");
const { getLangSync, t } = require("../dil");
const { isPremium, SAHIP_ID, ownerLog } = require("../utils");

/* Otomasyon durumu: kuran premiumu bitmişse DURAKLAT (veri silinmez, çalışmaz). */
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
    // Premium yenilenmişse otomatik devam
    kayit.duraklatildi = false;
    try { db.set(`otomasyon_${guildId}`, kayit); } catch {}
  }
  return kayit;
}
exports.otomasyonDurum = otomasyonDurum;

function sunucuSayilari(gid) {
  const all = db.all() || {};
  let soru = 0, cevapsiz = 0;
  for (const [k] of Object.entries(all)) {
    if (k.startsWith(`otoegitim_${gid}_`)) soru++;
    if (k.startsWith(`otocevapsiz_${gid}_`)) cevapsiz++;
  }
  return { soru, cevapsiz };
}

function kanalAdi(guild, id, varsayilan) {
  const c = id ? guild.channels.cache.get(id) : null;
  return c ? `${c}` : varsayilan;
}

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

  // --- Kapat (verileri de siler) ---
  if (sub === "kapat" || sub === "off" || sub === "sifirla" || sub === "sıfırla") {
    try {
      const all = db.all() || {};
      for (const k of Object.keys(all)) {
        if (k.startsWith(`otoegitim_${gid}_`) || k.startsWith(`otocevapsiz_${gid}_`)) { try { db.delete(k); } catch {} }
      }
      db.delete(`otomasyon_${gid}`);
    } catch {}
    try { ownerLog(client, `🤖 **Otomasyon kapatıldı:** **${message.guild.name}** (${gid}) — ${message.author.tag} (<@${message.author.id}>)`).catch(() => {}); } catch {}
    return message.reply(t(lang, "otomasyon.kapatildi")).catch(() => {});
  }

  // --- Durum ---
  if (sub === "durum" || sub === "status") {
    const durum = otomasyonDurum(gid);
    if (!durum) return message.reply(t(lang, "otomasyon.durumYok")).catch(() => {});
    if (durum.bitmis) {
      await message.channel.send(t(lang, "otomasyon.duraklatildi")).catch(() => {});
      try { ownerLog(client, `🤖 **Otomasyon duraklatıldı (premium bitti, veriler duruyor):** **${message.guild.name}** (${gid}) — kuran: <@${durum.kuran}>`).catch(() => {}); } catch {}
      return;
    }
    const { soru, cevapsiz } = sunucuSayilari(gid);
    const kanal = kanalAdi(message.guild, durum.noAnswerKanal, "-");
    const kat = durum.ticketKategori ? kanalAdi(message.guild, durum.ticketKategori, "-") : "-";
    const d = durum.duraklatildi ? t(lang, "otomasyon.durumDuraklatildi") : t(lang, "otomasyon.durumAktif");
    return message.reply(t(lang, "otomasyon.durumVar", { durum: d, sayi: soru, cevapsiz, kanal, kategori: kat })).catch(() => {});
  }

  // --- Ayar: r!otomasyon ayar #kanal #kategori ---
  if (sub === "ayar" || sub === "settings" || sub === "ayarla") {
    const durum = otomasyonDurum(gid);
    if (!durum || durum.bitmis) return message.reply(t(lang, "otomasyon.onceAc")).catch(() => {});
    const kanal = message.mentions.channels.find(c => c.isTextBased?.());
    const kategori = message.mentions.channels.find(c => c.type === ChannelType.GuildCategory);
    if (!kanal) return message.reply(t(lang, "otomasyon.ayarKanalYok")).catch(() => {});
    if (!kategori) return message.reply(t(lang, "otomasyon.ayarKategoriYok")).catch(() => {});
    const kayit = db.fetch(`otomasyon_${gid}`) || {};
    kayit.noAnswerKanal = kanal.id;
    kayit.ticketKategori = kategori.id;
    try { db.set(`otomasyon_${gid}`, kayit); } catch {}
    try { ownerLog(client, `⚙️ **Otomasyon ayar:** **${message.guild.name}** (${gid}) — ${message.author.tag} — no-answer: #${kanal.name}, kategori: ${kategori.name}`).catch(() => {}); } catch {}
    return message.reply(t(lang, "otomasyon.ayarOk", { kanal: `${kanal}`, kategori: `${kategori}` })).catch(() => {});
  }

  // --- Öğret: r!otomasyon öğret soru | cevap ---
  if (sub === "öğret" || sub === "ogret" || sub === "teach" || sub === "ekle" || sub === "add") {
    const durum = otomasyonDurum(gid);
    if (!durum) return message.reply(t(lang, "otomasyon.onceAc")).catch(() => {});
    if (durum.bitmis) {
      await message.channel.send(t(lang, "otomasyon.duraklatildi")).catch(() => {});
      try { ownerLog(client, `🤖 **Otomasyon duraklatıldı (premium bitti):** **${message.guild.name}** (${gid})`).catch(() => {}); } catch {}
      return;
    }
    const ham = args.slice(1).join(" ");
    const ayrac = ham.indexOf("|");
    if (ayrac < 0) return message.reply(t(lang, "otomasyon.kullanimOgret")).catch(() => {});
    const soru = ham.slice(0, ayrac).trim().slice(0, 500);
    const cevap = ham.slice(ayrac + 1).trim().slice(0, 2000);
    if (!soru || !cevap) return message.reply(t(lang, "otomasyon.ikisiGerek")).catch(() => {});
    const id = `oto_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
    db.set(`otoegitim_${gid}_${id}`, { soru, cevap, ekleyen: message.author.id, tarih: Date.now() });
    try { ownerLog(client, `🧠 **Otomasyon eğitim** (<@${message.author.id}> ${message.author.tag}) — **${message.guild.name}** (${gid})\n❓ ${soru.slice(0, 300)}\n💡 ${cevap.slice(0, 500)}`).catch(() => {}); } catch {}
    return message.reply(t(lang, "otomasyon.ogretOk", { soru })).catch(() => {});
  }

  // --- Aç / kurulum (varsayılan): no-answer kanalı + ticket kategorisi + SSS ---
  const mevcut = db.fetch(`otomasyon_${gid}`);
  if (mevcut?.aktif && !mevcut.duraklatildi) {
    const { soru } = sunucuSayilari(gid);
    const e = new EmbedBuilder().setColor("Green")
      .setTitle(t(lang, "otomasyon.aktif"))
      .setDescription(t(lang, "otomasyon.aktifAciklama") + `\n\n📚 ${soru} kayıtlı soru.`);
    return message.reply({ embeds: [e] }).catch(() => {});
  }

  const kanal = message.mentions.channels.find(c => c.isTextBased?.());
  const kategori = message.mentions.channels.find(c => c.type === ChannelType.GuildCategory);

  // Etiket yoksa: kurulum başlat
  if (!kanal || !kategori) {
    db.set(`otomasyon_${gid}`, { aktif: true, kuran: message.author.id, tarih: Date.now(), noAnswerKanal: kanal?.id || null, ticketKategori: kategori?.id || null, kurulumAsama: (!kanal || !kategori) ? "ayar" : "sss" });
    try { ownerLog(client, `🤖 **Otomasyon kuruldu:** **${message.guild.name}** (${gid}) — kuran: <@${message.author.id}> ${message.author.tag}`).catch(() => {}); } catch {}
    if (!kanal || !kategori) {
      const e = new EmbedBuilder().setColor("Green")
        .setTitle(t(lang, "otomasyon.aktif"))
        .setDescription(t(lang, "otomasyon.ayarAciklama", { kanal: kanal ? `${kanal}` : "-", kategori: kategori ? `${kategori}` : "-" }));
      await message.reply({ embeds: [e] }).catch(() => {});
      return message.reply(lang === "en" ? "Send both mentions together to finish setup, e.g.: `r!otomasyon aç #no-answer #tickets`" : "Kurulumu bitirmek için ikisini birlikte etiketleyin, örn: `r!otomasyon aç #cevapsız-sorular #ticketlar`").catch(() => {});
    }
  } else {
    db.set(`otomasyon_${gid}`, { aktif: true, kuran: message.author.id, tarih: Date.now(), noAnswerKanal: kanal.id, ticketKategori: kategori.id, kurulumAsama: "sss" });
    try { ownerLog(client, `🤖 **Otomasyon kuruldu:** **${message.guild.name}** (${gid}) — kuran: <@${message.author.id}> ${message.author.tag} — no-answer: #${kanal.name}, kategori: ${kategori.name}`).catch(() => {}); } catch {}
  }

  // SSS adımı: sık sorulan soruları topla (collector, bitir ile çıkış)
  let no = 1;
  await message.channel.send(t(lang, "otomasyon.sssSor", { no })).catch(() => {});
  const filter = m => m.author.id === message.author.id;
  const collector = message.channel.createMessageCollector({ filter, time: 10 * 60 * 1000 });
  let beklenen = "soru", sonSoru = "";
  collector.on("collect", async m => {
    try {
      const txt = m.content.trim();
      if (beklenen === "soru") {
        if (["bitir", "done", "iptal", "bitti"].includes(txt.toLowerCase())) {
          collector.stop("bitti");
          await message.channel.send(t(lang, "otomasyon.sssBitti")).catch(() => {});
          try { const k = db.fetch(`otomasyon_${gid}`) || {}; delete k.kurulumAsama; db.set(`otomasyon_${gid}`, k); } catch {}
          try { ownerLog(client, `🤖 **Otomasyon SSS tamamlandı:** **${message.guild.name}** (${gid})`).catch(() => {}); } catch {}
          return;
        }
        sonSoru = txt.slice(0, 500);
        beklenen = "cevap";
        await message.channel.send(t(lang, "otomasyon.sssCevapSor")).catch(() => {});
      } else {
        const id = `oto_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
        db.set(`otoegitim_${gid}_${id}`, { soru: sonSoru, cevap: txt.slice(0, 2000), ekleyen: message.author.id, tarih: Date.now() });
        try { ownerLog(client, `🧠 **Otomasyon SSS** (<@${message.author.id}>) — **${message.guild.name}** (${gid})\n❓ ${sonSoru.slice(0, 300)}`).catch(() => {}); } catch {}
        beklenen = "soru";
        no++;
        await message.channel.send(t(lang, "otomasyon.sssKaydedildi") + "\n" + t(lang, "otomasyon.sssSor", { no })).catch(() => {});
      }
    } catch {}
  });
  collector.on("end", async (_c, reason) => {
    try {
      if (reason !== "bitti") {
        const k = db.fetch(`otomasyon_${gid}`) || {};
        delete k.kurulumAsama;
        db.set(`otomasyon_${gid}`, k);
        await message.channel.send(t(lang, "otomasyon.sssAtlandi")).catch(() => {});
      }
    } catch {}
  });

  const e = new EmbedBuilder().setColor("Green")
    .setTitle(t(lang, "otomasyon.aktif"))
    .setDescription(t(lang, "otomasyon.aktifAciklama"));
  return message.reply({ embeds: [e] }).catch(() => {});
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["oto", "otomasyon-ai", "auto"], permLevel: 4, kategori: "yapayzeka" };
exports.help = { name: "otomasyon", description: "Sunucuya özel AI eğitimi (Premium).", usage: "otomasyon aç | öğret soru | cevap | ayar #kanal #kategori | durum | kapat" };
