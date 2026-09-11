/**
 * RiseBunny Merkezi Yardımcı Modül (utils.js)
 * - Premium sistemi (DB tabanlı, ayarlar.json'a yazmaz)
 * - Sahip log kanalı (gereken her yere log gönderir)
 * - Embed / izin / güvenli-gönderim yardımcıları
 * - v14 uyumlu, tek import noktası
 *
 * Kullanim:
 *   const { isPremium, requirePremium, ownerLog, embed, DESTEK } = require('../utils');
 */
const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("croxydb");
if (!db.fetch) db.fetch = db.get;

let _ayarlar = {};
try { _ayarlar = require("./ayarlar.json"); } catch { _ayarlar = {}; }

const DESTEK = "https://dsc.gg/risebunny";
const SITE_MAGAZA = "https://risebunny.vercel.app/risebunny";
const PREFIX = process.env.PREFIX || _ayarlar.prefix || "r!";
const SAHIP_ID = process.env.SAHIP_ID || _ayarlar.sahip || "985126554306773063";
const OWNER_LOG = process.env.OWNER_LOG || _ayarlar.ownerLog || "1192951046012670204";
const PREMIUM_SURE = 30 * 24 * 60 * 60 * 1000;

// ---------- Premium ----------
function legacyPremiumIDs() {
  return Array.isArray(_ayarlar.premiumIDs) ? _ayarlar.premiumIDs : [];
}

function premiumExpiration(userId) {
  const v = db.fetch(`premium_${userId}`);
  return typeof v === "number" ? v : null;
}

function isPremium(userId) {
  if (!userId) return false;
  const exp = premiumExpiration(userId);
  if (exp && exp > Date.now()) return true;
  // Eski sistemle uyumluluk: ayarlar.json listesindeki ID'ler süresiz sayılmaz,
  // DB kaydi yoksa ama listede varsa 30 gunluk kayit olustur (tek seferlik migrate).
  if (legacyPremiumIDs().includes(String(userId))) {
    const nExp = Date.now() + PREMIUM_SURE;
    try { db.set(`premium_${userId}`, nExp); } catch {}
    return true;
  }
  return false;
}

function addPremium(userId, sure = PREMIUM_SURE) {
  const exp = Date.now() + sure;
  db.set(`premium_${userId}`, exp);
  return exp;
}

function removePremium(userId) {
  try {
    if (typeof db.delete === "function") db.delete(`premium_${userId}`);
    else db.set(`premium_${userId}`, null);
  } catch {}
}

function premiumKalan(userId) {
  const exp = premiumExpiration(userId);
  if (!exp) return null;
  const kalan = exp - Date.now();
  if (kalan <= 0) { removePremium(userId); return null; }
  const gun = Math.floor(kalan / 86400000);
  const saat = Math.floor((kalan % 86400000) / 3600000);
  return gun > 0 ? `${gun} gün ${saat} saat` : `${saat} saat`;
}

async function requirePremium(message, lang) {
  const { t } = require("./dil");
  if (isPremium(message.author.id)) return true;
  const e = new EmbedBuilder()
    .setColor("Red")
    .setTitle("Premium Üye Değilsiniz")
    .setDescription(`${t(lang, "ortak.premiumGerek")}\n[Satın Al](${DESTEK})`)
    .setImage("https://media.discordapp.net/attachments/1116091586657407076/1149387613577412608/Picsart_23-09-07_19-50-01-287.jpg");
  await safeSend(message.channel, { embeds: [e] });
  return false;
}

// ---------- Log ----------
async function ownerLog(client, payload) {
  try {
    if (!client) return;
    const kanal = client.channels.cache.get(OWNER_LOG);
    if (!kanal) return;
    if (typeof payload === "string") {
      await kanal.send({ content: payload.slice(0, 1900) }).catch(() => {});
    } else if (payload instanceof EmbedBuilder) {
      await kanal.send({ embeds: [payload] }).catch(() => {});
    } else {
      await kanal.send(payload).catch(() => {});
    }
  } catch {}
}

async function komutLog(client, message, komutAd) {
  const e = new EmbedBuilder()
    .setColor("Blue")
    .setTimestamp()
    .setFooter({ text: "RiseBunny Komut Log" })
    .setDescription(`**${message.author.tag}** (\`${message.author.id}\`) **${komutAd}** komutunu **${message.guild ? message.guild.name : "DM"}** sunucusunda kullandı.`);
  await ownerLog(client, e);
}

// ---------- Mağaza duyurusu (sitede indirimli satış + link butonu) ----------
function satisDuyuruSatir(EN) {
  return EN
    ? "💸 **Discounted on the website:** premium & pets are cheaper in the web shop!"
    : "💸 **Sitede indirimli:** premium ve petler web mağazasında daha uygun!";
}
function satisDuyuruButon(EN) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel(EN ? "🛒 Web Shop" : "🛒 Site Mağazası").setStyle(ButtonStyle.Link).setURL(SITE_MAGAZA)
  );
}

