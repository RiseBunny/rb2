/**
 * RiseBunny AI — Metinle Komut Çalıştırma Motoru (executor)
 * - `rise <doğal dil>` isteğini AI tool-call JSON'una çevirir, yetki süzgecinden geçirip çalıştırır.
 * - Güvenlik katmanları: beta-tester kapısı, premium kapısı, Discord izni, rol hiyerarşisi,
 *   kendine/bota/sahibe karşı koruma, max 3 tool iterasyonu, ret logu.
 * - Sahip komutları tool listesine HİÇ eklenmez (eval, bakım, veri, yedek, kupon, ...).
 */
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const db = require("croxydb");
if (!db.fetch) db.fetch = db.get;
const { getLangSync } = require("../dil");
const { ownerLog, modLogGonder, isPremium, SAHIP_ID } = require("../utils");

/* ── Sabitler ─────────────────────────────────────────────── */
const MAX_ITER = 3;
// Site/admin tarafındaki ikinci yetkili (siterol'deki mevcut liste korunur)
const IKINCI_YETKILI = "1310366324731547798";

// AI'ya HİÇ tanıtılmayan (çağrılamayan) kritik komutlar
const SAHIP_KOMUTLARI = new Set([
  "eval", "bakım", "bakim", "veri", "yedek", "yedek-yükle", "yedekyukle",
  "kupon", "kodoluştur", "kuponoluştur", "mağaza-yönet", "magaza",
  "premium-ver", "premium-sil", "presil", "prever", "presil",
  "karaliste", "blacklist", "beyazliste", "whitelist",
  "siterol", "site-rol", "verisil",
]);

// Bilgi-vs-eylem ayrımı: bu kelimeler varsa yerel KB atlanır, tool yoluna gidilir
const EYLEM_KELIMELERI = [
  "banla", "yasakla", "ban", "kick", "kickle", " at ", "atin", "kov",
  "mute", "sustur", "susturma", "timeout", "unmute",
  "uyar", "warn", "sil", "temizle", "clear", "purge",
  "rol ver", "rol al", "rolver", "rolal", "rolekle", "rolçıkar",
  "para gönder", "para ver", "gönder", "transfer", "çal", "soygun",
  "koruma aç", "koruma kapat", "küfürengel", "reklamengel", "spam",
  "çekiliş başlat", "çekiliş", "giveaway", "başlat", "sonlandır", "reroll",
  "ticket aç", "ticket", "bilet aç", "sunucukur", "sunucu kur", "setup",
  "kayıt", "kaydet", "erkek", "kız ", "mute at", "uyarı ver",
  "oylama", "poll", "anket", "hatırlat", "remind", "afk",
];

function isAction(soru) {
  const s = ` ${String(soru || "").toLowerCase()} `;
  return EYLEM_KELIMELERI.some(k => s.includes(k));
}

/* ── Beta tester / Mod sistemleri (croxydb) ───────────────── */
function betaListesi() {
  try { return db.fetch("betaTesterler") || []; } catch { return []; }
}
function isBetaTester(userId) {
  if (!userId) return false;
  if (String(userId) === String(SAHIP_ID)) return true;
  try { return betaListesi().map(String).includes(String(userId)); } catch { return false; }
}
function betaEkle(userId) {
  const l = betaListesi().map(String);
  if (!l.includes(String(userId))) { l.push(String(userId)); db.set("betaTesterler", l); return true; }
  return false;
}
function betaCikar(userId) {
  const l = betaListesi().map(String).filter(x => x !== String(userId));
  db.set("betaTesterler", l);
}
function modListesi() {
  try { return db.fetch("modlar") || []; } catch { return []; }
}
function isMod(userId) {
  if (!userId) return false;
  if (String(userId) === String(SAHIP_ID)) return true;
  try { return modListesi().map(String).includes(String(userId)); } catch { return false; }
}
function modEkle(userId) {
  const l = modListesi().map(String);
  if (!l.includes(String(userId))) { l.push(String(userId)); db.set("modlar", l); return true; }
  return false;
}
function modCikar(userId) {
  const l = modListesi().map(String).filter(x => x !== String(userId));
  db.set("modlar", l);
}
// Modların çalıştırabildiği normalde-sahip komutları
function modMuafKomut(muafAd) {
  return ["karaliste", "beyazliste", "kupon", "bakım"].includes(String(muafAd || "").toLowerCase());
}
function modYetkiliMi(userId) {
  return isMod(userId);
}

