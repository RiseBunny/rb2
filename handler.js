/**
 * AI Sohbet Sistemi - Ana İşleyici (croxydb + Groq fallback)
 * - "rise <metin>" tetikleyicisi
 * - Önce croxydb'de arar, yoksa Groq AI'ye sorar
 * - Groq cevabında "Öğren" butonu ekler
 * - Owner log entegrasyonu (hata, öğrenme, cevap veremezse)
 * - Cooldown sadece spam koruması için
 */

const SoruEslestirici = require("./matcher");
const { groqSor, formatEgitimVerileri, createOwnerLogError, createOwnerLogLearn, createOwnerLogNoAnswer, OWNER_ID } = require("./groq");
const db = require("croxydb");
const fs = require("fs");
const path = require("path");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getLangSync } = require("../dil");
const { ownerLog } = require("../utils");

// AI Matcher başlat (croxydb ile)
const matcher = new SoruEslestirici(db);

// Cooldown sadece spam koruması için (3 saniye)
const aiCooldown = new Map();
const COOLDOWN_MS = 3000;

// Groq istekleri için cooldown (kullanıcı başına 10 saniye)
const groqCooldown = new Map();
const GROQ_COOLDOWN_MS = 10000;

// Learn butonu için cache (base64 JSON yerine short ID kullan)
const learnCache = new Map();
const LEARN_CACHE_TTL = 10 * 60 * 1000; // 10 dakika

const AI_CONFIG = {
  TETIKLEYICI: "rise",
  KARAKTER_LIMITI: 4000,
  COOLDOWN_MS,
  DESTEK_SUNUCU_ID: "1192948403232067725",
  DESTEK_SUNUCU_LINK: "https://discord.gg/mEfz5SfpbR"
};

/**
 * Eğitim verilerini Groq system prompt için formatla
 * cevaplar.json'dan TÜM Q&A çiftlerini ve croxydb'deki öğrenilenleri birleştirir
 */