// ---------- Embed / gönderim ----------
function embed({ color = "#36393F", title, description, image, thumbnail, footer } = {}) {
  const e = new EmbedBuilder().setColor(color).setTimestamp();
  if (title) e.setTitle(String(title).slice(0, 256));
  if (description) e.setDescription(String(description).slice(0, 4000));
  if (image) e.setImage(image);
  if (thumbnail) e.setThumbnail(thumbnail);
  if (footer) e.setFooter(typeof footer === "string" ? { text: footer.slice(0, 2048) } : footer);
  return e;
}

async function safeSend(hedef, payload) {
  try {
    if (!hedef || typeof hedef.send !== "function") return null;
    return await hedef.send(payload);
  } catch { return null; }
}

function timedDelete(msg, ms = 5000) {
  if (!msg || typeof msg.delete !== "function") return;
  setTimeout(() => msg.delete().catch(() => {}), ms);
}

async function safeReply(message, payload, silMs) {
  try {
    const m = await message.reply(payload);
    if (silMs) timedDelete(m, silMs);
    return m;
  } catch { return safeSend(message.channel, payload); }
}

// ---------- Bakım ----------
function bakimSebebi() {
  try { return db.fetch("8182bakımaç81") || null; } catch { return null; }
}

// ---------- Premium temizleyici ----------
function startPremiumSweeper(client) {
  setInterval(async () => {
    try {
      // DB'deki premium_* anahtarlarini tara (croxydb json dosyasini okuyarak)
      const fs = require("fs");
      const path = require("path");
      const adaylar = [
        path.join(__dirname, "croxydb", "database.json"),
        path.join(__dirname, "database.json"),
        path.join(__dirname, "quickdb.json")
      ];
      for (const p of adaylar) {
        if (!fs.existsSync(p)) continue;
        let raw;
        try { raw = JSON.parse(fs.readFileSync(p, "utf8")); } catch { continue; }
        const data = raw.data || raw;
        for (const k of Object.keys(data || {})) {
          if (!k.startsWith("premium_")) continue;
          const uid = k.replace("premium_", "");
          const exp = Number(data[k]);
          if (exp && exp <= Date.now()) {
            removePremium(uid);
            const { t, getLangSync } = require("./dil");
            ownerLog(client, t("tr", "premium.sureDoldu", { kullanici: uid, id: uid }));
            // Bitene DM ile haber ver (embed)
            try {
              const lang = (getLangSync(uid) || "tr");
              const u = await client.users.fetch(uid).catch(() => null);
              if (u) await u.send({ embeds: [new EmbedBuilder().setColor("Gold")
                .setTitle(lang === "en" ? "💎 Premium Expired" : "💎 Premium Süren Doldu")
                .setDescription(lang === "en"
                  ? "Your RiseBunny Premium has expired. Renew anytime with `r!premium-panel` or from the website shop! 🐰"
                  : "RiseBunny Premium süren doldu. `r!premium-panel` ile veya site mağazasından dilediğin zaman yenileyebilirsin! 🐰")
                .setTimestamp()] }).catch(() => {});
            } catch {}
          }
        }
      }
    } catch {}
  }, 60_000);
}

// ---------- Kupon okuma + onarım (tek merkez) ----------
// Eski hatalı kayıtlarda bitis = süre-miktarı (örn. 3600000) yazıyordu;
// gerçek timestamp'ler 1e12'den büyüktür. Bozuk görünen bitis süresize
// çevrilir ve düzeltilmiş hali DB'ye geri yazılır.
function getKupon(kod) {
  try {
    kod = String(kod || "").toUpperCase().trim();
    if (!kod) return null;
    let kupon = db.fetch(`kupon_${kod}`);
    if (kupon === undefined || kupon === null) return null;
    if (typeof kupon === "number") {
      kupon = { kod, tip: "para", miktar: kupon, bitis: 0, yer: "ikisi", limit: 0, calismalar: 0 };
      try { db.set(`kupon_${kod}`, kupon); } catch {}
      return kupon;
    }
    if (typeof kupon !== "object") return null;
    const b = Number(kupon.bitis) || 0;
    if (b > 0 && b < 1e12) {
      kupon = { ...kupon, bitis: 0 };
      try { db.set(`kupon_${kod}`, kupon); } catch {}
      try {
        const liste = db.get("kuponListesi") || [];
        db.set("kuponListesi", liste.map(k => (k && k.kod === kod ? { ...k, bitis: 0 } : k)));
      } catch {}
      console.warn(`[Kupon] Bozuk bitis onarıldı → süresiz yapıldı: ${kod}`);
    }
    return kupon;
  } catch { return null; }
}

