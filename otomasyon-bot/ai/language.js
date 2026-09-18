/**
 * Dil Algılama Motoru
 * Sunucu, kullanıcı ve içerik bazlı dil tespiti
 */

const DILLER = {
  TR: "tr",
  EN: "en"
};

class DilAlgilayici {
  constructor(db) {
    this.db = db;
    
    // Türkçe karakter kontrolü
    this.trChars = /[çğıöşüÇĞIİÖŞÜ]/;
    
    // Türkçe yaygın kelimeler
    this.trKelimeler = new Set([
      "nasıl", "nasılsın", "neden", "nedir", "nerede", "yardım", "yardim",
      "lütfen", "lutfen", "teşekkür", "tesekkur", "merhaba", "selam",
      "şifre", "sifre", "sunucu", "kanal", "mesaj", "ayar", "ayarlar",
      "hesap", "profil", "güvenlik", "guvenlik", "değiştir", "degistir",
      "kayıt", "kayit", "giriş", "giris", "çıkış", "cikis", "rol",
      "yetki", "admin", "yönetici", "yonetici", "ban", "kick", "mute",
      "ticket", "destek", "sorun", "hata", "yardımcı", "yardimci",
      "nasıl", "ne", "neden", "niçin", "ne zaman", "kim", "hangi",
      "kaç", "ne kadar", "için", "ile", "ve", "veya", "ama", "fakat",
      "bu", "şu", "o", "ben", "sen", "biz", "siz", "onlar",
      "var", "yok", "evet", "hayır", "hayir", "tamam", "olur", "olmaz"
    ]);

    // İngilizce yaygın kelimeler
    this.enKelimeler = new Set([
      "how", "why", "what", "where", "when", "who", "which",
      "help", "please", "thanks", "thank you", "hello", "hi", "hey",
      "password", "server", "channel", "message", "setting", "settings",
      "account", "profile", "security", "change", "register", "login",
      "logout", "role", "permission", "admin", "administrator", "ban",
      "kick", "mute", "ticket", "support", "issue", "problem", "error",
      "is", "are", "the", "a", "an", "and", "or", "but", "for", "with",
      "this", "that", "i", "you", "we", "they", "he", "she", "it",
      "have", "has", "do", "does", "did", "can", "could", "will",
      "would", "should", "must", "need", "want", "like", "know",
      "think", "see", "look", "find", "get", "give", "take", "make"
    ]);
  }

  /**
   * Mesajın dilini algıla
   * Öncelik: 1.Sunucu dili 2.Kullanıcı dili 3.İçerik analizi 4.Varsayılan
   */
  async algila(message) {
    // 1. Sunucu ayarlı dili
    if (message.guild) {
      const guild = this.db.getGuild(message.guild.id);
      if (guild?.language) {
        return guild.language;
      }
    }

    // 2. Kullanıcı kaydedilmiş dili
    const userLang = this.db.getUserLanguage(message.author.id);
    if (userLang) return userLang;

    // 3. İçerikten tahmin
    return this.iceriktenTahmin(message.content);
  }

  /**
   * Metin içeriğinden dil tahmini
   */
  iceriktenTahmin(text) {
    if (!text) return DILLER.EN;

    const lower = text.toLowerCase();

    // Türkçe karakter kontrolü (en güçlü sinyal)
    if (this.trChars.test(lower)) return DILLER.TR;

    // Kelime bazlı skorlama
    let trSkor = 0;
    let enSkor = 0;

    const words = lower.split(/\s+/);
    for (const word of words) {
      if (this.trKelimeler.has(word)) trSkor++;
      if (this.enKelimeler.has(word)) enSkor++;
    }

    if (trSkor > enSkor) return DILLER.TR;
    if (enSkor > trSkor) return DILLER.EN;

    // Eşitse veya hiçbiri yoksa varsayılan
    return DILLER.TR;
  }

  /**
   * Dil kodunu isim ile getir
   */
  dilAdi(kod) {
    const isimler = { tr: "Türkçe", en: "English" };
    return isimler[kod] || kod;
  }

  /**
   * Desteklenen diller listesi
   */
  desteklenenDiller() {
    return Object.values(DILLER);
  }
}

module.exports = { DilAlgilayici, DILLER };