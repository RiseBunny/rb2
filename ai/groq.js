/**
 * Groq AI Client - GPT-OSS 20B Model
 * RiseBunny Discord Bot için AI sohbet sistemi
 */

const fetch = require("node-fetch");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const OWNER_ID = "985126554306773063";

/**
 * System prompt - RiseBunny bot bilgileri ve davranış kuralları
 * Eğitim verileri (cevaplar.json) buraya dinamik eklenir
 * @param {string} egitimVerileri - Eğitim verileri
 * @param {string} lang - Dil kodu (tr/en)
 * @returns {string}
 */
function buildSystemPrompt(egitimVerileri = "", lang = "tr") {
  const prompts = {
    tr: `Sen RiseBunny adında yardımsever bir Discord botusun.
RiseBunny ekibi (ahmetbs) tarafından 2023'ten beri geliştiriliyorsun.
Türkçe sorulara Türkçe, İngilizce sorulara İngilizce cevap ver.
Cevapların KISA olsun (en fazla 2-3 cümle).
Samimi, yardımsever ve emoji kullanabilirsin.
Emin olmadığın konularda "bilmiyorum" de, uydurma.
Küfür, hakaret, yasadışı içerik üretme.

Bot Bilgileri:
- 150+ komutun var, prefix: r!
- Moderasyon, ekonomi, eğlence, koruma sistemlerin var
- Web sitesi: https://risebunny.vercel.app
- Destek sunucusu: https://discord.gg/mEfz5SfpbR
- Minecraft client (Rubidium V4) projen de var

${egitimVerileri ? `Eğitim Verilerin (Kullanıcı sorular ve cevaplar):\n${egitimVerileri}\n` : ""}

ÖNEMLİ: Cevap verirken yukarıdaki eğitim verilerini referans al. Eğer soru eğitim verilerinde varsa oradaki cevabı baz al.`,

    en: `You are RiseBunny, a helpful Discord bot.
Developed by the RiseBunny team (ahmetbs) since 2023.
Answer Turkish questions in Turkish, English questions in English.
Keep responses SHORT (max 2-3 sentences).
Be friendly, helpful, and use emojis.
Say "I don't know" when unsure, don't make things up.
No profanity, harassment, or illegal content.

Bot Info:
- 150+ commands, prefix: r!
- Moderation, economy, fun, protection systems
- Website: https://risebunny.vercel.app
- Support server: https://discord.gg/mEfz5SfpbR
- Minecraft client (Rubidium V4) project too

${egitimVerileri ? `Training Data (User questions and answers):\n${egitimVerileri}\n` : ""}

IMPORTANT: Reference the training data above when answering. If the question exists in training data, base your answer on that.`
  };

  return prompts[lang] || prompts.tr;
}

/**
 * Groq API'ye istek gönder
 * @param {string} soru - Kullanıcı sorusu
 * @param {string} egitimVerileri - Eğitim verileri (opsiyonel)
 * @param {string} lang - Dil kodu (tr/en)
 * @returns {Promise<{success: boolean, cevap?: string, error?: string, statusCode?: number}>}
 */
