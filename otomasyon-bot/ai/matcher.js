/**
 * Soru Eşleştirme Motoru
 * Veritabanındaki eğitim verileriyle kullanıcı sorusunu karşılaştırır
 */

const { similarity, normalize } = require("./tokenizer");

class SoruEslestirici {
  constructor(db) {
    this.db = db;
    this.esik = 0.55; // Minimum benzerlik eşiği
  }

  /**
   * Kullanıcı sorusuna en uygun cevabı bul
   * @param {string} guildId - Sunucu ID
   * @param {string} soru - Kullanıcı sorusu
   * @returns {Promise<{id: number, soru: string, cevap: string, kaynak: string, skor: number} | null>}
   */
  async bul(guildId, soru) {
    const results = this.db.searchEgitimVerisi(guildId, soru, 10);
    if (!results.length) return null;

    let enIyi = null;
    let enYuksekSkor = 0;

    for (const kayit of results) {
      const skor = similarity(soru, kayit.soru);
      if (skor > enYuksekSkor && skor >= this.esik) {
        enYuksekSkor = skor;
        enIyi = {
          id: kayit.id,
          soru: kayit.soru,
          cevap: kayit.cevap,
          kaynak: kayit.kaynak,
          skor: skor
        };
      }
    }

    return enIyi;
  }

  /**
   * Birden fazla yakın sonuç döndür (yetkili onayı için)
   */
  async cokluBul(guildId, soru, limit = 3) {
    const results = this.db.searchEgitimVerisi(guildId, soru, limit * 2);
    if (!results.length) return [];

    const skorlu = results.map(kayit => ({
      id: kayit.id,
      soru: kayit.soru,
      cevap: kayit.cevap,
      kaynak: kayit.kaynak,
      skor: similarity(soru, kayit.soru)
    })).filter(r => r.skor >= this.esik);

    skorlu.sort((a, b) => b.skor - a.skor);
    return skorlu.slice(0, limit);
  }

  setEsik(deger) {
    this.esik = Math.max(0, Math.min(1, deger));
  }
}

module.exports = SoruEslestirici;