// ---------- Kupon süpürücü (süresi dolanları siler, 5 dk) ----------
function startKuponSweeper(client) {
  const tara = () => {
    try {
      const liste = db.get("kuponListesi") || [];
      if (!Array.isArray(liste) || !liste.length) return;
      for (const k of liste) { if (k && k.kod) getKupon(k.kod); }
      const guncel = db.get("kuponListesi") || [];
      const simdi = Date.now();
      const dolmus = guncel.filter(k => k && Number(k.bitis) > 0 && simdi > Number(k.bitis));
      if (!dolmus.length) return;
      const kodlar = new Set(dolmus.map(k => k.kod));
      for (const kod of kodlar) { try { db.delete(`kupon_${kod}`); } catch {} }
      db.set("kuponListesi", guncel.filter(k => !kodlar.has(k.kod)));
      ownerLog(client, `🧹 **Süresi dolan kuponlar temizlendi:** ${[...kodlar].map(k => `\`${k}\``).join(", ")}`).catch(() => {});
    } catch {}
  };
  tara();
  setInterval(tara, 5 * 60 * 1000);
}

// ---------- Esnek süre ayrıştırıcı ("10dk", "1 saat", "2 hafta", "3 ay") ----------
// Döner: milisaniye (sayı) veya null (anlaşılamadı). Maks 30 günle kırpılmaz (çağıran karar verir).
function parseSure(metin) {
  if (!metin) return null;
  let s = String(metin).toLowerCase().replace(/ı/g, "i").replace(/,/g, ".").trim().replace(/\s+/g, " ");
  let m = s.match(/^(\d+(?:\.\d+)?)\s*([a-zçğıöşü]*)$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!(n > 0)) return null;
  const b = (m[2] || "dk").replace(/lar$|ler$/, "");
  const T = {
    sn: 1000, snn: 1000, saniye: 1000, sec: 1000, s: 1000,
    dk: 60000, dakika: 60000, min: 60000, m: 60000,
    sa: 3600000, saat: 3600000, hour: 3600000, h: 3600000,
    gun: 86400000, "gün": 86400000, day: 86400000, d: 86400000,
    hafta: 604800000, hf: 604800000, week: 604800000, w: 604800000,
    ay: 2592000000, month: 2592000000, mo: 2592000000,
    yil: 31536000000, "yıl": 31536000000, year: 31536000000, yr: 31536000000
  };
  if (!(b in T)) return null;
  return Math.floor(n * T[b]);
}

// ---------- Hatırlatıcı süpürücü (30 sn, restart-safe: croxydb) ----------
function startHatirlatSweeper(client) {
  setInterval(async () => {
    try {
      const liste = db.get("hatirlaticilar") || [];
      if (!Array.isArray(liste) || !liste.length) return;
      const simdi = Date.now();
      const kalan = [];
      for (const h of liste) {
        if (!h || !h.at || h.at > simdi) { if (h && h.userId && h.at) kalan.push(h); continue; }
        try {
          const u = await client.users.fetch(h.userId).catch(() => null);
          if (u) await u.send({ embeds: [new EmbedBuilder().setColor("Gold")
            .setTitle("⏰ Hatırlatma")
            .setDescription(String(h.metin || "").slice(0, 3900))
            .setTimestamp(new Date(h.olusturma || simdi))
            .setFooter({ text: "RiseBunny Hatırlatıcı" })] }).catch(() => {});
        } catch {}
      }
      db.set("hatirlaticilar", kalan);
    } catch {}
  }, 30 * 1000);
}

// ---------- Seviye (XP) sistemi ----------
/** Toplam XP'den seviyeyi hesaplar (Seviye L icin gereken toplam XP = 100*(L-1)^2). */
function xpSeviye(xp) {
  return Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100)) + 1;
}

/** L -> L+1 seviyesi icin gereken XP. */
function xpGerekli(seviye) {
  const s = Math.max(1, Number(seviye) || 1);
  return 100 * (2 * s - 1);
}

/** Seviye odulleri (para). Belli seviyelerde otomatik bonus verilir. */
const SEVIYE_ODULLERI = { 5: 50000, 10: 150000, 15: 300000, 20: 500000, 25: 750000, 30: 1000000, 40: 2000000, 50: 5000000 };
function seviyeOdulu(seviye) {
  return SEVIYE_ODULLERI[Number(seviye)] || 0;
}

module.exports = {
  db,
  DESTEK,
  SITE_MAGAZA,
  satisDuyuruSatir,
  satisDuyuruButon,
  PREFIX,
  SAHIP_ID,
  OWNER_LOG,
  PREMIUM_SURE,
  isPremium,
  addPremium,
  removePremium,
  premiumExpiration,
  premiumKalan,
  requirePremium,
  ownerLog,
  komutLog,
  embed,
  safeSend,
  safeReply,
  timedDelete,
  bakimSebebi,
  startPremiumSweeper,
  startKuponSweeper,
  getKupon,
  startHatirlatSweeper,
  parseSure,
  xpSeviye,
  xpGerekli,
  seviyeOdulu,
  SEVIYE_ODULLERI,
  Perms: PermissionFlagsBits
};