async function groqSor(soru, egitimVerileri = "", lang = "tr") {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error("[Groq] GROQ_API_KEY ortam değişkeni ayarlanmamış!");
    return { success: false, error: "API key eksik", statusCode: 500 };
  }

  const systemPrompt = buildSystemPrompt(egitimVerileri, lang);
  
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: soru }
        ],
        max_tokens: 300,
        temperature: 0.7,
        top_p: 0.9
      }),
      timeout: 15000
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || "Unknown error";
      console.error(`[Groq] Error ${response.status}:`, errorMsg);
      
      let userMessage;
      if (response.status === 429) {
        userMessage = lang === "en" ? "I'm busy right now, try again in a bit? 🐰" : "Şu an çok yoğunum, birazdan tekrar dener misin? 🐰";
      } else if (response.status >= 500) {
        userMessage = lang === "en" ? "An error occurred, try again? 🐰" : "Bir hata oldu, tekrar dener misin? 🐰";
      } else {
        userMessage = lang === "en" ? "I didn't understand, an error occurred. Can you rephrase?" : "Anlamadım, bir hata oldu. Başka bir şekilde sorabilir misin?";
      }
      
      return { 
        success: false, 
        error: userMessage, 
        statusCode: response.status,
        groqError: errorMsg
      };
    }

    const cevap = data.choices?.[0]?.message?.content?.trim();
    
    if (!cevap) {
      return { success: false, error: "Empty response received", statusCode: 500 };
    }

    return { success: true, cevap };

  } catch (err) {
    console.error("[Groq] Request error:", err.message);
    
    let userMessage = lang === "en" ? "I didn't understand, an error occurred. Can you rephrase?" : "Anlamadım, bir hata oldu. Başka bir şekilde sorabilir misin?";
    
    if (err.name === "AbortError" || err.code === "ETIMEDOUT" || err.message.includes("timeout")) {
      userMessage = lang === "en" ? "Response timed out, try again? 🐰" : "Cevap alma süresi aştı, tekrar dener misin? 🐰";
    } else if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
      userMessage = lang === "en" ? "Cannot connect to AI service, try again? 🐰" : "AI servisine bağlanılamıyor, tekrar dener misin? 🐰";
    }
    
    return { success: false, error: userMessage, statusCode: 0, originalError: err.message };
  }
}

/**
 * Eğitim verilerini system prompt formatında hazırla
 * @param {Array} veriler - [{soru, cevap, kategori}] formatında
 * @returns {string}
 */
function formatEgitimVerileri(veriler) {
  if (!veriler || !veriler.length) return "";
  
  const kategoriler = {};
  for (const v of veriler) {
    const kat = v.kategori || "genel";
    if (!kategoriler[kat]) kategoriler[kat] = [];
    kategoriler[kat].push(v);
  }
  
  let output = "";
  for (const [kat, liste] of Object.entries(kategoriler)) {
    output += `\n## ${kat.toUpperCase()}\n`;
    for (const item of liste.slice(0, 5)) {
      output += `Q: ${item.soru}\nA: ${item.cevap}\n\n`;
    }
  }
  
  return output;
}

/**
 * Owner log için hata mesajı oluştur
 * @param {Object} params - {soru, hata, guild, user, lang}
 * @returns {Object} embed ve components
 */
