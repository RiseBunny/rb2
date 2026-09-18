/**
 * Cevap Geliştirme Motoru (AI'siz, kural tabanlı)
 * Yetkilinin yazdığı ham cevabı profesyonel, yapılandırılmış ve anlaşılır hale getirir
 */

class CevapGelistirici {
  constructor() {
    // Yazım hatalarını düzeltme
    this.yazimDuzeltmeleri = {
      "degistir": "değiştirebilirsiniz",
      "degistirmek": "değiştirmek",
      "tikla": "tıklayın",
      "tiklayin": "tıklayın",
      "git": "gidin",
      "gidin": "gidin",
      "yap": "yapabilirsiniz",
      "yapin": "yapın",
      "bak": "bakın",
      "bakın": "bakın",
      "ac": "açın",
      "acın": "açın",
      "yaz": "yazın",
      "yazin": "yazın",
      "kontrol": "kontrol edin",
      "kontrol et": "kontrol edin",
      "sec": "seçin",
      "secin": "seçin",
      "gir": "girin",
      "girin": "girin",
      "olustur": "oluşturun",
      "olusturun": "oluşturun",
      "sil": "silin",
      "duzenle": "düzenleyin",
      "duzenleyin": "düzenleyin",
      "ayarla": "ayarlayın",
      "ayarlayin": "ayarlayın",
      "kaydet": "kaydedin",
      "iptal": "iptal edin",
      "onayla": "onaylayın",
      "onaylayin": "onaylayın",
      "reddet": "reddedin",
      "gonder": "gönderin",
      "gonderin": "gönderin",
      "al": "alın",
      "alin": "alın",
      "ver": "verin",
      "edin": "edin",
      "ogren": "öğrenin",
      "ogrenin": "öğrenin",
      "anla": "anlayın",
      "anlayin": "anlayın",
      "hatirla": "hatırlayın",
      "hatirlayin": "hatırlayın",
      "unutma": "unutmayın",
      "unutmayin": "unutmayın",
      "dikkat": "dikkat edin",
      "surekli": "sürekli",
      "her zaman": "her zaman",
      "asla": "asla",
      "hiç": "hiç",
      "birsey": "bir şey",
      "hersey": "her şey",
      "hicbir": "hiçbir",
      "nasıl": "nasıl",
      "nasil": "nasıl",
      "nedir": "nedir",
      "neden": "neden",
      "niçin": "niçin",
      "nicin": "niçin",
      "ne zaman": "ne zaman",
      "ne zaman": "ne zaman",
      "nerede": "nerede",
      "nereden": "nereden",
      "nereye": "nereye",
      "kim": "kim",
      "kime": "kime",
      "kimin": "kimin",
      "hangi": "hangi",
      "hangisi": "hangisi",
      "kac": "kaç",
      "kaç": "kaç",
      "ne kadar": "ne kadar"
    };

    // Emir kipini nazik kipe çevirme kuralları
    this.nazikKipKurallari = [
      { pattern: /\b(git|gidin)\b/gi, replace: "gitmeniz gerekiyor" },
      { pattern: '\b(tıkla|tıklayın)\b', replace: "tıklamanız yeterlidir" },
      { pattern: '\b(yap|yapın)\b', replace: "yapabilirsiniz" },
      { pattern: '\b(bak|bakın)\b', replace: "kontrol etmenizi öneririm" },
      { pattern: '\b(aç|açın)\b', replace: "açmanız gerekiyor" },
      { pattern: '\b(yaz|yazın)\b', replace: "yazmanız yeterlidir" },
      { pattern: '\b(seç|seçin)\b', replace: "seçmeniz gerekiyor" },
      { pattern: '\b(gir|girin)\b', replace: "girmeniz gerekiyor" },
      { pattern: '\b(oluştur|oluşturun)\b', replace: "oluşturabilirsiniz" },
      { pattern: '\b(kaydet|kaydedin)\b', replace: "kaydetmeniz yeterlidir" },
      { pattern: '\b(gönder|gönderin)\b', replace: "göndermeniz gerekiyor" },
      { pattern: '\b(al|alın)\b', replace: "alabilirsiniz" },
      { pattern: '\b(ver|verin)\b', replace: "verebilirsiniz" },
      { pattern: '\b(öğren|öğrenin)\b', replace: "öğrenebilirsiniz" },
      { pattern: '\b(anla|anlayın)\b', replace: "anlayabilirsiniz" },
      { pattern: '\b(hatırla|hatırlayın)\b', replace: "hatırlamanız gerekiyor" },
      { pattern: '\b(unutma|unutmayın)\b', replace: "unutmamalısınız" },
      { pattern: '\b(dikkat|dikkat edin)\b', replace: "dikkat etmeniz önerilir" }
    ];

    // Soru türüne göre başlıklar
    this.basliklar = {
      tr: {
        nasil: "📌 **Nasıl Yapılır:**",
        nasıl: "📌 **Nasıl Yapılır:**",
        ne: "📌 **Bilgi:**",
        nedir: "📌 **Tanım:**",
        neden: "📌 **Sebep:**",
        niye: "📌 **Sebep:**",
        nerede: "📍 **Konum:**",
        ne_zaman: "🕐 **Zaman:**",
        kim: "👤 **Kişi:**",
        hangi: "📋 **Seçenekler:**",
        kac: "🔢 **Miktar:**",
        kaç: "🔢 **Miktar:**",
        default: "📖 **Cevap:**"
      },
      en: {
        how: "📌 **How To:**",
        what: "📌 **Info:**",
        why: "📌 **Reason:**",
        where: "📍 **Location:**",
        when: "🕐 **Time:**",
        who: "👤 **Person:**",
        which: "📋 **Options:**",
        how_many: "🔢 **Amount:**",
        default: "📖 **Answer:**"
      }
    };

    // Kapanış cümleleri
    this.kapanislar = {
      tr: "\n\n💡 **Sorun devam ederse ticket açabilirsiniz.**",
      en: "\n\n💡 **If the problem persists, you can open a ticket.**"
    };
  }