function egitimVerileriniHazirla() {
  try {
    const fs = require("fs");
    const path = require("path");
    const all = db.all() || {};
    const veriler = [];
    
    // 1. Croxydb'den öğrenilen veriler (ai_qa_*)
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith("ai_qa_") && value && value.soru && value.cevap) {
        veriler.push({
          soru: value.soru,
          cevap: value.cevap,
          kategori: value.kategori || "genel",
          kaynak: "learned"
        });
      }
    }
    
    // 2. cevaplar.json'dan TÜM sabit Q&A çiftlerini ekle
    try {
      const cevaplarPath = path.join(__dirname, "..", "cevaplar.json");
      const cevaplarData = JSON.parse(fs.readFileSync(cevaplarPath, "utf8"));
      
      for (const item of cevaplarData.cevaplar) {
        const kategori = item.kategori || "genel";
        for (const soru of item.sorular) {
          // Sadece Türkçe cevabı kullan (Groq diline göre çevirecek)
          veriler.push({
            soru: soru,
            cevap: item.cevap,
            kategori: kategori,
            kaynak: "builtin"
          });
        }
      }
    } catch (e) {
      console.warn("[AI] cevaplar.json okunamadı:", e.message);
    }
    
    // Kategorilere göre grupla, her kategori max 5 örnek (sabit + öğrenilen)
    const kategoriler = {};
    for (const v of veriler) {
      const kat = v.kategori || "genel";
      if (!kategoriler[kat]) kategoriler[kat] = [];
      if (kategoriler[kat].length < 5) {
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
 * Owner log'a AI hata/öğrenme/cevap veremezse log gönder
 */
async function ownerLogAI(client, logData) {
  try {
    const { createOwnerLogError, createOwnerLogLearn, createOwnerLogNoAnswer } = require("./groq");
    
    let logResult;
    if (logData.type === "error") {
      logResult = createOwnerLogError({
        soru: logData.soru,
        hata: logData.hata,
        guild: logData.guild,
        user: logData.user,
        lang: logData.lang
      });
    } else if (logData.type === "learn") {
      logResult = createOwnerLogLearn({
        soru: logData.soru,
        cevap: logData.cevap,
        guild: logData.guild,
        user: logData.user,
        lang: logData.lang,
        action: logData.action
      });
    } else if (logData.type === "no_answer") {
      logResult = createOwnerLogNoAnswer({
        soru: logData.soru,
        guild: logData.guild,
        user: logData.user,
        lang: logData.lang
      });
    }
    
    if (logResult) {
      await ownerLog(client, {
        content: logResult.content,
        embeds: logResult.embeds,
        components: logResult.components
      }).catch(() => {});
    }
  } catch (e) {
    console.error("[AI OwnerLog Hatası]:", e);
  }
}

/**
 * "Öğren" butonu ile cevabı veritabanına kaydet + owner log
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
    
    const lang = getLangSync(interaction.user.id);
    const isTr = lang === "tr";
    
    await interaction.update({
      content: (isTr ? "✅ **Başarıyla öğrendim!** Bu soru-cevap çifti artık veritabanımda.\n\n" : "✅ **Successfully learned!** This Q&A is now in my database.\n\n") +
        `**${isTr ? "Soru" : "Question"}:** ${soru}\n**${isTr ? "Cevap" : "Answer"}:** ${cevap}`,
      components: [],
      embeds: []
    }).catch(() => {});
    
    console.log(`🧠 [AI Öğrenme] ${interaction.user.tag}: "${soru}" kaydedildi`);
    
    // Owner log'a öğrenme kaydı gönder
    await ownerLogAI(interaction.client, {
      type: "learn",
      soru: soru,
      cevap: cevap,
      guild: interaction.guild,
      user: interaction.user,
      lang: lang,
      action: "learned"
    });
    
  } catch (e) {
    console.error("[AI Öğrenme Hatası]:", e);
    const lang = getLangSync(interaction.user.id);
    await interaction.reply({ content: lang === "tr" ? "❌ Kaydetme sırasında hata oluştu." : "❌ An error occurred while saving.", ephemeral: true }).catch(() => {});
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

  // 1) "rise" ile başlıyor mu? (büyük/küçük harf duyarsız) - "rise" veya "rise " kabul et
  const lowerContent = icerik.toLowerCase();
  if (!lowerContent.startsWith("rise")) return false;

  // 2) Kullanıcının sorusunu al - "rise" (4 karakter) veya "rise " (5 karakter)
  const tetikleyiciUzunluk = lowerContent.startsWith("rise ") ? 5 : 4;
  const soru = icerik.slice(tetikleyiciUzunluk).trim();

  // 3) Soru boşsa - karşılama mesajı
  if (!soru) {
    const lang = getLangSync(message.author.id);
    const isTr = lang === "tr";
    await message.reply({
      content: (isTr ? `Merhaba ${message.author}! 👋 Bana bir şey sormak ister misin?\nÖrn: \`rise nasılsın\`, \`rise premium ne işe yarar\`` : `Hello ${message.author}! 👋 Want to ask me something?\nEx: \`rise how are you\`, \`rise what is premium\``),
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }

  // 3) Karakter limiti kontrolü
  if (soru.length > 4000) {
    const lang = getLangSync(message.author.id);
    await message.reply({
      content: (lang === "tr" ? `⚠️ Sorun çok uzun! En fazla **4000 karakter** olabilir.` : `⚠️ Your question is too long! Max **4000 characters**.`),
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }

  // 4) Cooldown kontrolü (sadece spam koruması - 3 sn)
  const now = Date.now();
  const sonKullanim = aiCooldown.get(message.author.id) || 0;
  if (now - sonKullanim < COOLDOWN_MS) {
    const kalan = Math.ceil((COOLDOWN_MS - (now - sonKullanim)) / 1000);
    const lang = getLangSync(message.author.id);
    await message.reply({
      content: (lang === "tr" ? `⏳ Lütfen **${kalan} saniye** bekle.` : `⏳ Please wait **${kalan} seconds**.`),
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
      const lang = getLangSync(message.author.id);
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

    // "yazıyor..." etkisi
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
    const lang = getLangSync(message.author.id);
    await message.reply({
      content: (lang === "tr" ? `⏳ AI şu an meşgul, **${Math.ceil(groqCooldownKalan / 1000)} saniye** sonra tekrar dene.` : `⏳ AI is busy, try again in **${Math.ceil(groqCooldownKalan / 1000)} seconds**.`),
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }
  
  groqCooldown.set(message.author.id, now);

  // Eğitim verilerini Groq'ya göndermek için hazırla
  const egitimVerileri = egitimVerileriniHazirla();
  
  // "Yazıyor..." etkisi
  await message.channel.sendTyping().catch(() => {});
  
  // Çoklu sağlayıcı zincirine sor (rate-limit yiyeni atla, sona gelince başa dön)
  const { chainAsk } = require("./providers");
  const { buildSystemPrompt } = require("./groq");
  const lang = getLangSync(message.author.id);
  const groqSonuc = await chainAsk(buildSystemPrompt(egitimVerileriniHazirla(), lang), soru, lang);

  if (groqSonuc.success) {
    const cevap = groqSonuc.cevap;
    
    // Learn butonu için short ID oluştur (base64 JSON yerine short ID)
    const learnId = `learn_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
    learnCache.set(learnId, { soru, cevap });
    setTimeout(() => learnCache.delete(learnId), LEARN_CACHE_TTL);
    
    // Buton etiketi kullanıcının diline göre
    const lang = getLangSync(message.author.id);
    const isTr = lang === "tr";
    
    // "RiseBunny'ye öğret" butonu oluştur
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ai_learn_${learnId}`)
        .setLabel(isTr ? "🧠 RiseBunny'ye öğret" : "🧠 Teach RiseBunny")
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

  // 8) Groq da cevap veremezse - hata mesajı + owner log
  const hataMesaji = groqSonuc.error || (lang === "tr" ? "Anlamadım, bir hata oldu. Başka bir şekilde sorabilir misin?" : "I didn't understand, an error occurred. Can you rephrase?");
  
  await message.reply({
    content: hataMesaji,
    allowedMentions: { repliedUser: false }
  }).catch(() => {});

  console.log(`❌ [AI Hata] ${message.author.tag}: "${soru}" → ${groqSonuc.error}`);
  
  // Owner log'a hata gönder
  await ownerLogAI(client, {
    type: "error",
    soru: soru,
    hata: groqSonuc.error || "Groq yanıt veremedi",
    guild: message.guild,
    user: message.author,
    lang: lang
  });
  
  return true;
}

/**
 * "Öğren" butonu interaction handler
 */
async function learnButonIsle(interaction, client) {
  const customId = interaction.customId;
  if (!customId.startsWith("ai_learn_")) return false;

  try {
    const learnId = customId.replace("ai_learn_", "");
    const data = learnCache.get(learnId);
    
    if (!data) {
      const lang = getLangSync(interaction.user.id);
      await interaction.reply({ 
        content: lang === "tr" ? "❌ Bu öğretme isteğinin süresi doldu. Lütfen tekrar deneyin." : "❌ This teach request has expired. Please try again.", 
        ephemeral: true 
      }).catch(() => {});
      return true;
    }
    
    const { soru, cevap } = data;
    learnCache.delete(learnId); // Tek kullanımlık
    
    await ogrenenCevapKaydet(interaction, soru, cevap);
    return true;
  } catch (e) {
    console.error("[AI Learn Button Error]:", e);
    const lang = getLangSync(interaction.user.id);
    await interaction.reply({ content: lang === "tr" ? "❌ İşlem sırasında hata oluştu." : "❌ An error occurred during the operation.", ephemeral: true }).catch(() => {});
    return true;
  }
}

/**
 * Owner butonları handler (kaydet/sil/öğret)
 */
async function ownerButonIsle(interaction, client) {
  const customId = interaction.customId;
  
  // Owner AI kaydet butonu
  if (customId.startsWith("owner_ai_save_")) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: "❌ Bu butonu sadece sahibim kullanabilir.", ephemeral: true }).catch(() => {});
    }
    
    try {
      const encoded = customId.replace("owner_ai_save_", "");
      const { soru, cevap } = JSON.parse(Buffer.from(encoded, 'base64').toString());
      
      const id = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      db.set(`ai_qa_${id}`, {
        soru: soru,
        cevap: cevap,
        kategori: "owner_saved",
        kaynak: "owner_approved",
        ekleyen: OWNER_ID,
        kullanim: 0,
        faydali: 0,
        created_at: Date.now()
      });
      
      try { matcher.cacheTemizle(); } catch {}
      
      const lang = getLangSync(interaction.user.id);
      const isTr = lang === "tr";
      
      await interaction.update({
        content: (isTr ? `✅ **Sahip onayıyla kaydedildi!** Bu soru-cevap artık veritabanında.\n\n` : `✅ **Saved with owner approval!** This Q&A is now in the database.\n\n`) +
          `**${isTr ? "Soru" : "Question"}:** ${soru}\n**${isTr ? "Cevap" : "Answer"}:** ${cevap}`,
        components: [],
        embeds: []
      }).catch(() => {});
      
      console.log(`👑 [Owner AI Save] ${interaction.user.tag}: "${soru}" kaydedildi`);
      
    } catch (e) {
      console.error("[Owner AI Save Error]:", e);
      const lang = getLangSync(interaction.user.id);
      await interaction.reply({ content: lang === "tr" ? "❌ Kaydetme sırasında hata oluştu." : "❌ An error occurred while saving.", ephemeral: true }).catch(() => {});
    }
    return true;
  }
  
  // Owner AI sil butonu
  if (customId.startsWith("owner_ai_delete_")) {
    if (interaction.user.id !== OWNER_ID) {
      const lang = getLangSync(interaction.user.id);
      return interaction.reply({ content: lang === "tr" ? "❌ Bu butonu sadece sahibim kullanabilir." : "❌ Only my owner can use this button.", ephemeral: true }).catch(() => {});
    }
    
    try {
      const encoded = customId.replace("owner_ai_delete_", "");
      const { soru } = JSON.parse(Buffer.from(encoded, 'base64').toString());
      
      // Soruya benzer kayıtları bul ve sil
      const all = db.all() || {};
      let silinen = 0;
      for (const [key, value] of Object.entries(all)) {
        if (key.startsWith("ai_qa_") && value && value.soru && value.soru.toLowerCase().includes(soru.toLowerCase().slice(0, 50))) {
          db.delete(key);
          silinen++;
        }
      }
      
      try { matcher.cacheTemizle(); } catch {}
      
      const lang = getLangSync(interaction.user.id);
      const isTr = lang === "tr";
      
      await interaction.update({
        content: (isTr ? `🗑️ **Silindi!** "${soru}" ile ilgili ${silinen} kayıt veritabanından kaldırıldı.` : `🗑️ **Deleted!** Removed ${silinen} records related to "${soru}".`),
        components: [],
        embeds: []
      }).catch(() => {});
      
      console.log(`🗑️ [Owner AI Delete] ${interaction.user.tag}: "${soru}" silindi (${silinen} kayıt)`);
      
    } catch (e) {
      console.error("[Owner AI Delete Error]:", e);
      const lang = getLangSync(interaction.user.id);
      await interaction.reply({ content: lang === "tr" ? "❌ Silme sırasında hata oluştu." : "❌ An error occurred while deleting.", ephemeral: true }).catch(() => {});
    }
    return true;
  }
  
  // Owner AI öğret butonu (cevap veremediğinde)
  if (customId.startsWith("owner_ai_teach_")) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: "❌ Bu butonu sadece sahibim kullanabilir.", ephemeral: true }).catch(() => {});
    }
    
    // Modal açarak sahibin cevap yazmasını sağla
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
    const encoded = customId.replace("owner_ai_teach_", "");
    const { soru } = JSON.parse(Buffer.from(encoded, 'base64').toString());
    
    const modal = new ModalBuilder()
      .setCustomId(`owner_ai_teach_modal_${Buffer.from(JSON.stringify({soru})).toString('base64').slice(0, 80)}`)
      .setTitle("🧠 AI'ya Cevap Öğret");
    
    const input = new TextInputBuilder()
      .setCustomId("owner_ai_cevap")
      .setLabel("Cevabı Yaz")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Buraya AI'ın vermesi gereken cevabı yazın...")
      .setRequired(true)
      .setMaxLength(2000);
    
    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);
    
    await interaction.showModal(modal).catch(() => {});
    return true;
  }
  
  return false;
}

