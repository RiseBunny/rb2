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
  /* KRITIK: Eski sistem kaydı (ayarlar.json -> premiumIDs) de temizlenmeli.
     Aksi halde isPremium() listeyi görüp 30 günlük premiumu yeniden yazıyor
     ve "premium sil" işlemi hiç işe yaramıyordu. */
  try {
    const fs = require("fs");
    const path = require("path");
    const yol = path.join(__dirname, "ayarlar.json");
    const ayarlar = JSON.parse(fs.readFileSync(yol, "utf8"));
    if (Array.isArray(ayarlar.premiumIDs)) {
      const hedef = String(userId);
      const yeni = ayarlar.premiumIDs.filter(x => String(x) !== hedef);
      if (yeni.length !== ayarlar.premiumIDs.length) {
        ayarlar.premiumIDs = yeni;
        fs.writeFileSync(yol, JSON.stringify(ayarlar, null, 2));
        /* Bellekteki kopya da güncellenmeli, yoksa legacyPremiumIDs() eski
           listeyi okumaya devam eder. */
        _ayarlar.premiumIDs = yeni;
      }
    }
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

/* Sunucunun mod-log kanalına yazar (r!modlog ile ayarlanır).
   Kanal yoksa sessizce atlar — komut akışını asla bozmaz. */
async function modLogGonder(guild, embed) {
  try {
    if (!guild) return false;
    const kanalId = db.fetch(`log_${guild.id}`);
    if (!kanalId) return false;
    const kanal = guild.channels.cache.get(kanalId);
    if (!kanal || typeof kanal.isTextBased !== "function" || !kanal.isTextBased()) return false;
    await kanal.send({ embeds: [embed] }).catch(() => {});
    return true;
  } catch { return false; }
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

// ---------- Kupon bayrak migrasyonu (tek seferlik global işaret → limitli yapı) ----------
// Eski kod, kullanılan kupona `usedCoupons.<kod>=true` yazıyordu (herkesi engeller).
// Bunu kişi-bazlı sisteme çevirir: sayı-formatlı kupon limit:1 + sayaç:1 olur,
// nesne kuponlarda bayrak sadece silinir (kişi-bazlı + limit sayacı devralır).
function migrateKuponFlags() {
  try {
    const tum = db.all() || {};
    const kodlar = new Set();
    // croxydb noktalı anahtarları iç içe saklar: {usedCoupons: {KOD: true}}
    const ic = tum.usedCoupons;
    if (ic && typeof ic === "object") {
      for (const kod of Object.keys(ic)) kodlar.add(kod);
    }
    // ihtimale karşı düz anahtarlar da tara
    for (const k of Object.keys(tum)) {
      if (k.startsWith("usedCoupons.")) kodlar.add(k.slice("usedCoupons.".length));
    }
    let n = 0;
    for (const kod of kodlar) {
      const mevcut = db.fetch(`kupon_${kod}`);
      if (typeof mevcut === "number") {
        const norm = { kod, tip: "para", miktar: mevcut, bitis: 0, yer: "ikisi", limit: 1, calismalar: 1 };
        try { db.set(`kupon_${kod}`, norm); } catch {}
        try {
          const liste = db.get("kuponListesi") || [];
          if (!liste.some(x => x && x.kod === kod)) {
            liste.push({ ...norm, olusturan: "migrasyon", tarih: Date.now() });
            db.set("kuponListesi", liste);
          }
        } catch {}
      }
      try { db.delete(`usedCoupons.${kod}`); } catch {}
      n++;
    }
    if (n > 0) console.log(`[Kupon] ${n} eski global bayrak migrate edildi.`);
    return n;
  } catch { return 0; }
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
// Constants for special rewards
const SEVIYE_VIP_ROL_ID = "1192950775467495456"; // L25 VIP rol
const SEVIYE_VIP_SUNUCU_ID = "1192948403232067725"; // L25/L50 sunucu
const SEVIYE_VIP_SUNUCU_LINK = "https://dsc.gg/risebunny";

/** Toplam XP'den seviyeyi hesaplar (kolaylaştırılmış formül: L. seviye için 50*(L-1) XP). */
function xpSeviye(xp) {
  const x = Math.max(0, Number(xp) || 0);
  // Toplam XP = 25 * (L-1) * L  → L = (1 + sqrt(1 + 4*x/25)) / 2
  return Math.floor((1 + Math.sqrt(1 + 4 * x / 25)) / 2);
}

/** L -> L+1 seviyesi icin gereken XP (kolaylaştırılmış: 50 * L). */
function xpGerekli(seviye) {
  const s = Math.max(1, Number(seviye) || 1);
  return 50 * s;
}

/** Seviye L'e ulaşmak için gereken toplam XP. */
function xpToplam(seviye) {
  const s = Math.max(1, Number(seviye) || 1);
  return 25 * (s - 1) * s;
}

/** Seviye ödülleri (para) — artırılmış değerler. */
const SEVIYE_ODULLERI = { 5: 75000, 10: 250000, 15: 500000, 20: 1000000, 25: 2000000, 30: 3000000, 40: 5000000, 50: 10000000 };
function seviyeOdulu(seviye) {
  return SEVIYE_ODULLERI[Number(seviye)] || 0;
}

/** Her komut kullanımında verilecek XP (temel + premium bonusu). */
function xpPerCommand(userId) {
  const baseXP = 15; // komut başına temel XP
  const prem = isPremium(userId) ? 1.5 : 1;
  return Math.floor(baseXP * prem);
}

/** Komut sonrası XP ver, seviye atlaması ve ödülleri kontrol et. */
async function giveCommandXp(client, userId, guildId) {
  try {
    const key = `xp_${userId}`;
    const oncekiXP = Number(db.fetch(key) || 0);
    const eklenenXP = xpPerCommand(userId);
    const yeniXP = oncekiXP + eklenenXP;
    db.set(key, yeniXP);

    const oncekiSeviye = xpSeviye(oncekiXP);
    const yeniSeviye = xpSeviye(yeniXP);

    // Seviye atlandı mı?
    if (yeniSeviye > oncekiSeviye) {
      // Seviye ödülü (para)
      for (let s = oncekiSeviye + 1; s <= yeniSeviye; s++) {
        const odul = seviyeOdulu(s);
        if (odul > 0) {
          db.add(`para_${userId}`, odul);
        }
        // L25 VIP rol
        if (s === 25) {
          await handleLevelReward(client, userId, guildId, 25, odul, "VIP rol", true);
        }
        // L50 1 yıllık premium
        if (s === 50) {
          await handleLevelReward(client, userId, guildId, 50, odul, "1 yıllık Premium", false);
        }
      }
      // DM bildirimi (genel seviye atlaması)
      try {
        const { getLangSync, t } = require("./dil");
        const lang = getLangSync(userId);
        const u = await client.users.fetch(userId).catch(() => null);
        if (u) {
          const odulToplam = Object.entries(SEVIYE_ODULLERI)
            .filter(([k]) => Number(k) > oncekiSeviye && Number(k) <= yeniSeviye)
            .reduce((sum, [, v]) => sum + v, 0);
          const dmText = t(lang, "seviye.seviyeAtlandi", { seviye: yeniSeviye, xp: eklenenXP, toplam: yeniXP.toLocaleString(), bonus: odulToplam.toLocaleString() });
          await u.send({ embeds: [new EmbedBuilder().setColor("Gold")
            .setTitle(t(lang, lang === "en" ? "seviye.seviyeAtlandi" : "seviye.seviyeAtlandi").split('\n')[0] || (lang === "en" ? "🎉 Level Up!" : "🎉 Seviye Atladın!"))
            .setDescription(dmText)
            .setTimestamp()] }).catch(() => {});
        }
      } catch {}
    }
  } catch {}
}

/** Seviye özel ödülleri (rol/premium) işler. */
async function handleLevelReward(client, userId, guildId, seviye, odul, tur, isVipRol) {
  try {
    const { getLangSync, t } = require("./dil");
    const lang = getLangSync(userId);
    const u = await client.users.fetch(userId).catch(() => null);

    if (isVipRol && guildId === SEVIYE_VIP_SUNUCU_ID) {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const member = await guild.members.fetch(userId).catch(() => null);
        const rol = guild.roles.cache.get(SEVIYE_VIP_ROL_ID);
        if (member && rol) {
          if (!member.roles.cache.has(rol.id)) {
            await member.roles.add(rol).catch(() => {});
          }
          // DM embed - using translations
          if (u) {
            const dmText = t(lang, "seviye.vipRolKazandin", { seviye, sunucu: guild.name, rol: rol.name, odul: odul.toLocaleString() });
            await u.send({ embeds: [new EmbedBuilder().setColor("Gold")
              .setTitle(t(lang, lang === "en" ? "seviye.vipRolKazandin" : "seviye.vipRolKazandin").split('\n')[0] || (lang === "en" ? `🎉 Level ${seviye} — VIP Role!` : `🎉 Seviye ${seviye} — VIP Rolü!`))
              .setDescription(dmText)
              .setThumbnail(guild.iconURL({ dynamic: true }))
              .setTimestamp()] }).catch(() => {});
          }
          // Owner log
          ownerLog(client, `🏆 **L${seviye} VIP Rol:** ${u?.tag || userId} (\`${userId}\`) → ${rol.name} @ ${guild.name}`);
        } else if (u) {
          // Sunucuda değil - DM ile davet
          const dmText = t(lang, "seviye.vipRolDm", { seviye, odul: odul.toLocaleString() });
          await u.send({ embeds: [new EmbedBuilder().setColor("Gold")
            .setTitle(lang === "en" ? `🎉 Level ${seviye} Reached!` : `🎉 Seviye ${seviye} Kazandın!`)
            .setDescription(dmText)
            .setTimestamp()] }).catch(() => {});
          ownerLog(client, `🏆 **L${seviye} VIP Rol (DM):** ${u.tag} (\`${userId}\`) — sunucuda değil, DM gönderildi`);
        }
      }
    }

    if (seviye === 50) {
      // 1 yıllık premium
      addPremium(userId, 365 * 24 * 60 * 60 * 1000);
      if (u) {
        const dmText = t(lang, "seviye.premium50", { odul: odul.toLocaleString() });
        await u.send({ embeds: [new EmbedBuilder().setColor("Gold")
          .setTitle(lang === "en" ? "💎 Level 50 — 1 Year Premium!" : "💎 Seviye 50 — 1 Yıllık Premium!")
          .setDescription(dmText)
          .setTimestamp()] }).catch(() => {});
      }
      ownerLog(client, `💎 **L50 Premium:** ${u?.tag || userId} (\`${userId}\`) — 1 yıl premium verildi`);
    }
  } catch {}
}

/** r!rolal komutu için: sunucuda varsa L25 rolünü ver. */
async function checkAndGiveLevelRole(client, userId) {
  try {
    const { getLangSync, t } = require("./dil");
    const lang = getLangSync(userId);
    const guild = client.guilds.cache.get(SEVIYE_VIP_SUNUCU_ID);
    if (!guild) return { ok: false, msg: t(lang, "seviye.rolalSunucudaDegil") };

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return { ok: false, msg: t(lang, "seviye.rolalSunucudaDegil") };

    const seviye = xpSeviye(Number(db.fetch(`xp_${userId}`) || 0));
    if (seviye < 25) return { ok: false, msg: t(lang, "seviye.rolalSeviyeYetersiz", { seviye }) };

    const rol = guild.roles.cache.get(SEVIYE_VIP_ROL_ID);
    if (!rol) return { ok: false, msg: t(lang, "seviye.rolalRolBulunamadi") };

    if (member.roles.cache.has(rol.id)) return { ok: true, msg: t(lang, "seviye.rolalZatenVar", { rol: rol.name }) };

    await member.roles.add(rol).catch(() => {});
    return { ok: true, msg: t(lang, "seviye.rolalBasarili", { rol: rol.name }) };
  } catch (e) {
    return { ok: false, msg: String(e.message || e) };
  }
}

/* ── Bot tarafı Firestore silme ────────────────────────────────────────────
   Veri silme talebi sahip tarafından KABUL edildiğinde kullanıcının forum
   içeriklerini (konu/yanıt/bildirim/hesap) bot hesabıyla siler. Bot hesabı
   yetkili değilse (rules yayınlanmamış) sessizce başarısız olur ve çağıran
   taraf kullanıcıyı siteye yönlendirir. */
const FB_PROJE = "gen-lang-client-0590499912";
const FB_ANAHTAR = process.env.FIREBASE_API_KEY || "AIzaSyAq5Nafl9aI2TabzGsj5J9ij6lNwyfTguM";
const SILINECEK_KOLEKSIYONLAR = [
  { ad: "threads", alan: "authorId", etiket: "forum konusu" },
  { ad: "posts", alan: "authorId", etiket: "forum yanıtı" },
  { ad: "notifications", alan: "userId", etiket: "bildirim" }
];
let _silToken = null, _silTokenExp = 0;
async function _silTokenAl() {
  if (_silToken && Date.now() < _silTokenExp - 60000) return _silToken;
  const email = process.env.FIREBASE_BOT_EMAIL || "", sifre = process.env.FIREBASE_BOT_SIFRE || "";
  if (!email || !sifre) return null;
  try {
    const r = await fetch(
      "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + FB_ANAHTAR,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: sifre, returnSecureToken: true })
      }
    );
    if (!r.ok) return null;
    const j = await r.json();
    _silToken = j.idToken;
    _silTokenExp = Date.now() + (Number(j.expiresIn) || 3600) * 1000;
    return _silToken;
  } catch { return null; }
}
async function _fbDokumanBul(tok, koleksiyon, alan, uid) {
  try {
    const r = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FB_PROJE}/databases/(default)/documents:runQuery?key=${FB_ANAHTAR}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: koleksiyon }],
            where: {
              fieldFilter: {
                field: { fieldPath: alan },
                op: "EQUAL",
                value: { stringValue: String(uid) }
              }
            },
            limit: 300
          }
        })
      }
    );
    if (!r.ok) return [];
    const j = await r.json().catch(() => []);
    return (Array.isArray(j) ? j : [])
      .map(x => x && x.document && x.document.name)
      .filter(Boolean);
  } catch { return []; }
}
/** Kullanıcının site (Firestore) verilerini siler. */
async function firestoreSil(uid, ekstra = []) {
  const kimlik = String(uid || "").replace(/\D/g, "").slice(0, 25);
  const cikti = { ok: false, silinen: 0, detay: [] };
  if (!kimlik) return cikti;
  const tok = await _silTokenAl();
  if (!tok) { cikti.detay.push("bot firebase girişi yok"); return cikti; }
  for (const k of SILINECEK_KOLEKSIYONLAR) {
    const adlar = await _fbDokumanBul(tok, k.ad, k.alan, kimlik);
    let sayi = 0;
    for (const ad of adlar) {
      const r = await fetch(`https://firestore.googleapis.com/v1/${ad}?key=${FB_ANAHTAR}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + tok }
      }).catch(() => null);
      if (r && r.ok) sayi++;
    }
    if (sayi) cikti.detay.push(`${k.etiket}: ${sayi}`);
    cikti.silinen += sayi;
  }
  for (const ek of ekstra) {
    const r = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FB_PROJE}/databases/(default)/documents/${ek}?key=${FB_ANAHTAR}`,
      { method: "DELETE", headers: { Authorization: "Bearer " + tok } }
    ).catch(() => null);
    if (r && r.ok) { cikti.silinen++; cikti.detay.push(`${ek} silindi`); }
  }
  cikti.ok = cikti.silinen > 0;
  return cikti;
}

module.exports = {
  db,
  firestoreSil,
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
  modLogGonder,
  komutLog,
  embed,
  safeSend,
  safeReply,
  timedDelete,
  bakimSebebi,
  startPremiumSweeper,
  startKuponSweeper,
  migrateKuponFlags,
  getKupon,
  startHatirlatSweeper,
  parseSure,
  xpSeviye,
  xpGerekli,
  xpToplam,
  xpPerCommand,
  giveCommandXp,
  checkAndGiveLevelRole,
  seviyeOdulu,
  SEVIYE_ODULLERI,
  Perms: PermissionFlagsBits
};
