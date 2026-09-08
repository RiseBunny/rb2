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
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("croxydb");
if (!db.fetch) db.fetch = db.get;

let _ayarlar = {};
try { _ayarlar = require("./ayarlar.json"); } catch { _ayarlar = {}; }

const DESTEK = "https://dsc.gg/risebunny";
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
  xpSeviye,
  xpGerekli,
  seviyeOdulu,
  SEVIYE_ODULLERI,
  Perms: PermissionFlagsBits
};