/**
 * Modal handler for owner teach
 */
async function ownerModalIsle(interaction, client) {
  const customId = interaction.customId;
  
  if (customId.startsWith("owner_ai_teach_modal_")) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: "❌ Bu işlemi sadece sahibim yapabilir.", ephemeral: true }).catch(() => {});
    }
    
    try {
      const encoded = customId.replace("owner_ai_teach_modal_", "");
      const { soru } = JSON.parse(Buffer.from(encoded, 'base64').toString());
      const cevap = interaction.fields.getTextInputValue("owner_ai_cevap");
      
      const id = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      db.set(`ai_qa_${id}`, {
        soru: soru,
        cevap: cevap,
        kategori: "owner_taught",
        kaynak: "owner_taught",
        ekleyen: OWNER_ID,
        kullanim: 0,
        faydali: 0,
        created_at: Date.now()
      });
      
      try { matcher.cacheTemizle(); } catch {}
      
      const lang = getLangSync(interaction.user.id);
      const isTr = lang === "tr";
      
      await interaction.reply({
        content: (isTr ? `✅ **Sahip tarafından öğretildi!** Bu soru-cevap artık veritabanında.\n\n` : `✅ **Taught by owner!** This Q&A is now in the database.\n\n`) +
          `**${isTr ? "Soru" : "Question"}:** ${soru}\n**${isTr ? "Cevap" : "Answer"}:** ${cevap}`,
        ephemeral: true
      }).catch(() => {});
      
      // Owner log
      await ownerLogAI(client, {
        type: "learn",
        soru: soru,
        cevap: cevap,
        guild: interaction.guild,
        user: interaction.user,
        lang: lang,
        action: "owner_taught"
      });
      
      console.log(`👑 [Owner AI Teach] ${interaction.user.tag}: "${soru}" öğretildi`);
      
    } catch (e) {
      console.error("[Owner AI Teach Modal Error]:", e);
      const lang = getLangSync(interaction.user.id);
      await interaction.reply({ content: lang === "tr" ? "❌ Öğretme sırasında hata oluştu." : "❌ An error occurred while teaching.", ephemeral: true }).catch(() => {});
    }
    return true;
  }
  
  return false;
}