/* ── Hedef çözümleyici ────────────────────────────────────── */
async function hedefCoz(guild, girdi) {
  if (!guild || !girdi) return null;
  const raw = String(girdi).trim();
  const id = raw.replace(/[<@!>]/g, "");
  if (/^\d{15,25}$/.test(id)) {
    const m = await guild.members.fetch(id).catch(() => null);
    if (m) return m;
  }
  // mention içinde geçen id
  const mId = raw.match(/(\d{15,25})/);
  if (mId) {
    const m = await guild.members.fetch(mId[1]).catch(() => null);
    if (m) return m;
  }
  const ara = raw.toLowerCase().replace(/^@/, "");
  const uyeler = await guild.members.fetch().catch(() => guild.members.cache);
  const liste = uyeler.filter(m =>
    m.user.username.toLowerCase().includes(ara) ||
    (m.nickname && m.nickname.toLowerCase().includes(ara)) ||
    m.user.tag.toLowerCase() === ara
  );
  if (liste.size === 1) return liste.first();
  // tam eşleşme önceliği
  const tam = liste.find(m => m.user.username.toLowerCase() === ara || (m.nickname && m.nickname.toLowerCase() === ara));
  return tam || null;
}

function rolCoz(guild, girdi) {
  if (!guild || !girdi) return null;
  const raw = String(girdi).trim();
  const id = raw.replace(/[<@&>]/g, "");
  if (/^\d{15,25}$/.test(id)) return guild.roles.cache.get(id) || null;
  const ara = raw.toLowerCase().replace(/^@/, "");
  return guild.roles.cache.find(r => r.name.toLowerCase() === ara)
    || guild.roles.cache.find(r => r.name.toLowerCase().includes(ara)) || null;
}

/* ── Koruma kontrolleri ───────────────────────────────────── */
function korumaKontrol({ guild, yazar, hedef, islem }) {
  const lang = getLangSync(yazar.id);
  const EN = lang === "en";
  // Kendine karşı
  if (hedef && hedef.id === yazar.id)
    return { ok: false, kod: "kendine", mesaj: EN ? "❌ You can't do that to yourself 😅" : "❌ Kendine bunu yapamazsın 😅" };
  // Bot koruması
  if (hedef && hedef.id === guild.members.me?.id)
    return { ok: false, kod: "bot", mesaj: EN ? "❌ You can't do that to me 🐰" : "❌ Bunu bana yapamazsın 🐰" };
  // Sahip koruması (moderasyon hedefi olamaz)
  if (hedef && (hedef.id === SAHIP_ID || hedef.id === guild.ownerId) && ["ban", "kick", "mute"].includes(islem))
    return { ok: false, kod: "korumali", mesaj: EN ? "❌ I can't touch this user, they're protected." : "❌ Bu kullanıcıya dokunamam, korumalı." };
  // Rol hiyerarşisi (yazar vs hedef)
  if (hedef && yazar && ["ban", "kick", "mute", "rolver", "rolal"].includes(islem)) {
    try {
      const yazarEnYuksek = yazar.roles.highest;
      const hedefEnYuksek = hedef.roles.highest;
      if (hedefEnYuksek.position >= yazarEnYuksek.position && yazar.id !== guild.ownerId)
        return { ok: false, kod: "hiyerarsi", mesaj: EN ? "❌ Target's role is higher than yours." : "❌ Hedefin rolü senden yüksek." };
    } catch {}
  }
  // Bot hiyerarşisi
  if (hedef && ["ban", "kick", "mute", "rolver"].includes(islem)) {
    try {
      if (!hedef.manageable && islem !== "rolver")
        return { ok: false, kod: "bothiyerarsi", mesaj: EN ? "❌ I can't touch this user (my role is too low)." : "❌ Bu kullanıcıya dokunamam (rolüm yetmiyor)." };
    } catch {}
  }
  return { ok: true };
}

