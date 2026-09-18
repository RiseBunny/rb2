/**
 * AI Sohbet Sistemi - Ana İşleyici (croxydb tabanlı, limit yok)
 * - "rise <metin>" tetikleyicisi
 * - croxydb'den cevap arama
 * - Premium/normal ayrımı yok
 * - Cooldown sadece spam koruması için
 */
const SoruEslestirici = require("./matcher");
const db = require("croxydb");
const { EmbedBuilder } = require("discord.js");

// AI Matcher başlat (croxydb ile)
const matcher = new SoruEslestirici(db);

// Cooldown sadece spam koruması için (3 saniye)
const aiCooldown = new Map();
const COOLDOWN_MS = 3000;

const AI_CONFIG = {
  TETIKLEYICI: "rise",
  KARAKTER_LIMITI: 4000,
  COOLDOWN_MS,
  DESTEK_SUNUCU_ID: "1192948403232067725",
  DESTEK_SUNUCU_LINK: "https://dsc.gg/risebunny"
};

/**
 * AI Ana işleyici
 * @param {Message} message - Discord mesajı
 * @param {Client} client - Discord client
 * @returns {Promise<boolean>} true = AI cevap verdi (diğer işlemler durur)
 */
async function aiIsle(message, client) {
  const icerik = message.content?.trim();
  if (!icerik) return false;

  // 1) "rise" ile başlıyor mu? (büyük/küçük harf duyarsız)
  if (!icerik.toLowerCase().startsWith(AI_CONFIG.TETIKLEYICI.toLowerCase())) return false;

  // 2) "rise"dan sonra boşluk var mı? (risexyz gibi olmasın)
  const tetikleyiciUzunluk = AI_CONFIG.TETIKLEYICI.length;
  const sonrasi = icerik.slice(tetikleyiciUzunluk);
  if (sonrasi.length > 0 && !/^\s/.test(sonrasi)) return false;

  // 3) Kullanıcının sorusunu al
  const soru = sonrasi.trim();

  // 4) Soru boşsa
  if (!soru) {
    await message.reply({
      content: `Merhaba ${message.author}! 👋 Bana bir şey sormak ister misin?\nÖrn: \`rise nasılsın\`, \`rise premium ne işe yarar\``,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }

  // 5) Karakter limiti kontrolü
  if (soru.length > AI_CONFIG.KARAKTER_LIMITI) {
    await message.reply({
      content: `⚠️ Sorun çok uzun! En fazla **${AI_CONFIG.KARAKTER_LIMITI} karakter** olabilir.`,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }

  // 6) Cooldown kontrolü (sadece spam koruması)
  const now = Date.now();
  const sonKullanim = aiCooldown.get(message.author.id) || 0;
  if (now - sonKullanim < AI_CONFIG.COOLDOWN_MS) {
    const kalan = Math.ceil((AI_CONFIG.COOLDOWN_MS - (now - sonKullanim)) / 1000);
    await message.reply({
      content: `⏳ Lütfen **${kalan} saniye** bekle.`,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }
  aiCooldown.set(message.author.id, now);

  // 7) croxydb'de ara
  const sonuc = await matcher.bul(soru);

  if (sonuc) {
    // ✅ Bulundu → cevap ver
    let cevap = matcher.degiskenleriDoldur ? matcher.degiskenleriDoldur(sonuc.cevap, message, client) : sonuc.cevap;
    
    // Eğer matcher.degiskenleriDoldur yoksa manuel doldur
    if (typeof cevap === "string" && cevap.includes("{{")) {
      const { t, getLangSync } = require("../dil");
      const lang = getLangSync(message.author.id);
      const prefix = process.env.PREFIX || "r!";
      
      cevap = cevap
        .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString("tr-TR"))
        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString("tr-TR"))
        .replace(/\{\{user\}\}/g, message.author?.username || "Kullanıcı")
        .replace(/\{\{mention\}\}/g, message.author ? `<@${message.author.id}>` : "@Kullanıcı")
        .replace(/\{\{guild\}\}/g, message.guild?.name || "DM")
        .replace(/\{\{prefix\}\}/g, prefix)
        .replace(/\{\{bot\}\}/g, client?.user?.username || "RiseBunny")
        .replace(/\{\{ping\}\}/g, client.ws.ping);
    }

    // Kullanım sayısını artır
    try {
      db.add(`ai_qa_${sonuc.id}_kullanim`, 1);
    } catch {}

    // "yazıyor..." efekti
    await message.channel.sendTyping().catch(() => {});
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

    await message.reply({
      content: cevap,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});

    console.log(`🤖 [AI] ${message.author.tag}: "${soru}" → "${sonuc.soru}" (skor: ${sonuc.skor.toFixed(2)}, kat: ${sonuc.kategori})`);
    return true;
  }

  // 8) Bulunamadı - fallback cevap
  const fallbackMesajlar = [
    "🤔 Bunu cevap listemde bulamadım. Başka bir şekilde sorabilir misin?",
    "😅 Bu konuda bilgim yok. `r!yardım` yazıp komutlarıma bakabilirsin!",
    "🤷‍♂️ Anlayamadım ama öğrenmek isterim! Daha basit sorar mısın?",
    "❓ Bu soru benim biligim dışında. Destek sunucusunda sorabilirsin: https://dsc.gg/risebunny"
  ];
  const fallback = fallbackMesajlar[Math.floor(Math.random() * fallbackMesajlar.length)];

  await message.channel.sendTyping().catch(() => {});
  await new Promise(r => setTimeout(r, 300));
  await message.reply({
    content: fallback,
    allowedMentions: { repliedUser: false }
  }).catch(() => {});

  return true;
}

/** Yeni QA eklendiğinde cache temizle */
function cacheTemizle() {
  matcher.cacheTemizle();
}

module.exports = {
  aiIsle,
  cacheTemizle,
  AI_CONFIG,
  matcher
};