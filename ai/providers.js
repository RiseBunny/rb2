/**
 * Multi-Provider AI Chain (round-robin fallback)
 * Sıra: Groq → NVIDIA NIM → Gemini → Cerebras → OpenRouter → Custom AI (Render)
 */
const fetch = require("node-fetch");

// NVIDIA NIM Güncel Modeller
const NVIDIA_MODELS = [
  "meta/llama-3.1-70b-instruct",
  "nvidia/nemotron-4-340b-instruct"
];

// OpenRouter Güncel 2026 Çalışan Ücretsiz (:free) Modeller
const OPENROUTER_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "google/gemma-2-9b-it:free"
];

const PROVIDERS = [
  { name: "groq", key: "GROQ_API_KEY", url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.1-8b-instant", type: "openai" },
  { name: "nvidia", key: "NVIDIA_API_KEY", url: "https://integrate.api.nvidia.com/v1/chat/completions", models: NVIDIA_MODELS, modelIndex: 0, type: "openai" },
  { name: "gemini", key: "GEMINI_API_KEY", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", type: "gemini" },
  { name: "cerebras", key: "CEREBRAS_API_KEY", url: "https://api.cerebras.ai/v1/chat/completions", model: "llama3.1-8b", type: "openai" },
  { name: "openrouter", key: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/chat/completions", models: OPENROUTER_MODELS, modelIndex: 0, type: "openai" },
  { name: "custom", key: "CUSTOM_AI_API_KEY", url: "https://apiai-kfal.onrender.com/chat", type: "custom" },
];

let startIndex = 0;

async function callOpenAI(p, systemPrompt, soru, apiKey) {
  const maxSystemChars = 12000;
  let finalSystemPrompt = systemPrompt || "";
  if (finalSystemPrompt.length > maxSystemChars) {
    finalSystemPrompt = finalSystemPrompt.slice(0, maxSystemChars) + "\n\n[Not: Sistem promptu kısaltıldı]";
  }
  
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };
  
  const res = await fetch(p.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: p.model,
      messages: [{ role: "system", content: finalSystemPrompt }, { role: "user", content: soru }],
      max_tokens: 250,
      temperature: 0.7
    }),
    timeout: 15000
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, error: data.error?.message || `HTTP ${res.status}` };
  const cevap = data.choices?.[0]?.message?.content?.trim();
  if (!cevap) return { ok: false, status: 500, error: "empty" };
  return { ok: true, cevap };
}

async function callCustom(p, systemPrompt, soru, apiKey) {
  try {
    const res = await fetch(p.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        prompt: systemPrompt ? `${systemPrompt}\n\n${soru}` : soru
      }),
      timeout: 30000
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: data.error || `HTTP ${res.status}` };
    
    const cevap = data.response;
    if (!cevap) return { ok: false, status: 500, error: "empty" };
    return { ok: true, cevap };
  } catch (err) {
    return { ok: false, status: 504, error: err.message };
  }
}

async function callGemini(p, systemPrompt, soru, apiKey) {
  const url = `${p.url}?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents: [{ parts: [{ text: soru }] }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
    }),
    timeout: 15000
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, error: data.error?.message || `HTTP ${res.status}` };
  const cevap = data.candidates?.[0]?.content?.parts?.map(x => x.text || "").join("").trim();
  if (!cevap) return { ok: false, status: 500, error: "empty" };
  return { ok: true, cevap };
}

async function callNvidiaOrOpenRouter(p, systemPrompt, soru, apiKey) {
  const models = p.models || [];
  let lastErr = "no-model", lastStatus = 0;
  
  for (let i = 0; i < models.length; i++) {
    const model = models[(p.modelIndex + i) % models.length];
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model,
          messages: systemPrompt 
            ? [{ role: "system", content: systemPrompt }, { role: "user", content: soru }]
            : [{ role: "user", content: soru }],
          max_tokens: 250,
          temperature: 0.7
        }),
        timeout: 15000
      });
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastErr = data.error?.message || `HTTP ${res.status}`;
        lastStatus = res.status;
        console.warn(`[AI:${p.name}] ${model} → ${res.status}, sıradakine geçiliyor...`);
        continue;
      }
      
      const cevap = data.choices?.[0]?.message?.content?.trim();
      if (!cevap) {
        lastErr = "empty"; lastStatus = 500;
        console.warn(`[AI:${p.name}] ${model} → boş cevap, sıradakine geçiliyor...`);
        continue;
      }
      
      p.modelIndex = (models.indexOf(model) + 1) % models.length;
      return { ok: true, cevap, model };
    } catch (e) {
      lastErr = e.message; lastStatus = 0;
      console.warn(`[AI:${p.name}] ${model} hata verdi, sıradakine geçiliyor...`);
      continue;
    }
  }
  return { ok: false, status: lastStatus, error: lastErr };
}

/**
 * Ana AI Çağrı Fonksiyonu
 */
async function chainAsk(systemPrompt, soru, lang = "tr") {
  const isTr = lang !== "en";
  const order = PROVIDERS.map((_, i) => PROVIDERS[(startIndex + i) % PROVIDERS.length]);
  let lastErr = null, lastStatus = 0, tried = [];

  for (const p of order) {
    const key = process.env[p.key];
    if (!key) continue;
    tried.push(p.name);
    try {
      let r;
      if (p.type === "gemini") {
        r = await callGemini(p, systemPrompt, soru, key);
      } else if (p.type === "custom") {
        r = await callCustom(p, systemPrompt, soru, key);
      } else if (p.models) {
        r = await callNvidiaOrOpenRouter(p, systemPrompt, soru, key);
      } else {
        r = await callOpenAI(p, systemPrompt, soru, key);
      }

      if (r.ok) {
        startIndex = (PROVIDERS.indexOf(p) + 1) % PROVIDERS.length;
        return { success: true, cevap: r.cevap, provider: p.name + (r.model ? `/${r.model}` : "") };
      }
      
      lastErr = r.error; 
      lastStatus = r.status;
      console.warn(`[AI:${p.name}] hata ${r.status}: ${r.error}`);
      continue;
    } catch (e) {
      lastErr = e.message; 
      lastStatus = 0;
      console.warn(`[AI:${p.name}] istek hatası:`, e.message);
      continue;
    }
  }

  startIndex = 0;
  const msg = !tried.length
    ? (isTr ? "AI servisleri yapılandırılmamış (API key yok)." : "AI services not configured (no API key).")
    : (isTr ? "Şu an yanıt veremiyorum, lütfen birazdan tekrar dene. 🐰" : "An error occurred, try again later. 🐰");
  
  return { success: false, error: msg, statusCode: lastStatus, groqError: lastErr };
}

module.exports = { chainAsk, PROVIDERS };
