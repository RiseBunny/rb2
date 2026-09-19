/**
 * Multi-Provider AI Chain (round-robin fallback)
 * Sıra: Groq → SambaNova → NVIDIA NIM → Gemini → Cerebras → OpenRouter
 * Rate-limit (429) yiyeni atla, sonrakine geç. Hepsi 429 ise en başa dön.
 */
const fetch = require("node-fetch");

const PROVIDERS = [
  { name: "groq", key: "GROQ_API_KEY", url: "https://api.groq.com/openai/v1/chat/completions", model: "openai/gpt-oss-20b", type: "openai" },
  { name: "sambanova", key: "SAMBANOVA_API_KEY", url: "https://api.sambanova.ai/v1/chat/completions", model: "Meta-Llama-3.3-70B-Instruct", type: "openai" },
  { name: "nvidia", key: "NVIDIA_API_KEY", url: "https://integrate.api.nvidia.com/v1/chat/completions", model: "meta/llama-3.3-70b-instruct", type: "openai" },
  { name: "gemini", key: "GEMINI_API_KEY", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", type: "gemini", fallbackUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent" },
  { name: "cerebras", key: "CEREBRAS_API_KEY", url: "https://api.cerebras.ai/v1/chat/completions", model: "llama-3.3-70b", type: "openai" },
  { name: "openrouter", key: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/chat/completions", model: "meta-llama/llama-3.3-70b-instruct:free", type: "openai" },
];

// Round-robin başlangıç indeksi (global, sona gelince başa döner)
let startIndex = 0;

async function callOpenAI(p, systemPrompt, soru, apiKey) {
  const res = await fetch(p.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: p.model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: soru }],
      max_tokens: 300, temperature: 0.7, top_p: 0.9
    }),
    timeout: 15000
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, error: data.error?.message || `HTTP ${res.status}` };
  const cevap = data.choices?.[0]?.message?.content?.trim();
  if (!cevap) return { ok: false, status: 500, error: "empty" };
  return { ok: true, cevap };
}

async function callGeminiOnce(url, systemPrompt, soru, apiKey) {
  const res = await fetch(`${url}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
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

async function callGemini(p, systemPrompt, soru, apiKey) {
  const r = await callGeminiOnce(p.url, systemPrompt, soru, apiKey);
  if (r.ok || r.status !== 404 || !p.fallbackUrl) return r;
  console.warn(`[AI:gemini] birincil model 404, yedek deneniyor`);
  return callGeminiOnce(p.fallbackUrl, systemPrompt, soru, apiKey);
}

/**
 * Zincir: rate-limit yiyeni atla, sonrakine geç. Tur sonu başa dön.
 * @returns {Promise<{success, cevap?, provider?, error?, statusCode?}>}
 */
async function chainAsk(systemPrompt, soru, lang = "tr") {
  const isTr = lang !== "en";
  // Sıralı dene: startIndex'ten başla, tümünü bir tur dene
  const order = PROVIDERS.map((_, i) => PROVIDERS[(startIndex + i) % PROVIDERS.length]);
  let lastErr = null, lastStatus = 0, tried = [];

  for (const p of order) {
    const key = process.env[p.key];
    if (!key) continue; // API key yoksa atla
    tried.push(p.name);
    try {
      const r = p.type === "gemini"
        ? await callGemini(p, systemPrompt, soru, key)
        : await callOpenAI(p, systemPrompt, soru, key);
      if (r.ok) {
        // Bir sonrakini öne al (round-robin ilerle)
        startIndex = (PROVIDERS.indexOf(p) + 1) % PROVIDERS.length;
        return { success: true, cevap: r.cevap, provider: p.name };
      }
      lastErr = r.error; lastStatus = r.status;
      console.warn(`[AI:${p.name}] hata ${r.status}: ${r.error}`);
      if (r.status === 429) continue; // rate-limit → sonrakine geç
      if (r.status >= 500) continue;  // sunucu hatası → sonrakine geç
      continue; // diğer hatalarda da sonrakini dene
    } catch (e) {
      lastErr = e.message; lastStatus = 0;
      console.warn(`[AI:${p.name}] istek hatası:`, e.message);
      continue;
    }
  }

  // Hepsi denendi, hiçbiri çalışmadı → başa dön (sonraki çağrı en baştan dener)
  startIndex = 0;
  const msg = !tried.length
    ? (isTr ? "AI servisleri yapılandırılmamış (API key yok)." : "AI services not configured (no API key).")
    : lastStatus === 429
      ? (isTr ? "Şu an çok yoğunum, birazdan tekrar dener misin? 🐰" : "I'm busy right now, try again in a bit? 🐰")
      : (isTr ? "Bir hata oldu, tekrar dener misin? 🐰" : "An error occurred, try again? 🐰");
  return { success: false, error: msg, statusCode: lastStatus, groqError: lastErr };
}

module.exports = { chainAsk, PROVIDERS };
