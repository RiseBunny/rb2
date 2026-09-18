/**
 * Türkçe Metin İşleme Motoru
 * Normalizasyon, Tokenizasyon, Stemming
 */

function normalize(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalize(text).split(" ").filter(w => w.length > 0);
}

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
    "nin", "nın", "nun", "nün",
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
    // Fiil ekleri
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

  const sortedSuffixes = suffixes.sort((a, b) => b.length - a.length);

  for (const suffix of sortedSuffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

function preprocess(text) {
  return tokenize(text).map(turkishStem);
}

function jaccardSimilarity(tokens1, tokens2) {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = [...set1].filter(t => set2.has(t)).length;
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
}

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

module.exports = {
  normalize,
  tokenize,
  turkishStem,
  preprocess,
  jaccardSimilarity,
  levenshtein,
  similarity
};