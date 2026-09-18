/**
 * AI Cevap Eşleştirici
 * - cevaplar.json'dan soru-cevap çiftlerini yükler
 * - Levenshtein + Jaccard + İçerme bonusu ile en iyi eşleşmeyi bulur
 * - Değişkenleri doldurur ({{time}}, {{user}}, vb.)
 */
const fs = require("fs");
const path = require("path");
const { normalize, preprocess, jaccardSimilarity } = require("./tokenizer");

/**
 * Levenshtein mesafesi (karakter bazlı benzerlik için)
 */
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
        matrix[j][i - 1] + 1,      // silme
        matrix[j - 1][i] + 1,      // ekleme
        matrix[j - 1][i - 1] + cost // değiştirme
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * İki metin arasında hibrit benzerlik skoru (0-1)
 * - Karakter bazlı (Levenshtein): %30
 * - Kelime bazlı (Jaccard): %50
 * - İçerme bonusu: %20
 */
function similarity(text1, text2) {
  if (!text1 || !text2) return 0;

  const norm1 = normalize(text1);
  const norm2 = normalize(text2);

  // Tam eşleşme
  if (norm1 === norm2) return 1.0;

  // 1) Karakter bazlı benzerlik (Levenshtein)
  const maxLen = Math.max(norm1.length, norm2.length);
  const charScore = maxLen === 0 ? 1 : 1 - levenshtein(norm1, norm2) / maxLen;

  // 2) Kelime bazlı benzerlik (Jaccard)
  const tokens1 = preprocess(text1);
  const tokens2 = preprocess(text2);
  const wordScore = jaccardSimilarity(tokens1, tokens2);

  // 3) İçerme bonusu (bir metin diğerini içeriyorsa)
  const inclusionBonus = (norm1.includes(norm2) || norm2.includes(norm1)) ? 0.2 : 0;

  // Ağırlıklı ortalama
  const score = (charScore * 0.3) + (wordScore * 0.5) + (inclusionBonus * 0.2);
  return Math.min(1, score);
}

class Matcher {
  /**
   * @param {string} cevaplarPath - cevaplar.json dosya yolu
   * @param {Object} options - Ayarlar
   */
  constructor(cevaplarPath, options = {}) {
    this.cevaplarPath = cevaplarPath;
    this.esik = options.esik || 0.50;           // Minimum benzerlik eşiği (daha esnek)
    this.maxCevapUzunluk = options.maxCevapUzunluk || 2000;
    this.data = null;
    this.load();
  }

  /** cevaplar.json'u yükle */
  load() {
    try {
      const raw = fs.readFileSync(this.cevaplarPath, "utf8");
      this.data = JSON.parse(raw);
      const toplamSoru = this.data.cevaplar?.reduce(
        (acc, c) => acc + (c.sorular?.length || 0), 0
      ) || 0;
      console.log(`📚 [AI] cevaplar.json yüklendi: ${this.data.cevaplar?.length || 0} konu, ${toplamSoru} soru kalıbı`);
    } catch (err) {
      console.error("❌ [AI] cevaplar.json okunamadı:", err.message);
      this.data = { cevaplar: [] };
    }
  }

  /** Hot reload (dosya değişince) */
  reload() {
    this.load();
  }

  /**
   * Kullanıcı sorusuna en uygun cevabı bul
   * @param {string} soru - Kullanıcı metni
   * @returns {{cevap: string, skor: number, eslesenSoru: string, kategori: string} | null}
   */
  bul(soru) {
    if (!this.data || !this.data.cevaplar?.length) return null;

    let enIyi = { skor: 0, cevap: null, eslesenSoru: null, kategori: null };

    for (const kayit of this.data.cevaplar) {
      if (!kayit.sorular || !kayit.cevap) continue;

      for (const kalip of kayit.sorular) {
        const skor = similarity(soru, kalip);
        if (skor > enIyi.skor) {
          enIyi = {
            skor,
            cevap: kayit.cevap,
            eslesenSoru: kalip,
            kategori: kayit.kategori || "genel"
          };
        }
      }
    }

    // Eşik kontrolü
    if (enIyi.skor < this.esik || !enIyi.cevap) {
      return null;
    }

    return enIyi;
  }

  /**
   * Cevaptaki değişkenleri doldur
   * Desteklenen: {{time}}, {{date}}, {{user}}, {{mention}}, {{guild}}, {{prefix}}
   */
  degiskenleriDoldur(cevap, message, client) {
    if (!cevap) return cevap;
    const prefix = process.env.PREFIX || "r!";
    return cevap
      .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString("tr-TR"))
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString("tr-TR"))
      .replace(/\{\{user\}\}/g, message.author?.username || "Kullanıcı")
      .replace(/\{\{mention\}\}/g, message.author ? `<@${message.author.id}>` : "@Kullanıcı")
      .replace(/\{\{guild\}\}/g, message.guild?.name || "DM")
      .replace(/\{\{prefix\}\}/g, prefix)
      .replace(/\{\{bot\}\}/g, client?.user?.username || "RiseBunny");
  }

  /** Tüm kategorileri listele */
  getKategoriler() {
    if (!this.data?.cevaplar) return [];
    const kats = new Set();
    for (const c of this.data.cevaplar) if (c.kategori) kats.add(c.kategori);
    return [...kats];
  }
}

module.exports = { Matcher, similarity, levenshtein };