async function retLog(client, { guild, yazar, islem, eksik }) {
  try {
    const e = new EmbedBuilder().setColor("Red").setTimestamp()
      .setTitle("🚫 AI Komut Reddi (yetki)")
      .setDescription(`**Kullanıcı:** ${yazar.tag} (<@${yazar.id}>)\n**Sunucu:** ${guild?.name || "DM"} (${guild?.id || "-"})\n**İşlem:** \`${islem}\`\n**Eksik:** ${eksik}`);
    await ownerLog(client, e);
  } catch {}
}

/* ── Süre ayrıştırıcı (mute için) ─────────────────────────── */
function sureCoz(girdi) {
  if (!girdi) return null;
  const s = String(girdi).toLowerCase().replace(/\s+/g, "");
  const m = s.match(/^(\d+)(sn|s|dk|m|sa|h|gün|gun|d|hafta|w)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  const b = m[2] || "m";
  const carp = { sn: 1e3, s: 1e3, dk: 6e4, m: 6e4, sa: 36e5, h: 36e5, "gün": 864e5, gun: 864e5, d: 864e5, hafta: 6048e5, w: 6048e5 };
  const ms = n * (carp[b] || 6e4);
  if (ms < 5e3 || ms > 28 * 864e5) return null;
  return ms;
}

/* ── Tool çalıştırıcılar ───────────────────────────────────── */
async function calistirBan(client, message, p) {
  const hedef = await hedefCoz(message.guild, p.kullanici);
  if (!hedef) return { ok: false, kod: "bulunamadi", hedefAd: p.kullanici };
  const k = korumaKontrol({ guild: message.guild, yazar: message.member, hedef, islem: "ban" });
  if (!k.ok) return k;
  if (!hedef.bannable) return { ok: false, kod: "bothiyerarsi", mesaj: "banlanamıyor" };
  const sebep = (p.sebep || "Sebep belirtilmedi").slice(0, 450);
  await hedef.ban({ reason: `${message.author.tag}: ${sebep}`.slice(0, 490) });
  await modLogGonder(message.guild, new EmbedBuilder().setColor("Red")
    .setDescription(`🔨 **Ban (AI)**\n**Banlanan:** ${hedef.user.tag} (${hedef.id})\n**Sebep:** ${sebep}\n**Yetkili:** ${message.author.tag}`).setTimestamp());
  return { ok: true, kod: "ban", hedefAd: hedef.user.tag, sebep };
}

async function calistirKick(client, message, p) {
  const hedef = await hedefCoz(message.guild, p.kullanici);
  if (!hedef) return { ok: false, kod: "bulunamadi", hedefAd: p.kullanici };
  const k = korumaKontrol({ guild: message.guild, yazar: message.member, hedef, islem: "kick" });
  if (!k.ok) return k;
  if (!hedef.kickable) return { ok: false, kod: "bothiyerarsi", mesaj: "atılamıyor" };
  const sebep = (p.sebep || "Sebep belirtilmedi").slice(0, 450);
  await hedef.kick(`${message.author.tag}: ${sebep}`.slice(0, 490));
  await modLogGonder(message.guild, new EmbedBuilder().setColor("Orange")
    .setDescription(`👢 **Kick (AI)**\n**Atılan:** ${hedef.user.tag} (${hedef.id})\n**Sebep:** ${sebep}\n**Yetkili:** ${message.author.tag}`).setTimestamp());
  return { ok: true, kod: "kick", hedefAd: hedef.user.tag, sebep };
}

async function calistirMute(client, message, p) {
  const hedef = await hedefCoz(message.guild, p.kullanici);
  if (!hedef) return { ok: false, kod: "bulunamadi", hedefAd: p.kullanici };
  const k = korumaKontrol({ guild: message.guild, yazar: message.member, hedef, islem: "mute" });
  if (!k.ok) return k;
  const sure = sureCoz(p.sure || "10m");
  if (!sure) return { ok: false, kod: "eksik", mesaj: "sure" };
  if (!hedef.moderatable) return { ok: false, kod: "bothiyerarsi", mesaj: "susturulamıyor" };
  const sebep = (p.sebep || "Sebep belirtilmedi").slice(0, 450);
  await hedef.timeout(sure, `${message.author.tag}: ${sebep}`.slice(0, 490));
  await modLogGonder(message.guild, new EmbedBuilder().setColor("Gold")
    .setDescription(`🔇 **Mute (AI)**\n**Susturulan:** ${hedef.user.tag} (${hedef.id})\n**Süre:** ${Math.round(sure / 60000)} dk\n**Sebep:** ${sebep}\n**Yetkili:** ${message.author.tag}`).setTimestamp());
  return { ok: true, kod: "mute", hedefAd: hedef.user.tag, sebep };
}

async function calistirUnmute(client, message, p) {
  const hedef = await hedefCoz(message.guild, p.kullanici);
  if (!hedef) return { ok: false, kod: "bulunamadi", hedefAd: p.kullanici };
  await hedef.timeout(null).catch(() => { throw new Error("x"); });
  return { ok: true, kod: "unmute", hedefAd: hedef.user.tag };
}

async function calistirWarn(client, message, p) {
  const hedef = await hedefCoz(message.guild, p.kullanici);
  if (!hedef) return { ok: false, kod: "bulunamadi", hedefAd: p.kullanici };
  if (hedef.user.bot) return { ok: false, kod: "bot", mesaj: "botlar uyarılamaz" };
  const k = korumaKontrol({ guild: message.guild, yazar: message.member, hedef, islem: "warn" });
  if (!k.ok && k.kod !== "hiyerarsi") return k;
  const sebep = (p.sebep || "Sebep belirtilmedi").slice(0, 450);
  db.add(`uyarı.${message.guild.id}.${hedef.id}`, 1);
  const toplam = db.fetch(`uyarı.${message.guild.id}.${hedef.id}`) || 1;
  await modLogGonder(message.guild, new EmbedBuilder().setColor("Yellow")
    .setDescription(`⚠️ **Uyarı (AI)**\n**Kullanıcı:** ${hedef.user.tag} (${hedef.id})\n**Sebep:** ${sebep}\n**Toplam:** ${toplam}\n**Yetkili:** ${message.author.tag}`).setTimestamp());
  return { ok: true, kod: "warn", hedefAd: hedef.user.tag, sebep, toplam };
}

async function calistirClear(client, message, p) {
  const adet = Math.max(1, Math.min(100, Number(p.adet) || 0));
  if (!adet) return { ok: false, kod: "eksik", mesaj: "adet" };
  const silinen = await message.channel.bulkDelete(adet, true);
  const m = await message.channel.send(`🧹 **${silinen.size}** mesaj silindi.`).catch(() => null);
  if (m) setTimeout(() => m.delete().catch(() => {}), 5000);
  return { ok: true, kod: "clear", adet: silinen.size };
}

async function calistirRolVer(client, message, p) {
  const hedef = await hedefCoz(message.guild, p.kullanici);
  if (!hedef) return { ok: false, kod: "bulunamadi", hedefAd: p.kullanici };
  const rol = rolCoz(message.guild, p.rol);
  if (!rol) return { ok: false, kod: "rolbulunamadi", hedefAd: p.rol };
  if (rol.id === message.guild.id || rol.managed) return { ok: false, kod: "rolverilemez" };
  if (rol.position >= message.guild.members.me.roles.highest.position)
    return { ok: false, kod: "bothiyerarsi", mesaj: "rolüm yetmiyor" };
  const k = korumaKontrol({ guild: message.guild, yazar: message.member, hedef, islem: "rolver" });
  if (!k.ok) return k;
  await hedef.roles.add(rol);
  return { ok: true, kod: "rolver", hedefAd: hedef.user.tag, rolAd: rol.name };
}

async function calistirRolAl(client, message, p) {
  const hedef = await hedefCoz(message.guild, p.kullanici);
  if (!hedef) return { ok: false, kod: "bulunamadi", hedefAd: p.kullanici };
  const rol = rolCoz(message.guild, p.rol);
  if (!rol) return { ok: false, kod: "rolbulunamadi", hedefAd: p.rol };
  await hedef.roles.remove(rol).catch(() => { throw new Error("x"); });
  return { ok: true, kod: "rolal", hedefAd: hedef.user.tag, rolAd: rol.name };
}

function calistirBakiye(client, message, p) {
  const para = Number(db.fetch(`para_${message.author.id}`) || 0);
  const banka = Number(db.fetch(`banka_${message.author.id}`) || 0);
  return { ok: true, kod: "bakiye", para, banka };
}

function calistirSeviye(client, message, p) {
  const { xpSeviye } = require("../utils");
  const xp = Number(db.fetch(`xp_${message.author.id}`) || 0);
  const seviye = xpSeviye(xp);
  return { ok: true, kod: "seviye", xp, seviye };
}

function calistirSunucuBilgi(client, message) {
  const g = message.guild;
  return { ok: true, kod: "sunucubilgi", ad: g.name, uye: g.memberCount, olusturma: g.createdAt?.toLocaleDateString?.() || "?" };
}

async function calistirKullaniciBilgi(client, message, p) {
  const hedef = p.kullanici ? (await hedefCoz(message.guild, p.kullanici)) : message.member;
  if (!hedef) return { ok: false, kod: "bulunamadi", hedefAd: p.kullanici };
  return { ok: true, kod: "kullanicibilgi", hedefAd: hedef.user.tag, id: hedef.id, katilma: hedef.joinedAt?.toLocaleDateString?.() || "?" };
}

async function calistirTicket(client, message, p) {
  const { acBilet } = require("../komutlar/ticket");
  const lang = getLangSync(message.author.id);
  const mevcut = db.fetch(`ass.${message.guild.id}.${message.author.id}`);
  if (mevcut && message.guild.channels.cache.get(mevcut))
    return { ok: false, kod: "biletvAr", kanal: `<#${mevcut}>` };
  const sebep = (p.sebep || p.konu || "AI ile açılan destek bileti").slice(0, 200);
  const kanal = await acBilet(client, message.guild, message.author, sebep, lang, message.channel, null);
  if (!kanal) return { ok: false, kod: "hata" };
  return { ok: true, kod: "ticket", kanal: `${kanal}` };
}

function calistirKoruma(client, message, p, tur) {
  const keyler = { kufur: `küfür.${message.guild.id}.durum`, reklam: `reklam.${message.guild.id}.durum`, spam: `spam.${message.guild.id}` };
  const key = keyler[tur];
  const aktif = Boolean(db.fetch(key));
  const istenen = /kapat|kapa|off|disable/i.test(p.durum || "") ? false : /aç|ac|on|enable/i.test(p.durum || "") ? true : !aktif;
  db.set(key, istenen);
  return { ok: true, kod: "koruma", tur, durum: istenen ? "açık" : "kapalı" };
}

/* ── Tool kayıtları (AI'ya tanıtılan liste) ─────────────────── */
const TOOLS = [
  { ad: "ban_at",        yetki: PermissionFlagsBits.BanMembers,       aciklama: "Ban user", calistir: calistirBan },
  { ad: "kick_at",       yetki: PermissionFlagsBits.KickMembers,      aciklama: "Kick user", calistir: calistirKick },
  { ad: "sustur",        yetki: PermissionFlagsBits.ModerateMembers,  aciklama: "Timeout user", calistir: calistirMute },
  { ad: "susturma_kaldir", yetki: PermissionFlagsBits.ModerateMembers, aciklama: "Remove timeout", calistir: calistirUnmute },
  { ad: "uyar",          yetki: PermissionFlagsBits.ManageMessages,   aciklama: "Warn user", calistir: calistirWarn },
  { ad: "mesaj_sil",     yetki: PermissionFlagsBits.ManageMessages,   aciklama: "Delete messages (1-100)", calistir: calistirClear },
  { ad: "rol_ver",       yetki: PermissionFlagsBits.ManageRoles,      aciklama: "Give role", calistir: calistirRolVer },
  { ad: "rol_al",        yetki: PermissionFlagsBits.ManageRoles,      aciklama: "Take role", calistir: calistirRolAl },
  { ad: "kufur_koruma",  yetki: PermissionFlagsBits.ManageGuild,      aciklama: "Toggle swear filter", calistir: (c, m, p) => calistirKoruma(c, m, p, "kufur") },
  { ad: "reklam_koruma", yetki: PermissionFlagsBits.ManageGuild,      aciklama: "Toggle ad filter", calistir: (c, m, p) => calistirKoruma(c, m, p, "reklam") },
  { ad: "spam_koruma",   yetki: PermissionFlagsBits.Administrator,    aciklama: "Toggle spam protection", calistir: (c, m, p) => calistirKoruma(c, m, p, "spam") },
  { ad: "sunucu_kur",    yetki: PermissionFlagsBits.Administrator,    aciklama: "Server setup", calistir: null }, // yönlendirme
  { ad: "bakiye_gor",    yetki: null, aciklama: "Own balance", calistir: calistirBakiye },
  { ad: "seviye_gor",    yetki: null, aciklama: "Own level", calistir: calistirSeviye },
  { ad: "sunucu_bilgi",  yetki: null, aciklama: "Server info", calistir: calistirSunucuBilgi },
  { ad: "kullanici_bilgi", yetki: null, aciklama: "User info", calistir: calistirKullaniciBilgi },
  { ad: "ticket_ac",     yetki: null, aciklama: "Open ticket", calistir: calistirTicket },
];

function toolPrompt(lang) {
  const liste = TOOLS.map(t => `- ${t.ad}: ${t.aciklama}`).join("\n");
  return lang === "en"
    ? `You are a command parser for a Discord bot. User request below. Reply with ONLY a JSON object, no other text.\nTools:\n${liste}\n\nFormat: {"tool":"<name or none>","params":{"kullanici":"...","sebep":"...","sure":"10m","adet":10,"rol":"...","durum":"aç/kapat","konu":"..."}}\nRules: pick the single best tool; if the request is NOT an action (question/chat), use {"tool":"none"}. NEVER pick owner commands (eval, bakım, veri, yedek, kupon, karaliste, siterol) — they don't exist. Extract usernames/mentions as-is into kullanici. Durations like "7 gün/10dk/1h" go into sure.`
    : `Bir Discord botu için komut ayrıştırıcısın. Aşağıdaki kullanıcı isteğine SADECE JSON objesiyle cevap ver, başka metin yazma.\nAraçlar:\n${liste}\n\nFormat: {"tool":"<ad veya none>","params":{"kullanici":"...","sebep":"...","sure":"10m","adet":10,"rol":"...","durum":"aç/kapat","konu":"..."}}\nKurallar: en uygun TEK aracı seç; istek eylem DEĞİLSE (soru/sohbet) {"tool":"none"} dön. Sahip komutlarını (eval, bakım, veri, yedek, kupon, karaliste, siterol) ASLA seçme — yoklar. Kullanıcı adlarını/etikeleri aynen kullanici'ya yaz. "7 gün/10dk/1h" gibi süreleri sure'ye yaz.`;
}

function jsonCikar(metin) {
  if (!metin) return null;
  const m = String(metin).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

/* Çeşitli doğal cevaplar */
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dogalCevap(lang, sonuc, islem) {
  const EN = lang === "en";
  const h = sonuc.hedefAd || "?";
  if (sonuc.ok) {
    switch (sonuc.kod) {
      case "ban": return pick(EN ? [`✅ ${h} has been banned. Reason: ${sonuc.sebep}`, `Done, I banned ${h} 🐰`] : [`✅ ${h} başarıyla banlandı. Sebep: ${sonuc.sebep}`, `Tamamdır, ${h}'i sunucudan yasakladım 🐰`, `İşlem tamam: ${h} artık banlı.`]);
      case "kick": return pick(EN ? [`✅ ${h} has been kicked.`, `Done, kicked ${h} 🐰`] : [`✅ ${h} sunucudan atıldı.`, `Tamamdır, ${h}'i attım 🐰`]);
      case "mute": return pick(EN ? [`🔇 ${h} muted. Reason: ${sonuc.sebep}`, `Done, ${h} is muted 🐰`] : [`🔇 ${h} susturuldu. Sebep: ${sonuc.sebep}`, `Tamamdır, ${h}'i susturdum 🐰`]);
      case "unmute": return EN ? `🔊 ${h} unmuted.` : `🔊 ${h} susturması kaldırıldı.`;
      case "warn": return EN ? `⚠️ ${h} warned. Total: ${sonuc.toplam}` : `⚠️ ${h} uyarıldı. Toplam uyarı: ${sonuc.toplam}`;
      case "clear": return EN ? `🧹 Deleted ${sonuc.adet} messages.` : `🧹 ${sonuc.adet} mesaj silindi.`;
      case "rolver": return EN ? `✅ Gave **${sonuc.rolAd}** to ${h}.` : `✅ ${h}'e **${sonuc.rolAd}** rolü verildi.`;
      case "rolal": return EN ? `✅ Took **${sonuc.rolAd}** from ${h}.` : `✅ ${h}'den **${sonuc.rolAd}** rolü alındı.`;
      case "bakiye": return EN ? `💰 Wallet: ${sonuc.para} 💸 | Bank: ${sonuc.banka} 💸` : `💰 Cüzdan: ${sonuc.para} 💸 | Banka: ${sonuc.banka} 💸`;
      case "seviye": return EN ? `🏆 Level ${sonuc.seviye} (${sonuc.xp} XP)` : `🏆 Seviye ${sonuc.seviye} (${sonuc.xp} XP)`;
      case "sunucubilgi": return EN ? `🌐 **${sonuc.ad}** — ${sonuc.uye} members` : `🌐 **${sonuc.ad}** — ${sonuc.uye} üye`;
      case "kullanicibilgi": return EN ? `👤 **${sonuc.hedefAd}** (${sonuc.id})` : `👤 **${sonuc.hedefAd}** (${sonuc.id})`;
      case "ticket": return EN ? `🎫 Ticket opened: ${sonuc.kanal}` : `🎫 Bilet açıldı: ${sonuc.kanal}`;
      case "koruma": return EN ? `🛡️ ${sonuc.tur} protection: **${sonuc.durum}**` : `🛡️ ${sonuc.tur} koruma: **${sonuc.durum}**`;
      default: return EN ? "✅ Done." : "✅ İşlem tamam.";
    }
  }
  switch (sonuc.kod) {
    case "yetkiyok": return pick(EN ? [`❌ You lack the required permission (**${sonuc.gerekli}**).`, `Sorry, you can't do this — **${sonuc.gerekli}** needed.`] : [`❌ Bu işlem için **${sonuc.gerekli}** yetkin yok.`, `Maalesef bunu yapamam, **${sonuc.gerekli}** yetkin bulunmuyor.`, `Bu komut için **${sonuc.gerekli}** iznin olmalı.`]);
    case "bulunamadi": return pick(EN ? [`❌ Couldn't find '${h}'. Mention or type an ID?`, `No such user — check the name?`] : [`❌ '${h}' adında bir kullanıcı bulamadım. Etiketleyebilir veya ID yazabilir misin?`, `Böyle biri yok gibi görünüyor, ismi kontrol eder misin?`]);
    case "rolbulunamadi": return EN ? `❌ Role '${h}' not found.` : `❌ '${h}' adında rol bulamadım.`;
    case "hiyerarsi": return EN ? `❌ Can't touch ${h}, their role is higher.` : `❌ ${h}'e dokunamam, rolü senden yüksek.`;
    case "bothiyerarsi": return EN ? `❌ I can't do that (my role is too low).` : `❌ Bunu yapamam, rolüm yetmiyor (rolümü en üste al).`;
    case "korumali": case "bot": return sonuc.mesaj || (EN ? "❌ Protected target." : "❌ Korumalı hedef.");
    case "kendine": return sonuc.mesaj || (EN ? "❌ Not to yourself 😅" : "❌ Kendine yapamazsın 😅");
    case "eksik": return EN ? `Missing parameter (${sonuc.mesaj}). Can you specify?` : `Eksik parametre (${sonuc.mesaj}). Belirtebilir misin? Örn: \`rise @Ahmet'i 7 gün banla\``;
    case "belirsiz": return EN ? "I didn't quite get that. Who should I do what to? Ex: `rise ban @Ahmet reason: ads`" : "Ne yapmamı istediğini tam anlayamadım. Örnek: `rise @Ahmet'i 7 gün banla` — kime, ne yapmamı istiyorsun?";
    case "biletvAr": return EN ? `🎫 You already have an open ticket: ${sonuc.kanal}` : `🎫 Zaten açık biletin var: ${sonuc.kanal}`;
    default: return sonuc.mesaj || (EN ? "❌ Failed." : "❌ İşlem başarısız.");
  }
}

const YETKI_ADI = {
  [PermissionFlagsBits.BanMembers]: "Üyeleri Yasakla",
  [PermissionFlagsBits.KickMembers]: "Üyeleri At",
  [PermissionFlagsBits.ModerateMembers]: "Üyeleri Sustur",
  [PermissionFlagsBits.ManageMessages]: "Mesajları Yönet",
  [PermissionFlagsBits.ManageRoles]: "Rolleri Yönet",
  [PermissionFlagsBits.ManageGuild]: "Sunucuyu Yönet",
  [PermissionFlagsBits.Administrator]: "Yönetici",
};

/**
 * Ana giriş: rise isteğini tool'a çevirip çalıştırır.
 * @returns {Object} { eleAlindi: boolean, cevap?: string }
 *  eleAlindi=false → normal AI akışına devam edilsin.
 */
async function aiKomutCalistir(client, message, soru) {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (!message.guild) return { eleAlindi: false };

  // 1) Beta-tester kapısı (sahip her zaman geçer)
  if (!isBetaTester(message.author.id)) {
    return {
      eleAlindi: true,
      cevap: EN ? "❌ I can't do that yet — AI commands are in **beta**. 🐰" : "❌ Bunu henüz yapamam — AI komutları **beta** testinde. 🐰",
    };
  }
  // 2) Premium kapısı (sahip + mod muaf)
  if (!isPremium(message.author.id) && !isMod(message.author.id)) {
    return {
      eleAlindi: true,
      cevap: EN ? "💎 AI commands need **Premium**. Type `r!premium-panel` 🐰" : "💎 AI komutları **Premium** gerektirir. `r!premium-panel` yaz 🐰",
    };
  }

  // 3) AI'dan tool seçimi (max 3 iterasyon)
  const { chainAsk } = require("./providers");
  let secim = null;
  for (let i = 0; i < MAX_ITER; i++) {
    const r = await chainAsk(toolPrompt(lang), soru, lang);
    if (!r.success) break;
    const j = jsonCikar(r.cevap);
    if (j && j.tool) { secim = j; break; }
  }
  if (!secim || !secim.tool || secim.tool === "none") return { eleAlindi: false };
  if (SAHIP_KOMUTLARI.has(String(secim.tool).toLowerCase()))
    return { eleAlindi: true, cevap: EN ? "❌ I can't run that command." : "❌ Bu komutu çalıştıramam." };

  const tool = TOOLS.find(t => t.ad === secim.tool);
  if (!tool) return { eleAlindi: false };
  const params = secim.params || {};

  // sunucu_kur yönlendirmesi (yıkıcı işlem AI ile yapılmaz, komuta yönlendir)
  if (tool.ad === "sunucu_kur") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await retLog(client, { guild: message.guild, yazar: message.author, islem: "sunucu_kur", eksik: "Yönetici" });
      return { eleAlindi: true, cevap: dogalCevap(lang, { ok: false, kod: "yetkiyok", gerekli: "Yönetici" }) };
    }
    return { eleAlindi: true, cevap: EN ? "🏗️ Run `r!setup-server` to set up the server." : "🏗️ Sunucu kurulumu için `r!sunucukur` yaz." };
  }

  // 4) Yetki kontrolü
  if (tool.yetki && !message.member.permissions.has(tool.yetki)) {
    const gerekli = YETKI_ADI[tool.yetki] || "Yetki";
    await retLog(client, { guild: message.guild, yazar: message.author, islem: tool.ad, eksik: gerekli });
    return { eleAlindi: true, cevap: dogalCevap(lang, { ok: false, kod: "yetkiyok", gerekli }) };
  }

  // 5) Çalıştır
  try {
    const sonuc = await tool.calistir(client, message, params);
    if (!sonuc.ok && ["yetkiyok", "hiyerarsi", "bothiyerarsi"].includes(sonuc.kod))
      await retLog(client, { guild: message.guild, yazar: message.author, islem: tool.ad, eksik: sonuc.kod });
    return { eleAlindi: true, cevap: dogalCevap(lang, sonuc, tool.ad) };
  } catch {
    return { eleAlindi: true, cevap: EN ? "❌ Something went wrong." : "❌ Bir hata oldu, tekrar dener misin? 🐰" };
  }
}

module.exports = {
  aiKomutCalistir, isAction, hedefCoz, rolCoz,
  isBetaTester, betaEkle, betaCikar, betaListesi,
  isMod, modEkle, modCikar, modListesi, modYetkiliMi, modMuafKomut,
  SAHIP_KOMUTLARI, IKINCI_YETKILI, MAX_ITER,
};
