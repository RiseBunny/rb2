require("dotenv").config();
const croxydb = require("croxydb");
if (!croxydb.fetch) croxydb.fetch = croxydb.get;
if (!croxydb.get) croxydb.get = croxydb.fetch;
if (!croxydb.subtract && croxydb.sub) croxydb.subtract = croxydb.sub;
const db = croxydb;

// Eski require('quick.db') çağrıları croxydb'ye yönlendir (geçiş güvenliği)
try {
  const p = require.resolve("quick.db");
  require.cache[p] = { id: p, filename: p, loaded: true, exports: croxydb };
} catch {}

// Eski require('canvas') çağrıları @napi-rs/canvas'a yönlendir
try {
  const napi = require("@napi-rs/canvas");
  const cp = require.resolve("canvas");
  require.cache[cp] = { id: cp, filename: cp, loaded: true, exports: napi };
} catch {}

const Discord = require("discord.js");
const { t, getLangSync, getGuildLang } = require("./dil");
const U = require("./utils");

// ---------- v14 güvenlik shimleri (kaçan eski çağrılar crash vermesin) ----------
if (!Discord.EmbedBuilder.prototype.addField) {
  Discord.EmbedBuilder.prototype.addFieldsSafe = Discord.EmbedBuilder.prototype.addFields;
  Discord.EmbedBuilder.prototype.addField = function (name, value, inline) {
    return this.addFields({ name: String(name), value: String(value), inline: Boolean(inline) });
  };
}
{
  const origFooter = Discord.EmbedBuilder.prototype.setFooter;
  Discord.EmbedBuilder.prototype.setFooter = function (text, iconURL) {
    if (typeof text === "string") return origFooter.call(this, { text, iconURL });
    return origFooter.call(this, text);
  };
  const origAuthor = Discord.EmbedBuilder.prototype.setAuthor;
  Discord.EmbedBuilder.prototype.setAuthor = function (name, iconURL, url) {
    if (typeof name === "string") return origAuthor.call(this, { name, iconURL, url });
    return origAuthor.call(this, name);
  };
  const origColor = Discord.EmbedBuilder.prototype.setColor;
  const RENK = { BLACK: "DarkButNotBlack", WHITE: "White", GREY: "Grey", GRAY: "Grey", AQUA: "Aqua", PINK: "LuminousVividPink", BROWN: "DarkOrange", DARK: "DarkButNotBlack" };
  Discord.EmbedBuilder.prototype.setColor = function (color) {
    if (typeof color === "string") {
      const up = color.toUpperCase();
      if (up === "RANDOM") color = "Random";
      else if (RENK[up]) color = RENK[up];
      else if (["RED", "BLUE", "GREEN", "YELLOW", "PURPLE", "ORANGE"].includes(up))
        color = up.charAt(0) + up.slice(1).toLowerCase();
      else if (color.startsWith("0x")) color = "#" + color.slice(2);
    }
    try { return origColor.call(this, color); } catch { return origColor.call(this, "Default"); }
  };
  // channel.send(embed) -> channel.send({ embeds: [embed] }) uyumluluğu
  for (const Cls of [Discord.TextChannel, Discord.DMChannel, Discord.ThreadChannel].filter(Boolean)) {
    if (!Cls || !Cls.prototype.send || Cls.prototype.send.__rb) continue;
    const orig = Cls.prototype.send;
    Cls.prototype.send = function (payload, ...rest) {
      if (payload instanceof Discord.EmbedBuilder) payload = { embeds: [payload] };
      else if (payload instanceof Discord.AttachmentBuilder) payload = { files: [payload] };
      else if (Array.isArray(payload) && payload[0] instanceof Discord.EmbedBuilder) payload = { embeds: payload };
      return orig.call(this, payload, ...rest);
    };
    Cls.prototype.send.__rb = true;
  }
  // interaction ephemeral:true → flags (deprecation uyarısını bitirir, 26 çağrıyı kapsar)
  try {
    const EPH = Discord.MessageFlags && Discord.MessageFlags.Ephemeral;
    if (EPH !== undefined) {
      const siniflar = [Discord.ButtonInteraction, Discord.StringSelectMenuInteraction, Discord.CommandInteraction, Discord.ChatInputCommandInteraction, Discord.ModalSubmitInteraction].filter(Boolean);
      for (const Cls of siniflar) {
        for (const m of ["reply", "deferReply", "update", "followUp"]) {
          const orig = Cls.prototype[m];
          if (typeof orig !== "function" || orig.__rbEp) continue;
          Cls.prototype[m] = function (opts, ...rest) {
            if (opts && typeof opts === "object" && opts.ephemeral !== undefined) {
              const { ephemeral, ...geri } = opts;
              if (ephemeral) geri.flags = (geri.flags ?? 0) | Number(EPH);
              opts = geri;
            }
            return orig.call(this, opts, ...rest);
          };
          Cls.prototype[m].__rbEp = true;
        }
      }
    }
  } catch {}
  // Eski izin stringleri ("BAN_MEMBERS") ile .has() çağrısı uyumluluğu
  const map = { CREATE_INSTANT_INVITE: "CreateInstantInvite", KICK_MEMBERS: "KickMembers", BAN_MEMBERS: "BanMembers", ADMINISTRATOR: "Administrator", MANAGE_CHANNELS: "ManageChannels", MANAGE_GUILD: "ManageGuild", MANAGE_MESSAGES: "ManageMessages", MANAGE_ROLES: "ManageRoles" };
  const origHas = Discord.PermissionsBitField.prototype.has;
  Discord.PermissionsBitField.prototype.has = function (perm, ...rest) {
    if (typeof perm === "string" && map[perm]) perm = Discord.PermissionFlagsBits[map[perm]];
    else if (typeof perm === "string" && Discord.PermissionFlagsBits[perm] === undefined && Discord.PermissionFlagsBits[map[perm] || ""] !== undefined) perm = Discord.PermissionFlagsBits[map[perm]];
    return origHas.call(this, perm, ...rest);
  };
}

// ---------- Client ----------
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildVoiceStates,
    Discord.GatewayIntentBits.GuildMessageReactions,
    Discord.GatewayIntentBits.DirectMessages
  ],
  partials: [Discord.Partials.Channel, Discord.Partials.Message, Discord.Partials.Reaction]
});

client.snipeCache = new Map();
client.on("messageDelete", (deleted) => {
  try {
    if (!deleted?.guild || deleted.author?.bot) return;
    client.snipeCache.set(deleted.channel.id, { content: deleted.content, author: deleted.author.tag, at: Date.now() });
  } catch {}
});

require("./util/eventLoader.js")(client);
U.startPremiumSweeper(client);

// ---------- Keepalive + Top.gg entegrasyonu (AutoStats + Vote Webhook) ----------
// docs.top.gg v1: Api.postMetrics + HMAC imzalı webhook (x-topgg-signature).
// v0 legacy (Authorization header) geriye uyumluluk için ayrıca desteklenir.
// NOT: webhook ham body (raw-body) ister — bu yüzden global express.json()
// YOKTUR; JSON parser yalnızca ihtiyaç duyan route'lara lokal uygulanır.
const express = require("express");
const crypto = require("crypto");
const app = express();

/* ── 1) Express keepalive ── */
app.get("/", (req, res) => { console.log("RiseBunny pinglendi."); res.sendStatus(200); });

/* ── 2) Leaderboard API (herkese açık, rich | level) ── */
const cors = require("cors");
app.use("/api/leaderboard", cors({
  origin: ["https://risebunny.vercel.app", "http://localhost:3000"],
  methods: ["GET"]
}));

