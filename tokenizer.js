/**
 * Türkçe metin işleme yardımcıları
 * - Normalizasyon (türkçe karakterler, noktalama)
 * - Tokenizasyon
 * - Basit Türkçe stemming
 */

/**
 * Türkçe karakterleri normalize eder
 * Örn: "yardım" -> "yardim", "NASILSIN" -> "nasilsin"
 */
function normalize(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^\w\s]/g, "")  // noktalama temizle
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Metni kelimelere böler
 */
function tokenize(text) {
  return normalize(text).split(" ").filter(w => w.length > 0);
}

/**
 * Basit Türkçe stemming (kök bulma)
 * Ekleri çıkarır: "komutları" -> "komut", "nasılsın" -> "nasıl"
 */
function turkishStem(word) {
  if (!word || word.length < 3) return word;

  const suffixes = [
    // Çoğul ekler
    "ları", "leri", "lar", "ler",
    // Hal ekleri
    "dan", "den", "tan", "ten",
    "dan", "den", "ten", "tan",
    // İyelik ekleri
    "ın", "in", "un", "ün",
    "nin", "nin", "nun", "nün",
    // Durum ekleri
    "dır", "dir", "dur", "dür",
    "tır", "tir", "tur", "tür",
    // Yönelme ekleri
    "a", "e", "ya", "ye",
    // Bulunma ekleri
    "da", "de", "ta", "te",
    // Vasıta ekleri
    "la", "le", "yla", "yle",
    // Çoğul+hal kombinasyonları
    "lardan", "lerden",
    "ların", "lerin",
    // Fiil ekleri (basit)
    "mak", "mek",
    "mış", "mis", "muş", "müş",
    "di", "dı", "ti", "tı",
    "du", "dü", "tu", "tü",
    "yor", "ıyor", "iyor", "uyor", "üyor",
    "ecek", "acak", "yecek", "yacak",
    "ebil", "abil",
    "iver", "iver",
    // Sıfat ekleri
    "li", "lı", "lu", "lü",
    "siz", "sız", "suz", "süz",
    "ca", "ce", "ça", "çe",
    "msi", "msı", "msu", "msü",
  ];

  // En uzun eki önce dene (çakışmayı önlemek için)
  const sortedSuffixes = suffixes.sort((a, b) => b.length - a.length);

  for (const suffix of sortedSuffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

/**
 * Tam işleme pipeline: normalize + tokenize + stem
 */
function preprocess(text) {
  return tokenize(text).map(turkishStem);
}

/**
 * Jaccard benzerliği (küme kesişimi / birleşimi)
 */
function jaccardSimilarity(tokens1, tokens2) {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = [...set1].filter(t => set2.has(t)).length;
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
}

module.exports = {
  normalize,
  tokenize,
  turkishStem,
  preprocess,
  jaccardSimilarity
};