/**
 * Owner log'a AI hata/öğrenme/cevap veremezse log gönder
 */
async function ownerLogAI(client, logData) {
  try {
    const { createOwnerLogError, createOwnerLogLearn, createOwnerLogNoAnswer } = require("./groq");
    
    let logResult;
    if (logData.type === "error") {
      logResult = require("./groq").createOwnerLogError({
        soru: logData.soru,
        hata: logData.hata,
        guild: logData.guild,
        user: logData.user,
        lang: logData.lang
      });
    } else if (logData.type === "learn") {
      logResult = require("./groq").createOwnerLogLearn({
        soru: logData.soru,
        cevap: logData.cevap,
        guild: logData.guild,
        user: logData.user,
        lang: logData.lang,
        action: logData.action
      });
    } else if (logData.type === "no_answer") {
      logResult = require("./groq").createOwnerLogNoAnswer({
        soru: logData.soru,
        guild: logData.guild,
        user: logData.user,
        lang: logData.lang
      });
    }
    
    if (logResult) {
      await ownerLog(client, {
        content: logResult.content,
        embeds: logResult.embeds,
        components: logResult.components
      }).catch(() => {});
    }
  } catch (e) {
    console.error("[AI OwnerLog Hatası]:", e);
  }
}

/** Yeni QA eklendiğinde cache temizle */
function cacheTemizle() {
  matcher.cacheTemizle();
}

module.exports = {
  aiIsle,
  learnButonIsle,
  ownerButonIsle,
  ownerModalIsle,
  cacheTemizle,
  AI_CONFIG,
  matcher,
  learnCache
};