const _lbCache = new Map();
const _LB_TTL = 5 * 60 * 1000;
async function _lbGetTop(kind) {
  const hit = _lbCache.get(kind);
  if (hit && Date.now() - hit.at < _LB_TTL) return hit.data;

  const prefixMap = { rich: "para_", level: "xp_" };
  const prefix = prefixMap[kind];
  if (!prefix) return [];

  // Tüm verileri db.all() ile al
  let allData = {};
  try {
    allData = db.all() || {};
  } catch (e) {
    console.warn("[LB] db.all() hatası:", e.message);
    return [];
  }

  // Prefix'e göre filtrele
  const mapped = Object.keys(allData)
    .filter(key => key.startsWith(prefix) && !key.includes("cd") && !key.includes("_cd"))
    .map(key => {
      const uid = key.replace(prefix, "");
      const rawVal = Number(allData[key]) || 0;
      if (kind === "level") {
        // XP'ten level hesapla (utils'teki xpSeviye fonksiyonu)
        const level = U.xpSeviye(rawVal);
        return { id: uid, value: level, rawXP: rawVal };
      }
      return { id: uid, value: rawVal };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value || (b.rawXP || 0) - (a.rawXP || 0))
    .slice(0, 50);

  // Discord isim çözümü
  const withNames = await Promise.all(mapped.map(async r => {
    let name = client.users.cache.get(r.id)?.username;
    if (!name) {
      try { const u = await client.users.fetch(r.id).catch(() => null); name = u?.username; } catch {}
    }
    return { id: r.id, name: name || "Unknown", value: r.value };
  }));
  _lbCache.set(kind, { data: withNames, at: Date.now() });
  return withNames;
}

app.get("/api/leaderboard/:kind", async (req, res) => {
  const kind = req.params.kind === "rich" ? "rich"
             : req.params.kind === "level" ? "level" : null;
  if (!kind) return res.status(400).json({ error: "kind=rich|level" });
  try {
    const data = await _lbGetTop(kind);
    res.json({ kind, updated: new Date().toISOString(), data });
  } catch (e) {
    res.status(500).json({ error: "leaderboard hatası" });
  }
});
console.log("[LB] :/api/leaderboard/:kind hazır (rich|level, 5 dk önbellek)");

/* ── 2b) Site API: kullanıcı verisi + mağaza (paylaşımlı sır ile korumalı) ──
   BOT_API_SECRET yoksa bu endpointler kapalıdır (404). Site (Vercel) bu sır ile
   konuşur; sır asla frontend'e verilmez. */
const BOT_API_SECRET = process.env.BOT_API_SECRET || "";
function _botAuth(req, res, next) {
  if (!BOT_API_SECRET) return res.status(404).json({ error: "kapalı" });
  if (req.get("x-bot-secret") !== BOT_API_SECRET) return res.status(401).json({ error: "unauthorized" });
  next();
}

app.get("/api/user/:id", _botAuth, async (req, res) => {
  try {
    const id = String(req.params.id || "").replace(/\D/g, "").slice(0, 20);
    if (!id) return res.status(400).json({ error: "geçersiz id" });
    const wallet = Number(db.fetch(`para_${id}`) || 0);
    const bank = Number(db.fetch(`bankapara_${id}`) || 0);
    const xp = Number(db.fetch(`xp_${id}`) || 0);
    const prem = Number(db.fetch(`premium_${id}`) || 0);
    const pets = db.fetch(`pets_${id}`) || [];
    let username = client.users.cache.get(id)?.username || null;
    if (!username) {
      try { username = (await client.users.fetch(id).catch(() => null))?.username || null; } catch {}
    }
    res.json({
      id, username,
      wallet, bank, total: wallet + bank,
      xp, level: U.xpSeviye(xp),
      premium: { active: U.isPremium(id), daysLeft: prem > Date.now() ? Math.ceil((prem - Date.now()) / 86400000) : 0 },
      pets: Array.isArray(pets) ? pets.map(p => ({ name: p.name, emoji: p.emoji })) : []
    });
  } catch (e) { res.status(500).json({ error: "hata" }); }
});

// Mağaza kataloğu (varsayılanlar — sahip r!mağaza-yönet ile fiyat/görünürlük değiştirir)
const SHOP_CATALOG = {
  premium_30:  { tip: "premium", gun: 30, fiyat: 250000, ad: "💎 Premium 30 Gün" },
  pet_tavsan:  { tip: "pet", pet: { name: "Tavşan", emoji: "🐰", rarity: "common" }, fiyat: 72000, ad: "🐰 Tavşan" },
  pet_kopek:   { tip: "pet", pet: { name: "Köpek", emoji: "🐶", rarity: "common" }, fiyat: 90000, ad: "🐶 Köpek" },
  pet_kedi:    { tip: "pet", pet: { name: "Kedi", emoji: "🐱", rarity: "rare" }, fiyat: 135000, ad: "🐱 Kedi" },
  pet_balik:   { tip: "pet", pet: { name: "Balık", emoji: "🐠", rarity: "rare" }, fiyat: 162000, ad: "🐠 Balık" },
  pet_aslan:   { tip: "pet", pet: { name: "Aslan", emoji: "🦁", rarity: "premium" }, fiyat: 315000, ad: "🦁 Aslan", premiumGerek: true },
  pet_kaplan:  { tip: "pet", pet: { name: "Kaplan", emoji: "🐅", rarity: "premium" }, fiyat: 342000, ad: "🐅 Kaplan", premiumGerek: true },
  paket_rastgele: { tip: "paket", fiyat: 150000, ad: "🎁 Rastgele Paket" }
};
// Efektif ürün: varsayılan + sahip geçersiz kılmaları (magaza_<id> = {fiyat, gorunur})
function _magaza(id) {
  const base = SHOP_CATALOG[id];
  if (!base) return null;
  const oz = db.fetch(`magaza_${id}`) || {};
  return { ...base, id, fiyat: oz.fiyat ?? base.fiyat, gorunur: oz.gorunur !== false };
}
// Pet satış fiyatı (r!pet sat NaN vermesin diye siteden verilen petlere işlenir)
const PET_FIYAT = { "Tavşan": 80000, "Köpek": 100000, "Kedi": 150000, "Balık": 180000, "Aslan": 350000, "Kaplan": 380000 };
function _petVer(id, pet) {
  const pets = db.fetch(`pets_${id}`) || [];
  pets.push({ name: pet.name, emoji: pet.emoji, rarity: pet.rarity, price: Number(pet.price) || PET_FIYAT[pet.name] || 50000 });
  db.set(`pets_${id}`, pets);
}
const PAKET_PETLERI = [
  { name: "Tavşan", emoji: "🐰", rarity: "common", price: 80000 },
  { name: "Köpek", emoji: "🐶", rarity: "common", price: 100000 },
  { name: "Kedi", emoji: "🐱", rarity: "rare", price: 150000 },
  { name: "Balık", emoji: "🐠", rarity: "rare", price: 180000 },
  { name: "Aslan", emoji: "🦁", rarity: "premium", price: 350000 },
  { name: "Kaplan", emoji: "🐅", rarity: "premium", price: 380000 }
];
function _paketAc() {
  const sub = Math.random() * 100;
  const adet = sub < 40 ? 1 : sub < 80 ? 2 : 3;
  const havuz = [...PAKET_PETLERI].sort(() => Math.random() - 0.5).slice(0, adet);
  if (adet === 1) return { tip: "pet", pet: havuz[0], ad: `${havuz[0].emoji} ${havuz[0].name}` };
  return { tip: "coklu", petler: havuz, ad: havuz.map(p => `${p.emoji} ${p.name}`).join(" + ") };
}
async function _dmBildir(id, baslik, metin) {
  try {
    const u = await client.users.fetch(id).catch(() => null);
    if (!u) return false;
    const e = new Discord.EmbedBuilder().setColor("Gold").setTitle(String(baslik).slice(0, 256))
      .setDescription(String(metin).slice(0, 4000)).setTimestamp().setFooter({ text: "RiseBunny" });
    await u.send({ embeds: [e] }).catch(() => {});
    return true;
  } catch { return false; }
}
app.get("/api/shop", _botAuth, (req, res) => {
  const items = Object.keys(SHOP_CATALOG).map(_magaza).filter(it => it.gorunur)
    .map(it => ({ id: it.id, ad: it.ad, fiyat: it.fiyat, tip: it.tip, premiumGerek: !!it.premiumGerek }));
  res.json({ items });
});
app.post("/api/shop/buy", _botAuth, express.json(), async (req, res) => {
  try {
    const id = String(req.body?.userId || "").replace(/\D/g, "").slice(0, 20);
    const item = _magaza(req.body?.item);
    if (!id || !item) return res.status(400).json({ error: "geçersiz istek" });
    if (!item.gorunur) return res.status(403).json({ error: "Bu ürün şu an satışta değil." });
    if (item.premiumGerek && !U.isPremium(id)) return res.status(403).json({ error: "Bu pet için premium gerekli." });
    if (item.tip === "premium" && U.isPremium(id)) return res.status(403).json({ error: "Zaten premiumsun — süren bitince yenileyebilirsin." });
    // Ödeme: önce cüzdan, kalan bankadan
    let wallet = Number(db.fetch(`para_${id}`) || 0);
    let bank = Number(db.fetch(`bankapara_${id}`) || 0);
    if (wallet + bank < item.fiyat) return res.status(402).json({ error: "Yetersiz bakiye.", wallet, bank });
    const fromWallet = Math.min(wallet, item.fiyat);
    if (fromWallet > 0 && typeof db.subtract === "function") db.subtract(`para_${id}`, fromWallet);
    const rest = item.fiyat - fromWallet;
    if (rest > 0 && typeof db.subtract === "function") db.subtract(`bankapara_${id}`, rest);

    // Teslimat
    let kazandi = null, dmBaslik = "", dmMetin = "";
    if (item.tip === "paket") {
      kazandi = _paketAc();
      dmBaslik = "🎁 Tebrikler! Paket Açılımı";
      if (kazandi.tip === "premium") {
        U.addPremium(id, kazandi.gun * 24 * 60 * 60 * 1000);
        dmMetin = `Rastgele Paket'ten **${kazandi.ad}** kazandınız! Premiumunuz **${kazandi.gun} gün** aktif. İyi eğlenceler! 🐰`;
      } else {
        (kazandi.tip === "coklu" ? kazandi.petler : [kazandi.pet]).forEach(p => _petVer(id, p));
        dmMetin = `Rastgele Paket'ten **${kazandi.ad}** kazandınız! Petlerinizde görebilirsiniz. 🐾`;
      }
    } else if (item.tip === "premium") {
      U.addPremium(id, item.gun * 24 * 60 * 60 * 1000);
      dmBaslik = "🎉 Tebrikler! Premium Aktif";
      dmMetin = `**${item.ad}** aldınız, premiumunuz **${item.gun} gün** aktif! İyi eğlenceler! 💎`;
    } else {
      _petVer(id, item.pet);
      dmBaslik = "🎉 Tebrikler! Pet Sahiplendin";
      dmMetin = `**${item.ad}** aldınız! 🐾`;
    }
    wallet = Number(db.fetch(`para_${id}`) || 0);
    bank = Number(db.fetch(`bankapara_${id}`) || 0);
    dmMetin += `\n💸 Kalan paranız: **${(wallet + bank).toLocaleString()}** (Cüzdan: ${wallet.toLocaleString()} + Banka: ${bank.toLocaleString()})`;
    _dmBildir(id, dmBaslik, dmMetin);
    console.log(`[Mağaza] ${id} satın aldı: ${item.ad} (${item.fiyat})${kazandi ? ` → kazandı: ${kazandi.ad}` : ""}`);
    U.ownerLog(client, new Discord.EmbedBuilder().setColor("Gold").setTitle("🛒 Site Mağaza Satışı")
      .setDescription(`**Kullanıcı:** <@${id}> (\`${id}\`)\n**Ürün:** ${item.ad}\n**Fiyat:** ${item.fiyat.toLocaleString()} 💸${kazandi ? `\n**Kazandı:** ${kazandi.ad}` : ""}\n**Kalan:** ${(wallet + bank).toLocaleString()} 💸`)
      .setTimestamp()).catch(() => {});
    res.json({ ok: true, item: req.body.item, ad: item.ad, fiyat: item.fiyat, kazandi, wallet, bank, total: wallet + bank });
  } catch (e) { res.status(500).json({ error: "hata" }); }
});
// Kupon kullanımı (site): Discord oturumu Vercel'den doğrulanmış kullanıcı ID'si ile gelir
app.post("/api/coupon/redeem", _botAuth, express.json(), async (req, res) => {
  try {
    const id = String(req.body?.userId || "").replace(/\D/g, "").slice(0, 20);
    const kod = String(req.body?.kod || "").toUpperCase().trim();
    if (!id || !kod) return res.status(400).json({ error: "eksik alan" });
    const kupon = db.fetch(`kupon_${kod}`);
    if (!kupon) return res.status(404).json({ error: "Geçersiz kupon kodu." });
    if (kupon.yer === "bot") return res.status(403).json({ error: "Bu kupon sadece botta kullanılabilir." });
    if (kupon.bitis && Date.now() > kupon.bitis) return res.status(410).json({ error: "Bu kuponun süresi dolmuş." });
    if (kupon.limit && (kupon.calismalar || 0) >= kupon.limit) return res.status(410).json({ error: "Bu kupon kullanım limitine ulaşmış." });
    if (db.fetch(`kupon_kullandi_${kod}_${id}`)) return res.status(409).json({ error: "Bu kuponu zaten kullandın (hesap başına tek)." });

    // Ödül
    let mesaj = "";
    if (kupon.tip === "premium") {
      const gun = Number(kupon.premiumGun) || 30;
      U.addPremium(id, gun * 24 * 60 * 60 * 1000);
      mesaj = `💎 ${gun} gün premium aktif!`;
    } else if (kupon.tip === "pet") {
      const pets = db.fetch(`pets_${id}`) || [];
      pets.push({ name: kupon.petAd || "Tavşan", emoji: kupon.petEmoji || "🐰", rarity: "coupon", price: Number(kupon.petFiyat) || 50000 });
      db.set(`pets_${id}`, pets);
      mesaj = `${kupon.petEmoji || "🐰"} ${kupon.petAd || "Tavşan"} hesabına eklendi!`;
    } else {
      const miktar = Number(kupon.miktar) || 0;
      if (miktar <= 0) return res.status(500).json({ error: "Geçersiz ödül." });
      db.add(`para_${id}`, miktar);
      mesaj = `💸 ${miktar.toLocaleString()} RiseBunny Cash hesabına yüklendi!`;
    }
    db.set(`kupon_kullandi_${kod}_${id}`, Date.now());
    db.set(`kupon_${kod}`, { ...kupon, calismalar: (kupon.calismalar || 0) + 1 });
    U.ownerLog(client, new Discord.EmbedBuilder().setColor("Gold").setTitle("🎟️ Site Kuponu Kullanıldı")
      .setDescription(`**Kullanıcı:** <@${id}> (\`${id}\`)\n**Kod:** \`${kod}\`\n**Sonuç:** ${mesaj}`).setTimestamp()).catch(() => {});
    res.json({ ok: true, mesaj });
  } catch { res.status(500).json({ error: "hata" }); }
});

console.log("[Mağaza] :/api/user/:id + /api/shop hazır" + (BOT_API_SECRET ? "" : " (BOT_API_SECRET yok → kapalı)"));

// İletişim formu → sahip log kanalı (site 05 bölümü + Vercel forward)
app.post("/api/contact", _botAuth, express.json(), async (req, res) => {
  try {
    const name = String(req.body?.name || "").slice(0, 60);
    const email = String(req.body?.email || "").slice(0, 120);
    const subject = String(req.body?.subject || "").slice(0, 120);
    const message = String(req.body?.message || "").slice(0, 2000);
    if (!name || !email || !message) return res.status(400).json({ error: "eksik alan" });
    U.ownerLog(client, new Discord.EmbedBuilder().setColor("Blue").setTitle("✉️ Site İletişim Formu")
      .addFields(
        { name: "İsim", value: name, inline: true },
        { name: "E-posta", value: email, inline: true },
        { name: "Konu", value: subject || "-", inline: false },
        { name: "Mesaj", value: message.slice(0, 1000) || "-", inline: false }
      ).setTimestamp()).catch(() => {});
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "hata" }); }
});
// ── Herkese açık durum endpointleri (sitenin canlı sayıları + bakım kapısı) ──
app.get("/api/stats", (req, res) => {
  try {
    let users = 0;
    client.guilds.cache.forEach(g => { users += g.memberCount || 0; });
    res.json({ servers: client.guilds.cache.size, users, uptime: Math.floor(client.uptime || 0), at: new Date().toISOString() });
  } catch { res.json({ servers: 0, users: 0 }); }
});
app.get("/api/site-status", (req, res) => {
  const site = db.fetch("site_bakim") || null;
  res.json({ bakim: !!(site && site.acik), sebep: (site && site.sebep) || "", botBakim: !!db.fetch("8182bakımaç81") });
});
// Discord e-posta kaydı (Vercel OAuth callback yazar — sır korumalı)
app.post("/api/discord/link", _botAuth, express.json(), (req, res) => {
  try {
    const id = String(req.body?.userId || "").replace(/\D/g, "").slice(0, 20);
    if (!id) return res.status(400).json({ error: "geçersiz id" });
    db.set(`dmail_${id}`, {
      email: String(req.body?.email || "").slice(0, 120),
      username: String(req.body?.username || "").slice(0, 60),
      at: Date.now()
    });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "hata" }); }
});

