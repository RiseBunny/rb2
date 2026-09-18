/**
 * AI Sohbet Sistemi - Ana İşleyici (croxydb + Groq fallback)
 * - "rise <metin>" tetikleyicisi
 * - Önce croxydb'de arar, yoksa Groq AI'ye sorar
 * - Groq cevabında "Öğren" butonu ekler
 * - Cooldown sadece spam koruması için
 */

const SoruEslestirici = require("./matcher");
const { groqSor, formatEgitimVerileri } = require("./groq");
const db = require("croxydb");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

// AI Matcher başlat (croxydb ile)
const matcher = new SoruEslestirici(db);

// Cooldown sadece spam koruması için (3 saniye)
const aiCooldown = new Map();
const COOLDOWN_MS = 3000;

// Groq istekleri için cooldown (kullanıcı başına 10 saniye)
const groqCooldown = new Map();
const GROQ_COOLDOWN_MS = 10000;

const AI_CONFIG = {
  TETIKLEYICI: "rise",
  KARAKTER_LIMITI: 4000,
  COOLDOWN_MS,
  DESTEK_SUNUCU_ID: "1192948403232067725",
  DESTEK_SUNUCU_LINK: "https://discord.gg/mEfz5SfpbR"
};

/**
 * Eğitim verilerini Groq system prompt için formatla
 */
function egitimVerileriniHazirla() {
  try {
    const all = db.all() || {};
    const veriler = [];
    
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith("ai_qa_") && value && value.soru && value.cevap) {
        veriler.push({
          soru: value.soru,
          cevap: value.cevap,
          kategori: value.kategori || "genel"
        });
      }
    }
    
    // Kategorilere göre grupla, her kategori max 3 örnek
    const kategoriler = {};
    for (const v of veriler) {
      const kat = v.kategori || "genel";
      if (!kategoriler[kat]) kategoriler[kat] = [];
      if (kategoriler[kat].length < 3) {
        kategoriler[kat].push(v);
      }
    }
    
    let output = "";
    for (const [kat, liste] of Object.entries(kategoriler)) {
      output += `\n## ${kat.toUpperCase()}\n`;
      for (const item of liste) {
        output += `Q: ${item.soru}\nA: ${item.cevap}\n\n`;
      }
    }
    
    return output;
  } catch (e) {
    console.error("[AI] Eğitim verisi hazırlama hatası:", e.message);
    return "";
  }
}

/**
 * "Öğren" butonu ile cevabı veritabanına kaydet
 */
