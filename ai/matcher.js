/**
 * AI Cevap Eşleştirici - croxydb tabanlı
 * - Veritabanından soru-cevap çiftlerini yükler
 * - Levenshtein + Jaccard + İçerme bonusu ile en iyi eşleşmeyi bulur
 */
const { normalize, preprocess, jaccardSimilarity } = require("./tokenizer");

function levenshtein(a, b) {
  if (!a || !b) return Infinity;
  a = normalize(a);
  b = normalize(b);
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, () =>
    Array(a.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function similarity(text1, text2) {
  if (!text1 || !text2) return 0;

  const norm1 = normalize(text1);
  const norm2 = normalize(text2);

  if (norm1 === norm2) return 1.0;

  const maxLen = Math.max(norm1.length, norm2.length);
  const charScore = maxLen === 0 ? 1 : 1 - levenshtein(norm1, norm2) / maxLen;

  const tokens1 = preprocess(text1);
  const tokens2 = preprocess(text2);
  const wordScore = jaccardSimilarity(tokens1, tokens2);

  const inclusionBonus = (norm1.includes(norm2) || norm2.includes(norm1)) ? 0.2 : 0;

  return Math.min(1, (charScore * 0.3) + (wordScore * 0.5) + (inclusionBonus * 0.2));
}

class SoruEslestirici {
  constructor(db) {
    this.db = db;
    this.esik = 0.45;
    this.cache = new Map();
    this.cacheTime = 0;
    this.cacheTTL = 60000; // 1 dakika cache
  }

  /**
   * Tüm QA çiftlerini croxydb'den ve cevaplar.json'dan getir
   */
  tumVerileriGetir() {
    const now = Date.now();
    if (this.cache.size > 0 && now - this.cacheTime < this.cacheTTL) {
      return this.cache.get("all") || [];
    }

    try {
      const all = this.db.all() || {};
      const veriler = [];

      // 1. Croxydb'den öğrenilen veriler (ai_qa_*)
      for (const [key, value] of Object.entries(all)) {
        if (key.startsWith("ai_qa_") && value && value.soru && value.cevap) {
          veriler.push({
            id: key.replace("ai_qa_", ""),
            soru: value.soru,
            cevap: value.cevap,
            kategori: value.kategori || "genel",
            kaynak: value.kaynak || "manual",
            kullanici: value.ekleyen || null,
            kullanim: value.kullanim || 0,
            faydali: value.faydali || 0
          });
        }
      }

      // 2. cevaplar.json'dan sabit Q&A çiftlerini ekle
      try {
        const fs = require("fs");
        const path = require("path");
        const cevaplarPath = path.join(__dirname, "..", "cevaplar.json");
        const cevaplarData = JSON.parse(require("fs").readFileSync(cevaplarPath, "utf8"));

        for (const item of cevaplarData.cevaplar) {
          const kategori = item.kategori || "genel";
          for (const soru of item.sorular) {
            veriler.push({
              id: `builtin_${soru}`,
              soru: soru,
              cevap: item.cevap,
              kategori: kategori,
              kaynak: "builtin",
              kullanici: null,
              kullanim: 0,
              faydali: 0
            });
          }
        }
      } catch (e) {
        console.warn("[AI] cevaplar.json okunamadı:", e.message);
      }

      this.cache.set("all", veriler);
      this.cacheTime = now;
      return veriler;
    } catch (e) {
      console.error("[AI] Veri çekme hatası:", e.message);
      return [];
    }
  }

  /**
   * Cache'i temizle (yeni veri eklendiğinde)
   */
  cacheTemizle() {
    this.cache.clear();
    this.cacheTime = 0;
  }

  /**
   * Kullanıcı sorusuna en uygun cevabı bul
   */
  async bul(soru) {
    const veriler = this.tumVerileriGetir();
    if (!veriler.length) return null;

    let enIyi = null;
    let enYuksekSkor = 0;

    for (const kayit of veriler) {
      const skor = similarity(soru, kayit.soru);
      if (skor > enYuksekSkor && skor >= this.esik) {
        enYuksekSkor = skor;
        enIyi = {
          id: kayit.id,
          soru: kayit.soru,
          cevap: kayit.cevap,
          kategori: kayit.kategori,
          kaynak: kayit.kaynak,
          skor: skor
        };
      }
    }

    return enIyi;
  }

  /**
   * Çoklu sonuç döndür (admin onayı için)
   */
  async cokluBul(soru, limit = 3) {
    const veriler = this.tumVerileriGetir();
    if (!veriler.length) return [];

    const skorlu = veriler
      .map(kayit => ({
        id: kayit.id,
        soru: kayit.soru,
        cevap: kayit.cevap,
        kategori: kayit.kategori,
        kaynak: kayit.kaynak,
        skor: similarity(soru, kayit.soru)
      }))
      .filter(r => r.skor >= this.esik);

    skorlu.sort((a, b) => b.skor - a.skor);
    return skorlu.slice(0, limit);
  }

  setEsik(deger) {
    this.esik = Math.max(0, Math.min(1, deger));
  }

  /**
   * Cevaptaki değişkenleri doldur
   */
  degiskenleriDoldur(cevap, message, client) {
    if (!cevap) return cevap;
    const { getLangSync } = require("../dil");
    const lang = getLangSync(message.author.id);
    const prefix = process.env.PREFIX || "r!";
    return cevap
      .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString(lang === "en" ? "en-US" : "tr-TR"))
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString(lang === "en" ? "en-US" : "tr-TR"))
      .replace(/\{\{user\}\}/g, message.author?.username || "Kullanıcı")
      .replace(/\{\{mention\}\}/g, message.author ? `<@${message.author.id}>` : "@Kullanıcı")
      .replace(/\{\{guild\}\}/g, message.guild?.name || "DM")
      .replace(/\{\{prefix\}\}/g, prefix)
      .replace(/\{\{bot\}\}/g, client?.user?.username || "RiseBunny")
      .replace(/\{\{ping\}\}/g, client?.ws?.ping || 0);
  }
}

SoruEslestirici.similarity = similarity;
module.exports = SoruEslestirici;
module.exports.SoruEslestirici = SoruEslestirici;
module.exports.similarity = similarity;