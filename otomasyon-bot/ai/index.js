/**
 * AI Modülü - Tüm alt modüllerin merkezi export noktası
 */

const { similarity, normalize, tokenize, turkishStem, preprocess, jaccardSimilarity, levenshtein } = require("./tokenizer");
const SoruEslestirici = require("./matcher");
const CevapGelistirici = require("./developer");
const { DilAlgilayici, DILLER } = require("./language");

module.exports = {
  // Tokenizer
  similarity,
  normalize,
  tokenize,
  turkishStem,
  preprocess,
  jaccardSimilarity,
  levenshtein,

  // Sınıflar
  SoruEslestirici,
  CevapGelistirici,
  DilAlgilayici,
  DILLER
};