async function ogrenenCevapKaydet(interaction, soru, cevap) {
  try {
    const id = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    db.set(`ai_qa_${id}`, {
      soru: soru,
      cevap: cevap,
      kategori: "ai_learned",
      kaynak: "groq_learned",
      ekleyen: interaction.user.id,
      kullanim: 0,
      faydali: 0,
      created_at: Date.now()
    });
    
    // Matcher cache temizle
    try {
      matcher.cacheTemizle();
    } catch {}
    
    await interaction.update({
      content: `✅ **Başarıyla öğrendim!** Bu soru-cevap çifti artık veritabanımda.\n\n**Soru:** ${soru}\n**Cevap:** ${cevap}`,
      components: [],
      embeds: []
    }).catch(() => {});
    
    console.log(`🧠 [AI Öğrenme] ${interaction.user.tag}: "${soru}" kaydedildi`);
    
  } catch (e) {
    console.error("[AI Öğrenme Hatası]:", e);
    await interaction.reply({ content: "❌ Kaydetme sırasında hata oluştu.", ephemeral: true }).catch(() => {});
  }
}

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
  if (!icerik.toLowerCase().startsWith("rise ")) return false;

  // 2) Kullanıcının sorusunu al
  const soru = icerik.slice(5).trim(); // "rise ".length = 5

  // 3) Soru boşsa
  if (!soru) {
    await message.reply({
      content: `Merhaba ${message.author}! 👋 Bana bir şey sormak ister misin?\nÖrn: \`rise nasılsın\`, \`rise premium ne işe yarar\``,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }

  // 3) Karakter limiti kontrolü
  if (soru.length > 4000) {
    await message.reply({
      content: `⚠️ Sorun çok uzun! En fazla **4000 karakter** olabilir.`,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }

  // 4) Cooldown kontrolü (sadece spam koruması - 3 sn)
  const now = Date.now();
  const sonKullanim = aiCooldown.get(message.author.id) || 0;
  if (now - sonKullanim < COOLDOWN_MS) {
    const kalan = Math.ceil((COOLDOWN_MS - (now - sonKullanim)) / 1000);
    await message.reply({
      content: `⏳ Lütfen **${kalan} saniye** bekle.`,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }
  aiCooldown.set(message.author.id, now);

  // 5) Groq cooldown kontrolü (10 sn)
  const groqSonKullanim = groqCooldown.get(message.author.id) || 0;
  const groqBekle = groqSonKullanim + 10000 - now;
  if (groqBekle > 0) {
    // Groq cooldown'da ama local DB'de arama yapabilir
  }

  // 6) Önce croxydb'de ara (local bilgi tabanı)
  const sonuc = await matcher.bul(soru);

  if (sonuc) {
    // ✅ Local DB'de bulundu → cevap ver
    let cevap = matcher.degiskenleriDoldur ? matcher.degiskenleriDoldur(sonuc.cevap, message, client) : sonuc.cevap;
    
    // Manuel değişken doldurma (fallback)
    if (typeof cevap === "string" && cevap.includes("{{")) {
      const { getLangSync } = require("../dil");
      const lang = require("../dil").getLangSync(message.author.id);
      const prefix = process.env.PREFIX || "r!";
      
      cevap = cevap
        .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString(lang === "en" ? "en-US" : "tr-TR"))
        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString(lang === "en" ? "en-US" : "tr-TR"))
        .replace(/\{\{user\}\}/g, message.author?.username || "Kullanıcı")
        .replace(/\{\{mention\}\}/g, message.author ? `<@${message.author.id}>` : "@Kullanıcı")
        .replace(/\{\{guild\}\}/g, message.guild?.name || "DM")
        .replace(/\{\{prefix\}\}/g, prefix)
        .replace(/\{\{bot\}\}/g, client?.user?.username || "RiseBunny")
        .replace(/\{\{ping\}\}/g, client.ws.ping);
    }

    // Kullanım sayısını artır
    try { db.add(`ai_qa_${sonuc.id}_kullanim`, 1); } catch {}

    // "yazıyor..." efekti
    await message.channel.sendTyping().catch(() => {});
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

    await message.reply({
      content: cevap,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});

    console.log(`🤖 [AI Local] ${message.author.tag}: "${soru}" → "${sonuc.soru}" (skor: ${sonuc.skor.toFixed(2)})`);
    return true;
  }

  // 7) Local DB'de yoksa Groq AI'ye sor
  const groqCooldownKalan = groqSonKullanim + 10000 - now;
  if (groqCooldownKalan > 0) {
    await message.reply({
      content: `⏳ AI şu an meşgul, **${Math.ceil(groqCooldownKalan / 1000)} saniye** sonra tekrar dene.`,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }
  
  groqCooldown.set(message.author.id, now);

  // Eğitim verilerini Groq'ya göndermek için hazırla
  const egitimVerileri = egitimVerileriniHazirla();
  
  // "Yazıyor..." efekti
  await message.channel.sendTyping().catch(() => {});
  
  // Groq AI'ye sor
  const { groqSor } = require("./groq");
  const groqSonuc = await groqSor(soru, egitimVerileri);

  if (groqSonuc.success) {
    const cevap = groqSonuc.cevap;
    
    // "Öğren" butonu oluştur
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ai_learn_${Buffer.from(JSON.stringify({soru, cevap})).toString('base64').slice(0, 80)}`)
        .setLabel("🧠 Öğren")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🧠")
    );

    await message.reply({
      content: cevap,
      components: [row],
      allowedMentions: { repliedUser: false }
    }).catch(() => {});

    // Groq cooldown ayarla
    groqCooldown.set(message.author.id, Date.now());
    
    console.log(`🤖 [AI Groq] ${message.author.tag}: "${soru}" → Groq cevapladı`);
    return true;
  }

  // 8) Groq da cevap veremezse - hata mesajı
  const hataMesaji = groqSonuc.error || "Anlamadım, bir hata oldu. Başka bir şekilde sorabilir misin?";
  
  await message.reply({
    content: hataMesaji,
    allowedMentions: { repliedUser: false }
  }).catch(() => {});

  console.log(`❌ [AI Hata] ${message.author.tag}: "${soru}" → ${groqSonuc.error}`);
  return true;
}

/**
 * "Öğren" butonu interaction handler
 */
async function learnButonIsle(interaction, client) {
  const customId = interaction.customId;
  if (!customId.startsWith("ai_learn_")) return false;

  try {
    const encoded = customId.replace("ai_learn_", "");
    const { soru, cevap } = JSON.parse(Buffer.from(encoded, 'base64').toString());
    
    await ogrenenCevapKaydet(interaction, soru, cevap);
    return true;
  } catch (e) {
    console.error("[AI Learn Button Error]:", e);
    await interaction.reply({ content: "❌ İşlem sırasında hata oluştu.", ephemeral: true }).catch(() => {});
    return true;
  }
}

/**
 * Öğren butonu ile cevabı veritabanına kaydet
 */
async function ogrenenCevapKaydet(interaction, soru, cevap) {
  try {
    const id = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    db.set(`ai_qa_${id}`, {
      soru: soru,
      cevap: cevap,
      kategori: "ai_learned",
      kaynak: "groq_learned",
      ekleyen: interaction.user.id,
      kullanim: 0,
      faydali: 0,
      created_at: Date.now()
    });
    
    // Matcher cache temizle
    try { matcher.cacheTemizle(); } catch {}
    
    await interaction.update({
      content: `✅ **Başarıyla öğrendim!** Bu soru-cevap çifti artık veritabanımda.\n\n**Soru:** ${soru}\n**Cevap:** ${cevap}`,
      components: [],
      embeds: []
    }).catch(() => {});
    
    console.log(`🧠 [AI Öğrenme] ${interaction.user.tag}: "${soru}" kaydedildi`);
    
  } catch (e) {
    console.error("[AI Öğrenme Hatası]:", e);
    await interaction.reply({ content: "❌ Kaydetme sırasında hata oluştu.", ephemeral: true }).catch(() => {});
  }
}

/** Yeni QA eklendiğinde cache temizle */
function cacheTemizle() {
  matcher.cacheTemizle();
}

module.exports = {
  aiIsle,
  learnButonIsle,
  cacheTemizle,
  AI_CONFIG,
  matcher
};