/* ── 3) Vote Webhook (Top.gg → bot, v1 HMAC + v0 legacy dual) ──
   v1:  header "x-topgg-signature: t=...,v1=..." → HMAC-SHA256("{t}.{rawBody}", secret)
   v0:  header "Authorization: <secret>" → JSON { user, type, isWeekend }
   Her ikisinde de secret = TOPGG_WEBHOOK_SECRET. Başarıda 204, hatada 401/403. */
const TOPGG_BOT_ID = process.env.TOPGG_BOT_ID || "1540401487581020252";
const TOPGG_SECRET = process.env.TOPGG_WEBHOOK_SECRET || "";
const votePath = process.env.TOPGG_WEBHOOK_URL ? new URL(process.env.TOPGG_WEBHOOK_URL).pathname : "/api/topgg/vote";

function _timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  return ba.length === bb.length && ba.length > 0 && crypto.timingSafeEqual(ba, bb);
}

async function _readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => {
      chunks.push(c);
      if (Buffer.concat(chunks).length > 2 * 1024 * 1024) { req.destroy(); reject(new Error("body too large")); }
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

app.post(votePath, async (req, res) => {
  try {
    if (!TOPGG_SECRET) { console.warn("[TopGG] TOPGG_WEBHOOK_SECRET yok — webhook reddedildi."); return res.sendStatus(500); }
    const raw = await _readRaw(req);
    const sigHeader = req.headers["x-topgg-signature"];

    // ── v1 (HMAC) ──
    if (sigHeader) {
      const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
      const parts = Object.fromEntries(String(sig).split(",").map((p) => p.split("=")));
      if (!parts.t || !parts.v1) return res.status(422).json({ error: "invalid signature format" });
      if (Math.abs(Date.now() - parseInt(parts.t, 10) * 1000) > 30000) return res.status(403).json({ error: "timestamp outside window" });
      const expected = crypto.createHmac("sha256", TOPGG_SECRET).update(`${parts.t}.${raw}`).digest("hex");
      if (!_timingSafeEqual(expected, parts.v1)) return res.status(403).json({ error: "invalid signature" });
      let body;
      try { body = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).json({ error: "malformed json" }); }
      if (body.type === "webhook.test") { console.log("[TopGG] TEST oyu alındı (v1) — ödül verilmedi."); return res.sendStatus(204); }
      if (body.type !== "vote.create") { console.log(`[TopGG] Bilinmeyen v1 tipi: ${body.type}`); return res.sendStatus(204); }
      const userId = body?.data?.user?.id || body?.data?.user?.platform_id;
      if (!userId) return res.status(422).json({ error: "missing user" });
      const weekend = Number(body?.data?.weight || 1) > 1; // hafta sonu oylar ağırlıklı gelir
      await _voteReward(String(userId), weekend ? 2 : 1);
      return res.sendStatus(204);
    }

    // ── v0 legacy (Authorization) ──
    const auth = req.headers["authorization"] || "";
    if (!_timingSafeEqual(auth, TOPGG_SECRET)) return res.status(401).json({ error: "unauthorized" });
    let vote;
    try { vote = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).json({ error: "malformed json" }); }
    if (vote.type === "test") { console.log("[TopGG] TEST oyu alındı (v0) — ödül verilmedi."); return res.sendStatus(204); }
    if (!vote.user) return res.status(422).json({ error: "missing user" });
    await _voteReward(String(vote.user), vote.isWeekend ? 2 : 1);
    return res.sendStatus(204);
  } catch (e) {
    console.error("[TopGG] Webhook hatası:", e.message);
    return res.sendStatus(500);
  }
});

