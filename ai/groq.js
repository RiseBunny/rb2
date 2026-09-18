/**
 * Groq AI Client - Llama 3.1 8B Model
 * RiseBunny Discord Bot için AI sohbet sistemi
 */

const fetch = require("node-fetch");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

/**
 * System prompt - RiseBunny bot bilgileri ve davranış kuralları
 * Eğitim verileri (cevaplar.json) buraya dinamik eklenir
 */
function buildSystemPrompt(egitimVerileri = "") {
  const basePrompt = `Sen RiseBunny adında yardımsever bir Discord botusun.
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

ÖNEMLİ: Cevap verirken yukarıdaki eğitim verilerini referans al. Eğer soru eğitim verilerinde varsa oradaki cevabı baz al.`;

  return basePrompt;
}

/**
 * Groq API'ye istek gönder
 * @param {string} soru - Kullanıcı sorusu
 * @param {string} egitimVerileri - Eğitim verileri (opsiyonel)
 * @returns {Promise<{success: boolean, cevap?: string, error?: string, statusCode?: number}>}
 */
async function groqSor(soru, egitimVerileri = "") {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error("[Groq] GROQ_API_KEY ortam değişkeni ayarlanmamış!");
    return { success: false, error: "API key eksik", statusCode: 500 };
  }

  const systemPrompt = buildSystemPrompt(egitimVerileri);
  
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: soru }
        ],
        max_tokens: 300,
        temperature: 0.7,
        top_p: 0.9
      }),
      timeout: 15000 // 15 saniye timeout
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || "Bilinmeyen hata";
      console.error(`[Groq] Hata ${response.status}:`, errorMsg);
      
      // Hata türüne göre kullanıcı dostu mesaj
      let userMessage;
      if (response.status === 429) {
        userMessage = "Şu an çok yoğunum, birazdan tekrar dener misin? 🐰";
      } else if (response.status >= 500) {
        userMessage = "Bir hata oldu, tekrar dener misin? 🐰";
      } else {
        userMessage = "Anlamadım, bir hata oldu. Başka bir şekilde sorabilir misin?";
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
      return { success: false, error: "Boş cevap alındı", statusCode: 500 };
    }

    return { success: true, cevap };

  } catch (err) {
    console.error("[Groq] İstek hatası:", err.message);
    
    let userMessage = "Anlamadım, bir hata oldu. Başka bir şekilde sorabilir misin?";
    
    if (err.name === "AbortError" || err.code === "ETIMEDOUT" || err.message.includes("timeout")) {
      userMessage = "Cevap alma süresi aştı, tekrar dener misin? 🐰";
    } else if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
      userMessage = "AI servisine bağlanılamıyor, tekrar dener misin? 🐰";
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
  
  // Kategorilere göre grupla
  const kategoriler = {};
  for (const v of veriler) {
    const kat = v.kategori || "genel";
    if (!kategoriler[kat]) kategoriler[kat] = [];
    kategoriler[kat].push(v);
  }
  
  let output = "";
  for (const [kat, liste] of Object.entries(kategoriler)) {
    output += `\n## ${kat.toUpperCase()}\n`;
    for (const item of liste.slice(0, 5)) { // Her kategori max 5 örnek
      output += `Q: ${item.soru}\nA: ${item.cevap}\n\n`;
    }
  }
  
  return output;
}

module.exports = {
  groqSor,
  buildSystemPrompt,
  formatEgitimVerileri,
  MODEL
};