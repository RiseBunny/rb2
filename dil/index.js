/**
 * RiseBunny Dil Yöneticisi
 * - Manuel `if (lang === 'en') ... else ...` bloklari YOK, hepsi dil/*.js icinde.
 * - Yeni dil: dil/xx.js olustur + asagidaki `diller` objesine ekle.
 *
 * Kullanim:
 *   const { t, getLang, setLang, diller } = require('../dil');
 *   const lang = await getLang(message.author.id);
 *   message.reply(t(lang, 'ekonomi.yetersiz', { miktar: 100, bakiye: 50 }));
 */
const db = require("croxydb");
const { KOMUTLAR, KATEGORILER } = require("./komutlar");

const diller = {
  tr: require("./tr"),
  en: require("./en")
};

const VARSAYILAN = "tr";
const GECERLI = Object.keys(diller);

function normalizeLang(lang) {
  if (!lang) return VARSAYILAN;
  lang = String(lang).toLowerCase();
  return GECERLI.includes(lang) ? lang : VARSAYILAN;
}

async function getLang(userId) {
  try {
    if (!userId) return VARSAYILAN;
    const l = db.fetch(`language_${userId}`) || db.get(`language_${userId}`);
    return normalizeLang(l);
  } catch {
    return VARSAYILAN;
  }
}

function setLang(userId, lang) {
  lang = normalizeLang(lang);
  db.set(`language_${userId}`, lang);
  return lang;
}

/** Senkron dil okuma (async olmayan run fonksiyonlari ve event handler'lar icin). */
function getLangSync(userId) {
  try {
    if (!userId) return VARSAYILAN;
    const l = db.fetch(`language_${userId}`);
    if (typeof l === "string" && GECERLI.includes(l.toLowerCase())) return l.toLowerCase();
    return VARSAYILAN;
  } catch {
    return VARSAYILAN;
  }
}

/** Kullanicinin dil kaydi var mi? (ilk komutta dil secimi icin) */
function hasLang(userId) {
  try {
    if (!userId) return false;
    const l = db.fetch(`language_${userId}`);
    return typeof l === "string" && GECERLI.includes(l.toLowerCase());
  } catch {
    return false;
  }
}

/** Sunucu dili (bot.js sistem cevaplari bu dili kullanir). Varsayilan: tr. */
function getGuildLang(guildId) {
  try {
    if (!guildId) return VARSAYILAN;
    const l = db.fetch(`slanguage_${guildId}`);
    if (typeof l === "string" && GECERLI.includes(l.toLowerCase())) return l.toLowerCase();
    return VARSAYILAN;
  } catch {
    return VARSAYILAN;
  }
}

/** Sunucunun dil kaydi var mi? */
function hasGuildLang(guildId) {
  try {
    if (!guildId) return false;
    const l = db.fetch(`slanguage_${guildId}`);
    return typeof l === "string" && GECERLI.includes(l.toLowerCase());
  } catch {
    return false;
  }
}

function setGuildLang(guildId, lang) {
  lang = normalizeLang(lang);
  db.set(`slanguage_${guildId}`, lang);
  return lang;
}

/** Kategori görünen adi (dile göre). */
function katAdi(lang, katId) {
  lang = normalizeLang(lang);
  const k = KATEGORILER.find(x => x.id === katId);
  if (!k) return katId;
  return lang === "en" ? k.en : k.tr;
}

/** Kategori id'sini TR veya EN adindan bul (yardim argümani icin). */
function katCoz(girdi) {
  if (!girdi) return null;
  girdi = String(girdi).toLowerCase();
  return KATEGORILER.find(k => k.id === girdi || k.tr.toLowerCase() === girdi || k.en.toLowerCase() === girdi) || null;
}

/**
 * Komut girdisini canonical ada cevir (dilden bagimsiz).
 * Once client komut/aliaslarina bakilir (Turkce), sonra Ingilizce ad/aliaslara.
 * client = message.client
 */
function komutCoz(client, girdi) {
  if (!girdi || !client) return null;
  girdi = String(girdi).toLowerCase();
  if (client.commands.has(girdi)) return girdi;
  const viaAlias = client.aliases.get(girdi);
  if (viaAlias) return String(viaAlias).toLowerCase();
  for (const [canonical, bilgi] of Object.entries(KOMUTLAR)) {
    if (bilgi.en.toLowerCase() === girdi) return canonical;
    if ((bilgi.enAlias || []).some(a => String(a).toLowerCase() === girdi)) return canonical;
  }
  return null;
}

/** Komutun o dildeki adi (yardim listesi icin). */
function komutAdi(lang, canonical) {
  lang = normalizeLang(lang);
  const bilgi = KOMUTLAR[canonical];
  if (lang === "en" && bilgi) return bilgi.en;
  return canonical;
}

/** Komutun o dildeki aliaslari (gosterim icin). */
function komutAliaslari(lang, canonical, client) {
  lang = normalizeLang(lang);
  const bilgi = KOMUTLAR[canonical];
  if (lang === "en" && bilgi) return bilgi.enAlias || [];
  if (!client) return [];
  const out = [];
  for (const [alias, hedef] of client.aliases) {
    if (String(hedef).toLowerCase() === canonical) out.push(alias);
  }
  return out;
}

/** Komut aciklama/kullanim (dile gore, tr.js/en.js komutlar bolumunden). */
function komutBilgi(lang, canonical) {
  lang = normalizeLang(lang);
  let b = get(diller[lang]?.komutlar, canonical);
  if (!b) b = get(diller[VARSAYILAN]?.komutlar, canonical);
  return b || { aciklama: "", kullanim: canonical };
}

function get(obj, path) {
  return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

/** t('tr', 'ekonomi.yetersiz', {miktar, bakiye}) */
function t(lang, key, vars = {}) {
  lang = normalizeLang(lang);
  let text = get(diller[lang], key);
  if (text === undefined) text = get(diller[VARSAYILAN], key);
  if (text === undefined) return key;
  if (typeof text !== "string") return text;
  return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

module.exports = { diller, GECERLI, VARSAYILAN, normalizeLang, getLang, getLangSync, setLang, hasLang, getGuildLang, setGuildLang, hasGuildLang, t, KOMUTLAR, KATEGORILER, katAdi, katCoz, komutCoz, komutAdi, komutAliaslari, komutBilgi };