/* ── 4) Oy ödülü (simülasyon / gerçek) ── */
async function _voteReward(userId, multiplier) {
  // cooldown kontrolü
  const key = `vote_${userId}`;
  const last = Number(db.fetch(key) || 0);
  const now = Date.now();
  if (now - last < 12 * 3600 * 1000) {
    console.log(`[Vote] cooldown — ${userId} ödül yok`);
    return false;
  }

  const money = (Number(process.env.TOPGG_REWARD_MONEY) || 1000) * multiplier;
  const xp   = (Number(process.env.TOPGG_REWARD_XP) || 150) * multiplier;

  // param + xp
  if (typeof db.add === "function") {
    db.add(`para_${userId}`, money);
    db.add(`xp_${userId}`, xp);
  }
  db.set(key, now);

  // rol (varsa)
  const roleId = process.env.TOPGG_REWARD_ROLE_ID;
  if (roleId && process.env.MAIN_GUILD_ID) {
    const guild = client.guilds.cache.get(process.env.MAIN_GUILD_ID);
    if (guild) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) await member.roles.add(roleId).catch(() => {});
    }
  }

  // DM
  const user = await client.users.fetch(userId).catch(() => null);
  user?.send(
    `🥕 Oyun için teşekkürler! +${money.toLocaleString()} para ve +${xp} XP kazandın (12 saat sonra tekrar).`
  ).catch(() => {});

  console.log(`[Vote] Ödül verildi: ${userId} ×${multiplier}`);
}

/* ── 5) AutoStats (her 30 dakikada bir, @top-gg/sdk v4 Api.postMetrics) ──
   SDK v4'te AutoPoster KALDIRILDI; yerine manuel interval + postMetrics kullanılır.
   Limit: 15 dk'dan sık gönderme → 429. 30 dk ideal. */
let topggApi = null;
/* ── 5b) Firestore liderlik senkronu (site tabloları bota bağımlı kalmasın) ──
   Bot her 10 dk'da rich+level top50'yi Firestore `leaderboard/*` yazar.
   Gerekli env: FIREBASE_BOT_EMAIL + FIREBASE_BOT_SIFRE (Firebase Console'da
   E-posta/Şifre ile açılmış kullanıcı; rules e-postayı doğrular). */