  /**
   * Ham cevabı profesyonelleştir
   * @param {string} hamCevap - Yetkilinin yazdığı cevap
   * @param {string} soru - Kullanıcı sorusu
   * @param {string} dil - Dil kodu (tr/en)
   * @returns {string} Geliştirilmiş cevap
   */
  gelistir(hamCevap, soru, dil = "tr") {
    if (!hamCevap || !hamCevap.trim()) return hamCevap;

    let metin = hamCevap.trim();

    // 1. Yazım düzeltmeleri
    metin = this.yazimDuzelt(metin);

    // 2. Nazikleştirme (emir kipi -> nazik kip)
    metin = this.naziklestir(metin);

    // 3. Yapılandırma (adımları numaralandır)
    metin = this.yapilandir(metin);

    // 4. Başlık ekle
    metin = this.baslikEkle(metin, soru, dil);

    // 5. Kapanış cümlesi ekle
    metin = this.kapanisEkle(metin, dil);

    return metin;
  }

  yazimDuzelt(metin) {
    let sonuc = metin;
    for (const [yanlis, dogru] of Object.entries(this.yazimDuzeltmeleri)) {
      const regex = new RegExp(`\\b${yanlis}\\b`, "gi");
      sonuc = sonuc.replace(regex, dogru);
    }
    return sonuc;
  }

  naziklestir(metin) {
    let sonuc = metin;
    for (const kural of this.nazikKipKurallari) {
      sonuc = sonuc.replace(kural.pattern, kural.replace);
    }
    return sonuc;
  }

  yapilandir(metin) {
    // Cümleleri ayır
    const cumleler = metin.split(/(?:\.|\n|,| ve | sonra | ardından | ardindan | sonraki | daha sonra )+/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Eğer 2+ cümle varsa ve madde işareti/numara yoksa numaralandır
    if (cumleler.length >= 2 && !/^[\d•\-\*]\s/.test(metin.trim())) {
      return cumleler.map((cumle, i) => `${i + 1}. ${cumle}`).join("\n");
    }

    // Virgülle ayrılmış uzun listeleri madde işaretli yap
    if (cumleler.length === 1 && cumleler[0].includes(",") && cumleler[0].split(",").length >= 3) {
      return cumleler[0].split(",").map((item, i) => `${i + 1}. ${item.trim()}`).join("\n");
    }

    return metin;
  }

  baslikEkle(metin, soru, dil) {
    const baslikSet = this.basliklar[dil] || this.basliklar.tr;
    const soruLower = soru.toLowerCase();

    let baslik = baslikSet.default;

    if (soruLower.includes("nasıl") || soruLower.includes("nasıl") || soruLower.includes("how")) {
      baslik = baslikSet.nasil || baslikSet.how;
    } else if (soruLower.includes(" ne ") || soruLower.startsWith("ne ") || soruLower.includes(" nedir") || soruLower.includes("what") || soruLower.includes("nedir")) {
      baslik = baslikSet.ne || baslikSet.what;
    } else if (soruLower.includes("neden") || soruLower.includes("niçin") || soruLower.includes("why")) {
      baslik = baslikSet.neden || baslikSet.why;
    } else if (soruLower.includes("nerede") || soruLower.includes("where")) {
      baslik = baslikSet.nerede || baslikSet.where;
    } else if (soruLower.includes("ne zaman") || soruLower.includes("when")) {
      baslik = baslikSet.ne_zaman || baslikSet.when;
    } else if (soruLower.includes("kim") || soruLower.includes("who")) {
      baslik = baslikSet.kim || baslikSet.who;
    } else if (soruLower.includes("hangi") || soruLower.includes("which")) {
      baslik = baslikSet.hangi || baslikSet.which;
    } else if (soruLower.includes("kaç") || soruLower.includes("kac") || soruLower.includes("how many")) {
      baslik = baslikSet.kac || baslikSet.how_many;
    }

    return `${baslik}\n\n${metin}`;
  }

  kapanisEkle(metin, dil) {
    const kapanis = this.kapanislar[dil] || this.kapanislar.tr;
    // Zaten varsa ekleme
    if (metin.includes("Sorun devam ederse") || metin.includes("problem persists")) return metin;
    return metin + kapanis;
  }
}

module.exports = CevapGelistirici;