function createOwnerLogError(params) {
  const { soru, hata, guild, user, lang = "tr" } = params;
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
  
  const isTr = lang === "tr";
  const ownerId = "985126554306773063";
  
  const embed = new EmbedBuilder()
    .setColor("Red")
    .setTitle(isTr ? "🤖 AI Hata Raporu" : "🤖 AI Error Report")
    .setDescription(isTr 
      ? `**<@${OWNER_ID}> AI hata ile karşılaştı!**` 
      : `**<@${OWNER_ID}> AI encountered an error!**`)
    .addFields(
      { name: isTr ? "🏠 Sunucu" : "🏠 Server", value: guild ? `${guild.name} (${guild.id})` : (isTr ? "DM" : "DM"), inline: true },
      { name: isTr ? "👤 Kullanıcı" : "👤 User", value: `${user.tag} (${user.id})`, inline: true },
      { name: isTr ? "❓ Soru" : "❓ Question", value: soru.slice(0, 1000), inline: false },
      { name: isTr ? "❌ Hata" : "❌ Error", value: hata.slice(0, 1000), inline: false }
    )
    .setFooter({ text: `RiseBunny AI • ${new Date().toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ai_error_dismiss")
      .setLabel(isTr ? "✅ Anlaşıldı" : "✅ Dismissed")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row], content: `<@${ownerId}>` };
}

/**
 * Owner log için öğrenme kaydı
 * @param {Object} params - {soru, cevap, guild, user, lang, action}
 * @returns {Object} embed ve components
 */
function createOwnerLogLearn(params) {
  const { soru, cevap, guild, user, lang = "tr", action = "learned" } = params;
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
  
  const isTr = lang === "tr";
  const ownerId = "985126554306773063";
  
  const actionText = isTr ? "öğretti" : "taught";
  const actionEmoji = "🧠";
  
  const embed = new EmbedBuilder()
    .setColor("Gold")
    .setTitle(`${actionEmoji} ${isTr ? "AI Öğrenme Kaydı" : "AI Learning Log"}`)
    .setDescription(isTr 
      ? `**<@985126554306773063>** Kullanıcı **${user.tag}** (${user.id}) AI'ya bir şeyler **${actionText}**!`
      : `**<@985126554306773063>** User **${user.tag}** (${user.id}) **${actionText}** AI something!`)
    .addFields(
      { name: isTr ? "🏠 Sunucu" : "🏠 Server", value: guild ? `${guild.name} (${guild.id})` : (isTr ? "DM" : "DM"), inline: true },
      { name: isTr ? "👤 Kullanıcı" : "👤 User", value: `${user.tag} (${user.id})`, inline: true },
      { name: isTr ? "❓ Soru" : "❓ Question", value: soru.slice(0, 1000), inline: false },
      { name: isTr ? "💡 Cevap" : "💡 Answer", value: cevap.slice(0, 1000), inline: false }
    )
    .setFooter({ text: `RiseBunny AI • ${new Date().toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`owner_ai_save_${Buffer.from(JSON.stringify({soru, cevap})).toString('base64').slice(0, 80)}`)
      .setLabel(isTr ? "💾 Kaydet" : "💾 Save")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`owner_ai_delete_${Buffer.from(JSON.stringify({soru})).toString('base64').slice(0, 80)}`)
      .setLabel(isTr ? "🗑️ Sil" : "🗑️ Delete")
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row], content: `<@${ownerId}>` };
}

/**
 * Owner log için cevap verilemediğinde
 * @param {Object} params - {soru, guild, user, lang}
 * @returns {Object} embed ve components
 */
function createOwnerLogNoAnswer(params) {
  const { soru, guild, user, lang = "tr" } = params;
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
  
  const isTr = lang === "tr";
  const ownerId = "985126554306773063";
  
  const embed = new EmbedBuilder()
    .setColor("Orange")
    .setTitle(isTr ? "🤖 AI Cevap Veremedi" : "🤖 AI Could Not Answer")
    .setDescription(isTr 
      ? `**<@${ownerId}>** Kullanıcı **${user.tag}** (${user.id}) sordu ama AI cevap veremedi.`
      : `**<@${ownerId}>** User **${user.tag}** (${user.id}) asked but AI couldn't answer.`)
    .addFields(
      { name: isTr ? "🏠 Sunucu" : "🏠 Server", value: guild ? `${guild.name} (${guild.id})` : (isTr ? "DM" : "DM"), inline: true },
      { name: isTr ? "👤 Kullanıcı" : "👤 User", value: `${user.tag} (${user.id})`, inline: true },
      { name: isTr ? "❓ Soru" : "❓ Question", value: soru.slice(0, 1000), inline: false }
    )
    .setFooter({ text: `RiseBunny AI • ${new Date().toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`owner_ai_teach_${Buffer.from(JSON.stringify({soru})).toString('base64').slice(0, 80)}`)
      .setLabel(isTr ? "🧠 Öğret" : "🧠 Teach")
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row], content: `<@${OWNER_ID}>` };
}

module.exports = {
  groqSor,
  buildSystemPrompt,
  formatEgitimVerileri,
  createOwnerLogError,
  createOwnerLogLearn,
  createOwnerLogNoAnswer,
  OWNER_ID
};