const FB_PROJECT = "gen-lang-client-0590499912";
const FB_KEY = process.env.FIREBASE_API_KEY || "AIzaSyAq5Nafl9aI2TabzGsj5J9ij6lNwyfTguM";
let _fbTok = null, _fbExp = 0;
async function _fbToken() {
  if (_fbTok && Date.now() < _fbExp - 60000) return _fbTok;
  const email = process.env.FIREBASE_BOT_EMAIL || "", pw = process.env.FIREBASE_BOT_SIFRE || "";
  if (!email || !pw) return null;
  try {
    const r = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + FB_KEY, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pw, returnSecureToken: true })
    });
    if (!r.ok) { console.warn("[FB] Bot girişi başarısız:", r.status); return null; }
    const j = await r.json();
    _fbTok = j.idToken; _fbExp = Date.now() + (Number(j.expiresIn) || 3600) * 1000;
    return _fbTok;
  } catch { return null; }
}
function _fbVal(u) {
  return { mapValue: { fields: {
    name: { stringValue: String(u.name || "Unknown").slice(0, 32) },
    value: Number.isInteger(u.value) ? { integerValue: String(u.value) } : { doubleValue: Number(u.value) || 0 }
  } } };
}
async function _lbSync() {
  if (!client.user) return;
  const tok = await _fbToken();
  if (!tok) return;
  for (const kind of ["rich", "level"]) {
    try {
      const data = await _lbGetTop(kind);
      const body = { fields: {
        data: { arrayValue: { values: data.map(_fbVal) } },
        updatedAt: { stringValue: new Date().toISOString() }
      } };
      const r = await fetch(`https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents/leaderboard/${kind}?key=${FB_KEY}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + tok },
        body: JSON.stringify(body)
      });
      if (!r.ok) console.warn(`[FB] leaderboard/${kind} yazılamadı:`, r.status);
      else console.log(`[FB] leaderboard/${kind} senkron ✓ (${data.length})`);
    } catch (e) { console.warn("[FB] senkron hatası:", e.message); }
  }
}
if (process.env.TOPGG_TOKEN && !process.env.TOPGG_TOKEN.includes("panelden")) {
  try {
    const { Api } = require("@top-gg/sdk");
    topggApi = new Api(process.env.TOPGG_TOKEN);
  } catch (e) { console.warn("[TopGG] SDK yüklenemedi:", e.message); }
} else {
  console.log("[TopGG] TOPGG_TOKEN yok — stats gönderimi kapalı (token eklenince otomatik açılır).");
}

async function postStats(reason) {
  if (!topggApi) return;
  try {
    const guildCount = client.guilds.cache.size;
    await topggApi.postMetrics({ serverCount: guildCount });
    console.log(`[TopGG] Stats gönderildi ✓ (${guildCount} sunucu${reason ? `, tetikleyici: ${reason}` : ""})`);
  } catch (e) {
    console.error("[TopGG] Stats hatası:", e?.response?.data || e.message);
  }
}
client.once("ready", () => {
  console.log(`[Bot] ${client.user.tag} hazır.`);
  postStats("ready");
  setInterval(() => postStats("30dk"), 30 * 60 * 1000);
  if (!process.env.FIREBASE_BOT_EMAIL || !process.env.FIREBASE_BOT_SIFRE) {
    console.log("[FB] FIREBASE_BOT_EMAIL/SIFRE yok — liderlik senkronu kapalı (site simülasyonda kalır).");
  } else {
    _lbSync();
    setInterval(_lbSync, 10 * 60 * 1000);
  }
});
// Sunucu katılma/ayrılma sonrası da tazele (debounce 60 sn)
let _statsDeb = null;
function queueStats(reason) {
  clearTimeout(_statsDeb);
  _statsDeb = setTimeout(() => postStats(reason), 60 * 1000);
}

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Web sunucusu ${PORT} portunda aktif.`);
  console.log(`  • /api/leaderboard/:kind → leaderboard (5 dk cache)`);
  console.log(`  • ${votePath} → Top.gg vote webhook (imza kontrolü)`);
  console.log(`  • postMetrics → 30 dk'da bir stats (${TOPGG_BOT_ID})`);
});

/* ── 6) Simülasyon (yalnızca TOPGG_SIMULATE_VOTES=1 iken, DB'ye yazmaz) ──
   Gerçek oy akışı top.gg onayından sonra başlar; bu blok sadece log üretir. */
if (process.env.TOPGG_SIMULATE_VOTES === "1") {
  console.log("[SIM] Oy simülasyonu açık — her 45 sn'de 1 sahte oy LOGU (ödül YOK).");
  setInterval(() => {
    console.log(`[SIM] Sahte oy alındı (bot=${TOPGG_BOT_ID}, type=test) — ödül verilmedi.`);
  }, 45000);
}

// ---------- Komut yükleyici ----------
const fs = require("fs");
const prefix = U.PREFIX;
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
for (const file of fs.readdirSync("./komutlar/").filter(f => f.endsWith(".js") && !f.startsWith("_"))) {
  try {
    const command = require(`./komutlar/${file}`);
    if (!command?.help?.name || typeof command.run !== "function") { console.warn(`Atlandı: ${file}`); continue; }
    console.log(`Yüklenen komut: ${command.help.name}.`);
    client.commands.set(command.help.name.toLowerCase(), command);
    for (const a of command.conf?.aliases || []) client.aliases.set(String(a).toLowerCase(), command.help.name.toLowerCase());
  } catch (e) { console.error(`Komut yüklenemedi (${file}):`, e.message); }
}

client.reload = command => new Promise((resolve, reject) => {
  try {
    delete require.cache[require.resolve(`./komutlar/${command}`)];
    const cmd = require(`./komutlar/${command}`);
    client.commands.delete(command);
    client.aliases.forEach((c, a) => { if (c === command) client.aliases.delete(a); });
    client.commands.set(command, cmd);
    (cmd.conf.aliases || []).forEach(a => client.aliases.set(a, cmd.help.name));
    resolve();
  } catch (e) { reject(e); }
});
client.load = client.reload;
client.unload = command => new Promise((resolve, reject) => {
  try {
    delete require.cache[require.resolve(`./komutlar/${command}`)];
    client.commands.delete(command);
    client.aliases.forEach((c, a) => { if (c === command) client.aliases.delete(a); });
    resolve();
  } catch (e) { reject(e); }
});

client.elevation = (message) => {
  if (!message.guild) return 0;
  let lvl = 0;
  try {
    if (message.member.permissions.has(Discord.PermissionFlagsBits.BanMembers)) lvl = 2;
    if (message.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) lvl = 3;
    if (message.author.id === U.SAHIP_ID) lvl = 4;
  } catch {}
  return lvl;
};

// NOT: Yapay zekâ "sor" komutu kaldırıldı (istek üzerine).

// ---------- Sunucu ekleme ödülü (guildDelete leak düzeltildi) ----------
client.on("guildCreate", async (guild) => {
  try {
    const ownerId = guild.ownerId;
    if (ownerId) {
      if (typeof db.add === "function") db.add(`para_${ownerId}`, 100000);
      console.log(`Bot eklendi: ${guild.name} (${guild.id}) sahibi ${ownerId} +100000`);
      U.ownerLog(client, `➕ Yeni sunucu: **${guild.name}** (${guild.id}) | Sahip: ${ownerId}`).catch(() => {});
      queueStats("guildCreate");
    }
  } catch {}
});
client.on("guildDelete", async (guild) => {
  try {
    const ownerId = guild.ownerId;
    if (ownerId && typeof db.subtract === "function") db.subtract(`para_${ownerId}`, 200000);
    U.ownerLog(client, `➖ Sunucudan atıldı: **${guild?.name}** (${guild?.id})`).catch(() => {});
    queueStats("guildDelete");
  } catch {}
});

// NOT: Asagidaki tum otomatik sistem cevaplari (hosgeldin, koruma,
// modlog, otorol, kayit karsilama) SUNUCU dilindedir (r!dil sunucu).
// Kisi bazli komut cevaplari kullanicinin kendi dilindedir.
// ---------- SA-AS ----------
client.on("messageCreate", async (msg) => {
  try {
    if (!msg.guild || msg.author.bot) return;
    if (db.fetch(`saas_${msg.guild.id}`) === "açık" && msg.content.toLowerCase() === "sa")
      await msg.reply(getGuildLang(msg.guild.id) === "en" ? "**Hello, welcome!**" : "**Aleyküm Selam Hoşgeldin.**").catch(() => {});
  } catch {}
});

// ---------- Seviye (XP) sistemi ----------
client.on("messageCreate", async (msg) => {
  try {
    if (!msg.guild || msg.author.bot || !msg.member) return;
    const uid = msg.author.id;
    const son = Number(db.fetch(`xp_cd_${uid}`) || 0);
    if (Date.now() - son < 30000) return; // 30 saniyede 1 XP kazanim
    db.set(`xp_cd_${uid}`, Date.now());
    const kazanilan = Math.floor(Math.random() * 20) + 5; // 5-25 XP
    db.add(`xp_${uid}`, kazanilan);
    const xp = Number(db.fetch(`xp_${uid}`) || 0);
    const seviye = U.xpSeviye(xp);
    const onceki = Number(db.fetch(`seviye_${uid}`) || 0);
    // Seviye DEĞİŞTİĞİNDE kalıcı yazılır (leaderboard + kart + site hep aynı okur)
    if (seviye !== onceki) db.set(`seviye_${uid}`, seviye);
    if (seviye > onceki) {
      db.set(`seviyeatlama_${uid}`, Date.now());
      const odul = U.seviyeOdulu(seviye);
      const lang = getGuildLang(msg.guild.id);
      // Rol odulu (seviye-ödül komutuyla tanimlanan)
      const rolKayitlari = db.get(`seviyeRoller_${msg.guild.id}`) || {};
      const rolId = rolKayitlari[seviye];
      if (rolId && msg.guild.roles.cache.get(rolId)) {
        await msg.member.roles.add(rolId).catch(() => {});
      }
      if (odul > 0) {
        db.add(`para_${uid}`, odul);
        const ekstra = rolId ? (lang === "en" ? ` and the <@&${rolId}> role!` : ` ve <@&${rolId}> rolünü!`) : "";
        await msg.channel.send({ embeds: [new Discord.EmbedBuilder().setColor("Gold").setTitle(lang === "en" ? "🎉 Level Up!" : "🎉 Seviye Atladın!").setDescription(lang === "en" ? `${msg.author}, you reached **Level ${seviye}** and earned **${odul.toLocaleString()} 💸**${ekstra}` : `${msg.author}, **Seviye ${seviye}** oldun ve **${odul.toLocaleString()} 💸** kazandın${ekstra}`)] }).catch(() => {});
      } else {
        const ekstra = rolId ? (lang === "en" ? ` You got the <@&${rolId}> role!` : ` <@&${rolId}> rolünü aldın!`) : "";
        await msg.channel.send({ embeds: [new Discord.EmbedBuilder().setColor("Gold").setTitle(lang === "en" ? "🎉 Level Up!" : "🎉 Seviye Atladın!").setDescription(lang === "en" ? `${msg.author}, you reached **Level ${seviye}**!${ekstra}` : `${msg.author}, **Seviye ${seviye}** oldun!${ekstra}`)] }).catch(() => {});
      }
    }
  } catch {}
});

// ---------- Otomatik kayıt (v14 collector) ----------
client.on("guildMemberAdd", async (member) => {
  try {
    const guild = member.guild, user = member.user;
    if (!db.fetch(`kayıt-kayıtsız.${guild.id}`)) return;
    const kayitsizId = db.fetch(`kayıt-kayıtsız.${guild.id}`);
    if (!guild.roles.cache.get(kayitsizId) || member.roles.cache.has(kayitsizId)) return;
    const kadin = guild.roles.cache.get(db.fetch(`kayıt-kadın.${guild.id}`));
    const erkek = guild.roles.cache.get(db.fetch(`kayıt-erkek.${guild.id}`));
    if (!kadin || !erkek) return;
    await member.roles.add(kayitsizId).catch(() => {});
    await member.setNickname("İsiminizi Yazın").catch(() => {});
    const kanal = guild.channels.cache.get(db.fetch(`kayıt-kanal.${guild.id}`));
    if (!kanal?.isTextBased()) return;

    const onceki = db.fetch(`k.${guild.id}.${user.id}`);
    if (onceki) {
      await member.roles.remove(kayitsizId).catch(() => {});
      await member.roles.add(onceki.sex === "K" ? kadin.id : erkek.id).catch(() => {});
      const tag = db.fetch(`kayıt-tag.${guild.id}`);
      await member.setNickname(`${tag ? `${tag} ` : ""}${onceki.name} | ${onceki.yaş}`).catch(() => {});
      return kanal.send((lang === "en" ? `Registered **automatically**. Have fun **${onceki.name}**!` : `Kayıt başarıyla tamamlandı. **Otomatik** olarak kayıt edildin. İyi eğlenceler **${onceki.name}**`)).catch(() => {});
    }

    const lang = getGuildLang(guild.id);
    const embed = new Discord.EmbedBuilder().setColor("Random")
      .setImage("https://images-ext-1.discordapp.net/external/u4K5o1w8mfZ4ejvgLgIgd928hGr3vjQOi4hcbEtM1cc/https/media.discordapp.net/attachments/724722014283104306/727861420162809876/cortexKaytOlmak.gif");
    await kanal.send(`<@${user.id}> ${t(lang, "kayit.isimYaz")}`).catch(() => {});
    await kanal.send({ embeds: [embed] }).catch(() => {});

    const isimler = require("./isimler.json");
    const collector = kanal.createMessageCollector({ filter: (m) => m.author.id === user.id, time: 120000 });
    let asama = 0, secili = null;
    collector.on("collect", async (cm) => {
      try {
        if (asama === 0) {
          if (/\d/.test(cm.content)) { await cm.reply(t(lang, "kayit.sadeceIsim")).catch(() => {}); return; }
          const data = isimler.find(x => x.name.toLowerCase() === cm.content.toLowerCase());
          if (!data) { await cm.reply(t(lang, "kayit.isimGerek")).catch(() => {}); return; }
          secili = data;
          asama = 1;
          const e2 = new Discord.EmbedBuilder().setColor("Random")
            .setFooter({ text: (lang === "en" ? "Info: mistyped your name? Ask staff" : "Bilgi: İsmini yanlış yazdıysan: r!yksıfırla") })
            .setDescription(t(lang, "kayit.yasYaz", { isim: data.name }));
          await kanal.send({ embeds: [e2] }).catch(() => {});
        } else {
          if (isNaN(cm.content)) { await cm.reply(t(lang, "kayit.yasSayi")).catch(() => {}); return; }
          if (Number(cm.content) === 31) { await cm.reply((lang === "en" ? "31? Really?!" : "31 ne alaka!")).catch(() => {}); return; }
          if (Number(cm.content) > 32) { await cm.reply((lang === "en" ? "Please contact a staff member." : "Yetkili birisine yazın.")).catch(() => {}); return; }
          collector.stop("tamam");
          await member.roles.remove(kayitsizId).catch(() => {});
          await member.roles.add(secili.sex === "K" ? kadin.id : erkek.id).catch(() => {});
          const isim = secili.name.charAt(0).toUpperCase() + secili.name.slice(1);
          db.set(`k.${guild.id}.${user.id}`, { name: isim, sex: secili.sex, yaş: Number(cm.content) });
          const tag = db.fetch(`kayıt-tag.${guild.id}`);
          await member.setNickname(`${tag ? `${tag} ` : ""}${isim} | ${cm.content}`).catch(() => {});
          await kanal.send(t(lang, "kayit.kayitOk", { isim })).catch(() => {});
        }
      } catch {}
    });
  } catch {}
});

// ---------- HG / BB canvas ----------
async function hosgeldinKart(member, ayrildiMi) {
  try {
    const key = `gçkanal_${member.guild.id}`;
    if (!db.fetch(key)) return;
    const kanal = member.guild.channels.cache.get(db.fetch(key));
    if (!kanal?.isTextBased()) return;
    const { request } = { request: require("node-superfetch") };
    const Canvas = require("@napi-rs/canvas");
    const canvas = Canvas.createCanvas(640, 360);
    const ctx = canvas.getContext("2d");
    const bg = await Canvas.loadImage(ayrildiMi
      ? "https://media.discordapp.net/attachments/1118567518454423593/1159876865931083797/Picsart_23-10-06_18-36-17-972.jpg"
      : "https://media.discordapp.net/attachments/1118567518454423593/1159876866199523348/Picsart_23-10-06_18-34-40-006.jpg").catch(() => null);
    if (!bg) return;
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#74037b";
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FFFFFF";
    try { ctx.font = '37px sans-serif'; } catch {}
    ctx.textAlign = "center";
    ctx.fillText(`${member.user.username}`.slice(0, 20), 300, 270);
    const avatarURL = member.user.displayAvatarURL({ extension: "png", size: 1024 });
    const { body } = await request.get(avatarURL).catch(() => ({}));
    if (!body) return;
    const avatar = await Canvas.loadImage(body).catch(() => null);
    if (!avatar) return;
    ctx.beginPath();
    ctx.arc(250 + 55, 55 + 55, 55, 0, 2 * Math.PI, false);
    ctx.clip();
    ctx.drawImage(avatar, 250, 55, 110, 110);
    const dosya = new Discord.AttachmentBuilder(canvas.toBuffer("image/png"), { name: ayrildiMi ? "RiseBunny-bb.png" : "RiseBunny-hg.png" });
    await kanal.send({ files: [dosya] }).catch(() => {});
    let msj = db.fetch(`cikisM_${member.guild.id}`) || `{uye}, ${ayrildiMi ? (getGuildLang(member.guild.id) === "en" ? "Left the server." : "Sunucudan Ayrıldı.") : (getGuildLang(member.guild.id) === "en" ? "Joined the server." : "Sunucuya Katıldı.")}`;
    await kanal.send(String(msj).replace("{uye}", `${member}`).replace("{sunucu}", member.guild.name)).catch(() => {});
    if (member.user.bot) await kanal.send(getGuildLang(member.guild.id) === "en" ? `🤖 This is a bot, ${member.user.tag}` : `🤖 Bu bir bot, ${member.user.tag}`).catch(() => {});
  } catch {}
}
client.on("guildMemberRemove", (m) => hosgeldinKart(m, true));
client.on("guildMemberAdd", (m) => hosgeldinKart(m, false));

// ---------- Reklam engel ----------
const REKLAM = [".com", ".net", ".xyz", ".tk", ".pw", ".io", ".me", ".gg", "www.", "https", "http", ".gl", ".org", ".com.tr", ".biz", ".rf", ".gd", ".az", ".party", ".gf"];
async function reklamKontrol(msg, duzenlemeMi) {
  try {
    if (!msg.guild || msg.author.bot) return;
    const durum = db.fetch(`reklam.${msg.guild.id}.durum`);
    if (!durum) return;
    if (!REKLAM.some(w => msg.content.toLowerCase().includes(w))) return;
    const uye = msg.member;
    if (uye?.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) return;
    await msg.delete().catch(() => {});
    const rlang = getGuildLang(msg.guild.id);
    const uyari = new Discord.EmbedBuilder().setColor(0x36393F).setDescription(rlang === "en" ? `<@${msg.author.id}>, **Advertising is not allowed on this server!**` : `<@${msg.author.id}>, **Bu sunucuda reklam yapmak yasak!**`);
    const logId = db.fetch(`reklam.${msg.guild.id}.kanal`);
    const log = new Discord.EmbedBuilder().setColor(0x36393F).setDescription(rlang === "en" ? `${msg.author}, **tried to advertise!**` : `${msg.author}, **Reklam yapmaya çalıştı!**`).addFields({ name: (rlang === "en" ? "Message:" : "Mesaj:"), value: String(msg.content).slice(0, 1000) || "-" });
    const m = await msg.channel.send({ embeds: [uyari] }).catch(() => null);
    if (m) setTimeout(() => m.delete().catch(() => {}), 5000);
    if (logId) { const kc = msg.guild.channels.cache.get(logId); if (kc?.isTextBased()) kc.send({ embeds: [log] }).catch(() => {}); }
  } catch {}
}
client.on("messageCreate", (m) => reklamKontrol(m, false));
client.on("messageUpdate", (o, n) => { if (o?.content !== n?.content) reklamKontrol(n, true); });

// ---------- Küfür engel ----------
const KUFUR = ["siktir", "fuck", "puşt", "pust", "piç", "sikerim", "sik", "yarra", "yarrak", "amcık", "orospu", "orosbu", "oç", "ibne", "yavşak", "bitch", "dalyarak", "amk", "taşak", "daşşak"];
async function kufurKontrol(msg) {
  try {
    if (!msg.guild || msg.author.bot) return;
    if (!db.fetch(`küfür.${msg.guild.id}.durum`)) return;
    if (!KUFUR.some(w => msg.content.toLowerCase().includes(w))) return;
    if (msg.member?.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) return;
    await msg.delete().catch(() => {});
    const klang = getGuildLang(msg.guild.id);
    const uyari = new Discord.EmbedBuilder().setColor(0x36393F).setDescription(klang === "en" ? `<@${msg.author.id}>, **Swearing is not allowed on this server!**` : `<@${msg.author.id}>, **Bu sunucuda küfür yasak!**`);
    const m = await msg.channel.send({ embeds: [uyari] }).catch(() => null);
    if (m) setTimeout(() => m.delete().catch(() => {}), 5000);
    const logId = db.fetch(`küfür.${msg.guild.id}.kanal`);
    if (logId) {
      const kc = msg.guild.channels.cache.get(logId);
      if (kc?.isTextBased()) kc.send({ embeds: [new Discord.EmbedBuilder().setColor(0x36393F).setDescription(klang === "en" ? `${msg.author}, **tried to swear!**` : `${msg.author}, **Küfür etmeye çalıştı!**`).addFields({ name: (klang === "en" ? "Message:" : "Mesaj:"), value: String(msg.content).slice(0, 1000) || "-" })] }).catch(() => {});
    }
  } catch {}
}
client.on("messageCreate", kufurKontrol);
client.on("messageUpdate", (o, n) => { if (o?.content !== n?.content) kufurKontrol(n); });

// ---------- Spam engel ----------
client.on("messageCreate", async (message) => {
  try {
    if (!message.guild || message.author.bot) return;
    if (!db.fetch(`spam.${message.guild.id}`)) return;
    if (message.member?.permissions.has(Discord.PermissionFlagsBits.BanMembers)) return;
    const anahtar = `spam_${message.guild.id}_${message.author.id}`;
    const simdi = Date.now();
    const kayit = db.fetch(anahtar) || { sayi: 0, zaman: simdi };
    if (simdi - kayit.zaman < 3000) {
      kayit.sayi += 1;
      if (kayit.sayi >= 4) {
        await message.delete().catch(() => {});
        const slang = getGuildLang(message.guild.id);
        const e = new Discord.EmbedBuilder().setColor(0x36393F).setDescription(slang === "en" ? `<@${message.author.id}>, **Spamming is not allowed on this server!**` : `<@${message.author.id}>, **Bu sunucuda spam yapmak yasak!**`);
        const m = await message.channel.send({ embeds: [e] }).catch(() => null);
        if (m) setTimeout(() => m.delete().catch(() => {}), 1500);
        return;
      }
    } else { kayit.sayi = 1; kayit.zaman = simdi; }
    db.set(anahtar, kayit);
    setTimeout(() => { try { db.delete(anahtar); } catch {} }, 5000);
  } catch {}
});

// ---------- Koruma: ban / rol / kanal ----------
client.on("guildBanAdd", async (guild, user) => {
  try {
    const kanalId = db.fetch(`bank_${guild.id}`);
    if (!kanalId) return;
    const entry = await guild.fetchAuditLogs({ type: Discord.AuditLogEvent.MemberBanAdd }).then(a => a.entries.first()).catch(() => null);
    if (!entry || entry.executor.id === client.user.id || entry.executor.id === guild.ownerId) return;
    await guild.members.unban(user.id).catch(() => {});
    await guild.members.kick(entry.executor.id).catch(() => {});
    const kc = guild.channels.cache.get(kanalId);
    const blang = getGuildLang(guild.id);
    if (kc?.isTextBased()) kc.send({ embeds: [new Discord.EmbedBuilder().setTitle(blang === "en" ? "Someone Got Banned!" : "Biri Yasaklandı!").setColor(0x36393F).addFields({ name: (blang === "en" ? "Banner:" : "Yasaklayan:"), value: `${entry.executor.tag}` }, { name: (blang === "en" ? "Banned:" : "Yasaklanan:"), value: `${user.tag}` }, { name: (blang === "en" ? "Result:" : "Sonuç:"), value: (blang === "en" ? "Banner was kicked, ban lifted!" : "Yasaklayan atıldı, yasak kaldırıldı!") })] }).catch(() => {});
  } catch {}
});
client.on("roleDelete", async (role) => {
  try {
    const kanalId = db.fetch(`rolk_${role.guild.id}`);
    const entry = await role.guild.fetchAuditLogs({ type: Discord.AuditLogEvent.RoleDelete }).then(a => a.entries.first()).catch(() => null);
    if (entry && entry.executor.id !== client.user.id && entry.executor.id !== role.guild.ownerId) {
      await role.guild.roles.create({ name: role.name, color: role.color, permissions: role.permissions.bitfield }).then(r => r.setPosition(role.position).catch(() => {})).catch(() => {});
    }
    if (!kanalId) return;
    const kc = role.guild.channels.cache.get(kanalId);
    const rlang = getGuildLang(role.guild.id);
    if (kc?.isTextBased() && entry) kc.send({ embeds: [new Discord.EmbedBuilder().setTitle(rlang === "en" ? "A Role Was Deleted!" : "Bir Rol Silindi!").setColor(0x36393F).addFields({ name: (rlang === "en" ? "Deleter:" : "Silen:"), value: `${entry.executor.tag}` }, { name: (rlang === "en" ? "Deleted Role:" : "Silinen Rol:"), value: `${role.name}` }, { name: (rlang === "en" ? "Result:" : "Sonuç:"), value: (rlang === "en" ? "Role has been restored!" : "Rol geri açıldı!") })] }).catch(() => {});
  } catch {}
});

// ---------- Modlog (tek kopya) ----------
async function modlogGonder(hedef, embed) {
  try {
    if (!hedef) return;
    const kanal = typeof hedef.send === "function" ? hedef : null;
    if (kanal) await kanal.send({ embeds: [embed] }).catch(() => {});
  } catch {}
}
client.on("messageDelete", async (message) => {
  try {
    if (!message?.guild || message.author?.bot || message.channel.isDMBased?.()) return;
    const log = message.guild.channels.cache.get(db.fetch(`log_${message.guild.id}`));
    if (!log?.isTextBased()) return;
    const mlang = getGuildLang(message.guild.id);
    await modlogGonder(log, new Discord.EmbedBuilder().setTitle(`${message.author.username} | ${mlang === "en" ? "Message Deleted" : "Mesaj Silindi"}`).addFields({ name: (mlang === "en" ? "User:" : "Kullanıcı:"), value: `${message.author}` }, { name: (mlang === "en" ? "Channel:" : "Kanal:"), value: `${message.channel}` }, { name: (mlang === "en" ? "Message:" : "Mesaj:"), value: `${message.content || "-"}`.slice(0, 1000) }));
  } catch {}
});
client.on("messageUpdate", async (oldM, newM) => {
  try {
    if (!oldM?.guild || oldM.author?.bot || oldM.content === newM.content) return;
    const log = oldM.guild.channels.cache.get(db.fetch(`log_${oldM.guild.id}`));
    if (!log?.isTextBased()) return;
    const ulang = getGuildLang(oldM.guild.id);
    await modlogGonder(log, new Discord.EmbedBuilder().setAuthor({ name: oldM.author.username, iconURL: oldM.author.displayAvatarURL() }).addFields({ name: (ulang === "en" ? "**Action:**" : "**Eylem:**"), value: (ulang === "en" ? "Message Edit" : "Mesaj Düzenleme") }, { name: (ulang === "en" ? "**Owner:**" : "**Sahibi:**"), value: `<@${oldM.author.id}>` }, { name: (ulang === "en" ? "**Old:**" : "**Eski:**"), value: `${oldM.content || "-"}`.slice(0, 1000) }, { name: (ulang === "en" ? "**New:**" : "**Yeni:**"), value: `${newM.content || "-"}`.slice(0, 1000) }).setTimestamp().setColor(0x36393F).setFooter({ text: ulang === "en" ? `Server: ${oldM.guild.name}` : `Sunucu: ${oldM.guild.name}`, iconURL: oldM.guild.iconURL() }));
  } catch {}
});
for (const [olay, tip, baslikTR, baslikEN] of [["channelCreate", Discord.AuditLogEvent.ChannelCreate, "Kanal Oluşturma", "Channel Create"], ["channelDelete", Discord.AuditLogEvent.ChannelDelete, "Kanal Silme", "Channel Delete"], ["roleCreate", Discord.AuditLogEvent.RoleCreate, "Rol Oluşturma", "Role Create"], ["roleDelete", Discord.AuditLogEvent.RoleDelete, "Rol Silme", "Role Delete"]]) {
  client.on(olay, async (obj) => {
    try {
      const guild = obj.guild;
      const log = guild.channels.cache.get(db.fetch(`log_${guild.id}`));
      if (!log?.isTextBased()) return;
      const entry = await guild.fetchAuditLogs({ type: tip }).then(a => a.entries.first()).catch(() => null);
      const elang = getGuildLang(guild.id);
      const baslik = elang === "en" ? baslikEN : baslikTR;
      await modlogGonder(log, new Discord.EmbedBuilder().setAuthor({ name: entry?.executor?.username || (elang === "en" ? "Unknown" : "Bilinmiyor"), iconURL: entry?.executor?.displayAvatarURL?.() }).addFields({ name: (elang === "en" ? "**Action:**" : "**Eylem:**"), value: baslik }, { name: (elang === "en" ? "**Name:**" : "**İsim:**"), value: `\`${obj.name}\`` }).setTimestamp().setColor(0x36393F));
    } catch {}
  });
}
client.on("guildBanAdd", async (guild, user) => {
  try {
    const log = guild.channels.cache.get(db.fetch(`log_${guild.id}`));
    if (!log?.isTextBased()) return;
    const entry = await guild.fetchAuditLogs({ type: Discord.AuditLogEvent.MemberBanAdd }).then(a => a.entries.first()).catch(() => null);
    const galang = getGuildLang(guild.id);
    await modlogGonder(log, new Discord.EmbedBuilder().setAuthor({ name: entry?.executor?.username || "?", iconURL: entry?.executor?.displayAvatarURL?.() }).addFields({ name: (galang === "en" ? "**Action:**" : "**Eylem:**"), value: (galang === "en" ? "Ban" : "Yasaklama") }, { name: (galang === "en" ? "**Banned:**" : "**Yasaklanan:**"), value: `**${user.tag}** - ${user.id}` }, { name: (galang === "en" ? "**Reason:**" : "**Sebep:**"), value: `${entry?.reason || "-"}` }).setTimestamp().setColor(0x36393F));
  } catch {}
});
client.on("guildBanRemove", async (guild, user) => {
  try {
    const log = guild.channels.cache.get(db.fetch(`log_${guild.id}`));
    if (!log?.isTextBased()) return;
    const entry = await guild.fetchAuditLogs({ type: Discord.AuditLogEvent.MemberBanRemove }).then(a => a.entries.first()).catch(() => null);
    const grlang = getGuildLang(guild.id);
    await modlogGonder(log, new Discord.EmbedBuilder().setAuthor({ name: entry?.executor?.username || "?", iconURL: entry?.executor?.displayAvatarURL?.() }).addFields({ name: (grlang === "en" ? "**Action:**" : "**Eylem:**"), value: (grlang === "en" ? "Unban" : "Yasak kaldırma") }, { name: (grlang === "en" ? "**User:**" : "**Kullanıcı:**"), value: `**${user.tag}** - ${user.id}` }).setTimestamp().setColor(0x36393F));
  } catch {}
});

// ---------- Çekiliş ----------
const { GiveawaysManager } = require("discord-giveaways");
client.giveawaysManager = new GiveawaysManager(client, {
  storage: "./giveaways.json",
  updateCountdownEvery: 5000,
  default: { botsCanWin: false, exemptPermissions: ["ManageMessages", "Administrator"], embedColor: "#FF0000", reaction: "🎉" }
});

// Şartlı çekiliş: kazananlar şartı sağlamıyorsa yeniden çek
client.giveawaysManager.on("giveawayEnded", async (giveaway, winners) => {
  try {
    const sart = db.fetch(`cekilis_sart_${giveaway.messageId}`);
    if (!sart) return;
    const guild = client.guilds.cache.get(sart.guild);
    if (!guild) return;
    const uygunlar = [];
    for (const w of winners) {
      const member = await guild.members.fetch(w.id).catch(() => null);
      if (!member) continue;
      let uygun = true;
      if (sart.rol && !member.roles.cache.has(sart.rol)) uygun = false;
      if (sart.davet > 0) {
        const veri = db.fetch(`invites.${w.id}`) || {};
        const toplam = (veri.total || 0) + (veri.bonus || 0);
        if (toplam < sart.davet) uygun = false;
      }
      if (uygun) uygunlar.push(w);
    }
    if (uygunlar.length < winners.length) {
      const eksik = winners.length - uygunlar.length;
      for (let i = 0; i < eksik; i++) {
        await client.giveawaysManager.reroll(giveaway.messageId).catch(() => {});
      }
    }
  } catch {}
});

// ---------- Otorol ----------
client.on("guildMemberAdd", async (member) => {
  try {
    const rol = db.fetch(`otoRL_${member.guild.id}`);
    if (!rol) return;
    const kanalId = db.fetch(`otoRK_${member.guild.id}`);
    const sablon = db.fetch(`otoRM_${member.guild.id}`);
    await member.roles.add(rol).catch(() => {});
    const kanal = kanalId ? member.guild.channels.cache.get(kanalId) : null;
    if (!kanal?.isTextBased()) return;
    if (!sablon) {
      const olang = getGuildLang(member.guild.id);
      const e = new Discord.EmbedBuilder().setColor("Blue").setTimestamp().setFooter({ text: "RiseBunny" })
        .setDescription(olang === "en" ? `**${member.user.username}** welcome! Your auto role was given. We are now **${member.guild.memberCount}** people!` : `**${member.user.username}** hoş geldin! Otomatik rolün verildi. Seninle beraber **${member.guild.memberCount}** kişiyiz!`)
        .setImage("https://media.discordapp.net/attachments/1116091601907875870/1145356129820483584/Picsart_23-08-27_16-55-54-843.jpg");
      return kanal.send({ embeds: [e] }).catch(() => {});
    }
    const rolAd = member.guild.roles.cache.get(rol)?.name || "rol";
    const botSayi = member.guild.members.cache.filter(m => m.user.bot).size;
    const metin = String(sablon).replace("-uye-", `${member.user}`).replace("-uyetag-", `${member.user.tag}`).replace("-rol-", rolAd).replace("-server-", member.guild.name).replace("-uyesayisi-", `${member.guild.memberCount}`).replace("-botsayisi-", `${botSayi}`).replace("-kanalsayisi-", `${member.guild.channels.cache.size}`);
    await kanal.send(metin).catch(() => {});
  } catch {}
});

// ---------- Ayarlanabilir kayıt karşılama ----------
client.on("guildMemberAdd", (member) => {
  try {
    const kanalId = db.fetch(`kayıthg_${member.guild.id}`);
    if (!kanalId) return;
    const kanal = member.guild.channels.cache.get(kanalId);
    if (!kanal?.isTextBased()) return;
    const kayitci = db.fetch(`kayıtçırol_${member.guild.id}`);
    const klang = getGuildLang(member.guild.id);
    const aylar = klang === "en"
      ? { "01": "January", "02": "February", "03": "March", "04": "April", "05": "May", "06": "June", "07": "July", "08": "August", "09": "September", "10": "October", "11": "November", "12": "December" }
      : { "01": "Ocak", "02": "Şubat", "03": "Mart", "04": "Nisan", "05": "Mayıs", "06": "Haziran", "07": "Temmuz", "08": "Ağustos", "09": "Eylül", "10": "Ekim", "11": "Kasım", "12": "Aralık" };
    const moment = require("moment");
    require("moment-duration-format");
    const kurulus = Date.now() - member.user.createdAt.getTime();
    const ay = Number(moment.duration(kurulus).format("M")) || 0;
    const guven = ay < 1 ? (klang === "en" ? "**Suspicious**" : "**Şüpheli**") : (klang === "en" ? "**Trusted**" : "**Güvenilir**");
    const gifler = ["https://media.discordapp.net/attachments/744976703163728032/751451554132918323/tenor-1.gif"];
    const embed = new Discord.EmbedBuilder().setColor(0x36393F)
      .setImage(gifler[0])
      .setThumbnail(member.user.displayAvatarURL())
      .setDescription(klang === "en"
        ? `**Welcome!** ${member.user}, we are now **${member.guild.memberCount}** people!\nWrite your **name** and **age** to register.\nAccount created: **${moment(member.user.createdAt).format("DD")} ${aylar[moment(member.user.createdAt).format("MM")]} ${moment(member.user.createdAt).format("YYYY HH:mm:ss")}**\nThis account: ${guven}\n${kayitci ? `<@&${kayitci}>` : ""}`
        : `**Hoş geldin!** ${member.user}, seninle beraber **${member.guild.memberCount}** kişi olduk!\nKaydın için **isim** ve **yaş** yazman gerek.\nHesap kuruluş: **${moment(member.user.createdAt).format("DD")} ${aylar[moment(member.user.createdAt).format("MM")]} ${moment(member.user.createdAt).format("YYYY HH:mm:ss")}**\nBu hesap: ${guven}\n${kayitci ? `<@&${kayitci}>` : ""}`);
    kanal.send({ embeds: [embed] }).catch(() => {});
    if (kayitci) kanal.send(`<@&${kayitci}>`).catch(() => {});
  } catch {}
});

// ---------- Raid koruma ----------
client.on("guildMemberAdd", async (member) => {
  try {
    const ayar = db.fetch(`raidkoruma_${member.guild.id}`);
    if (!ayar || ayar.durum !== "açık") return;
    const simdi = Date.now();
    const anahtar = `raid_${member.guild.id}`;
    const liste = (db.fetch(anahtar) || []).filter(t => simdi - t < 10000);
    liste.push(simdi);
    db.set(anahtar, liste);
    if (liste.length >= (ayar.esik || 5)) {
      // Yeni hesap (7 günden genç) ise doğrulama rolü ver / at
      const yas = simdi - member.user.createdAt.getTime();
      if (yas < 7 * 86400000) {
        if (ayar.rol && member.guild.roles.cache.get(ayar.rol)) {
          await member.roles.add(ayar.rol).catch(() => {});
        } else {
          await member.kick("Raid koruması").catch(() => {});
        }
        const lang = getGuildLang(member.guild.id);
        const kc = member.guild.systemChannel;
        if (kc?.isTextBased()) kc.send(t(lang, "raid.tespit")).catch(() => {});
      }
    }
  } catch {}
});

// ---------- İsim değiştirme günlüğü ----------
client.on("guildMemberUpdate", async (eski, yeni) => {
  try {
    const kanalId = db.fetch(`isimlog_${yeni.guild.id}`);
    if (!kanalId) return;
    if (eski.nickname === yeni.nickname) return;
    const kanal = yeni.guild.channels.cache.get(kanalId);
    if (!kanal?.isTextBased()) return;
    const lang = getGuildLang(yeni.guild.id);
    const e = new Discord.EmbedBuilder().setColor("Blue").setAuthor({ name: yeni.user.username, iconURL: yeni.user.displayAvatarURL() })
      .addFields(
        { name: lang === "en" ? "Old nickname" : "Eski isim", value: eski.nickname || "-" },
        { name: lang === "en" ? "New nickname" : "Yeni isim", value: yeni.nickname || "-" }
      ).setTimestamp();
    await kanal.send({ embeds: [e] }).catch(() => {});
  } catch {}
});

// ---------- Hata yakalama ----------
const tokenLeak = /[\w-]{24}\.[\w-]{6}\.[\w-]{27}/g;
client.on("warn", e => console.log(String(e).replace(tokenLeak, "[redacted]")));
client.on("error", e => console.log(String(e).replace(tokenLeak, "[redacted]")));
process.on("unhandledRejection", e => console.error("Yakalanmamış asenkron hata:", e?.message || e));
process.on("uncaughtException", e => console.error("Yakalanmamış hata:", e?.message || e));

// ---------- Login ----------
const discordToken = process.env.DISCORD_BOT_TOKEN || process.env.token;
if (!discordToken) {
  console.warn("[UYARI] .env içinde DISCORD_BOT_TOKEN yok. Örnek: .env.example dosyasına bakın.");
} else {
  client.login(discordToken).catch(err => console.error("Discord Login Hatası:", err.message));
}
