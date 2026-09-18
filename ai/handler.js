/**
 * AI Sohbet Sistemi - Ana İşleyici
 * - "rise <metin>" tetikleyicisi
 * - Token/karakter limitleri
 * - Premium/normal kullanıcı ayrımı
 * - Günlük mesaj hakkı
 * - Cooldown
 * - JSON tabanlı cevaplar + fallback
 */
const path = require("path");
const { Matcher } = require("./matcher");
const db = require("croxydb");
const { isPremium } = require("../utils");
const { EmbedBuilder } = require("discord.js");

// AI Matcher başlat
const matcher = new Matcher(path.join(__dirname, "..", "cevaplar.json"));

// ═══════════════════════════════════════════════════
// AYARLAR
// ═══════════════════════════════════════════════════
const AI_CONFIG = {
  TETIKLEYICI: "rise",           // Tetikleyici kelime
  TOKEN_LIMIT_NORMAL: 2000,      // Normal kullanıcı token limiti
  TOKEN_LIMIT_PREMIUM: 8000,     // Premium kullanıcı token limiti (Discord Nitro benzeri)
  KARAKTER_LIMITI: 4000,         // Maksimum karakter
  COOLDOWN_MS: 3000,             // Kullanıcı başına cooldown (ms)
  GUNLUK_MESAJ_HAKKI: 100,       // Günlük mesaj hakkı (normal)
  GUNLUK_MESAJ_HAKKI_PREMIUM: 500, // Günlük mesaj hakkı (premium)
  DESTEK_SUNUCU_ID: "1192948403232067725", // Destek sunucusu
  DESTEK_SUNUCU_LINK: "https://dsc.gg/risebunny"
};

// Cooldown takibi
const aiCooldown = new Map();

// Günlük mesaj sayacı (userId -> { count, date })
const gunlukSayac = new Map();

/**
 * Token sayısını tahmin et (kelime sayısı * 1.3 ≈ token)
 */
function tokenTahmin(metin) {
  return Math.ceil(metin.split(/\s+/).filter(w => w.length > 0).length * 1.3);
}

/**
 * Günlük sayacı kontrolü ve artırma
 * @returns {Object} { izinli: boolean, kalan: number, toplam: number, premium: boolean }
 */
function gunlukKontrol(userId) {
  const bugun = new Date().toDateString();
  const kayit = gunlukSayac.get(userId);
  const premium = isPremium(userId);
  const limit = premium ? AI_CONFIG.GUNLUK_MESAJ_HAKKI_PREMIUM : AI_CONFIG.GUNLUK_MESAJ_HAKKI;

  if (!kayit || kayit.date !== bugun) {
    gunlukSayac.set(userId, { count: 1, date: bugun });
    return { izinli: true, kalan: limit - 1, toplam: limit, premium };
  }

  if (kayit.count >= limit) {
    return { izinli: false, kalan: 0, toplam: limit, premium };
  }

  kayit.count++;
  return { izinli: true, kalan: limit - kayit.count, toplam: limit, premium };
}

/**
 * Destek sunucusu embed'i oluştur
 */
function destekSunucuEmbed(user, kalan, premium) {
  const embed = new EmbedBuilder()
    .setColor(premium ? "Gold" : "Orange")
    .setTitle("📊 Günlük Mesaj Hakkı Doldu")
    .setDescription(
      `**${user.username}**, günlük **${premium ? "Premium" : "Normal"}** mesaj hakkını (**${AI_CONFIG.GUNLUK_MESAJ_HAKKI_PREMIUM} / ${AI_CONFIG.GUNLUK_MESAJ_HAKKI}**) doldurdun.`
    )
    .addFields(
      { name: "🔄 Sıfırlanma", value: "Her gün 00:00'te sıfırlanır", inline: true },
      { name: "💎 Premium Avantajı", value: premium ? "Günlük 500 mesaj hakkın var" : `Premium alarak **${AI_CONFIG.GUNLUK_MESAJ_HAKKI_PREMIUM} mesaj/hak** kazan`, inline: true }
    )
    .setFooter({ text: "RiseBunny AI Sistemi" })
    .setTimestamp();

  // Sunucuda mı kontrolü için buton ekle
  const row = {
    components: [{
      type: 1,
      components: [{
        type: 2,
        style: 5,
        label: "🌐 Destek Sunucusuna Katıl",
        url: AI_CONFIG.DESTEK_SUNUCU_LINK
      }]
    }]
  };

  return { embeds: [embed], components: row.components };
}

/**
 * AI Ana işleyici
 * @param {Message} message - Discord mesajı
 * @param {Client} client - Discord client
 * @returns {Promise<boolean>} true = AI cevap verdi (diğer işlemler durur)
 */
async function aiIsle(message, client) {
  const icerik = message.content?.trim();
  if (!icerik) return false;

  // 1) "rise" ile başlıyor mu? (büyük/küçük harf duyarsız)
  if (!icerik.toLowerCase().startsWith(AI_CONFIG.TETIKLEYICI.toLowerCase())) return false;

  // 2) "rise"dan sonra boşluk var mı? (risexyz gibi olmasın)
  const tetikleyiciUzunluk = AI_CONFIG.TETIKLEYICI.length;
  const sonrasi = icerik.slice(tetikleyiciUzunluk);
  if (sonrasi.length > 0 && !/^\s/.test(sonrasi)) return false;

  // 3) Kullanıcının sorusunu al
  const soru = sonrasi.trim();

  // 4) Soru boşsa
  if (!soru) {
    await message.reply({
      content: `Merhaba ${message.author}! 👋 Bana bir şey sormak ister misin?\nÖrn: \`rise nasılsın\`, \`rise premium ne işe yarar\``,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }

  // 5) Token limiti kontrolü
  const tokenSayisi = tokenTahmin(soru);
  const premium = isPremium(message.author.id);
  const tokenLimit = premium ? AI_CONFIG.TOKEN_LIMIT_PREMIUM : AI_CONFIG.TOKEN_LIMIT_NORMAL;

  if (tokenSayisi > tokenLimit) {
    await message.reply({
      content: `⚠️ **${premium ? "Premium" : "Normal"}** kullanıcı limiti aşıldı!\n` +
        `• Sorun: **${tokenSayisi} token** (~${soru.split(/\s+/).length} kelime)\n` +
        `• Limit: **${tokenLimit} token**\n\n` +
        (premium
          ? "Daha kısa sorular sorun."
          : `💎 **Premium alarak ${AI_CONFIG.TOKEN_LIMIT_PREMIUM} token** limitine yükselin!\n` +
            `${AI_CONFIG.DESTEK_SUNUCU_LINK} adresinden satın alabilirsiniz.`),
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }

  if (soru.length > AI_CONFIG.KARAKTER_LIMITI) {
    await message.reply({
      content: `⚠️ Sorun çok uzun! En fazla **${AI_CONFIG.KARAKTER_LIMITI} karakter** olabilir.`,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }

  // 6) Cooldown kontrolü
  const now = Date.now();
  const sonKullanim = aiCooldown.get(message.author.id) || 0;
  if (now - sonKullanim < AI_CONFIG.COOLDOWN_MS) {
    const kalan = Math.ceil((AI_CONFIG.COOLDOWN_MS - (now - sonKullanim)) / 1000);
    await message.reply({
      content: `⏳ Lütfen **${kalan} saniye** bekle.`,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }
  aiCooldown.set(message.author.id, now);

  // 7) Günlük mesaj hakkı kontrolü
  const gunluk = gunlukKontrol(message.author.id);
  if (!gunluk.izinli) {
    // Kullanıcı destek sunucusunda mı kontrol et
    let uye = null;
    try {
      const guild = client.guilds.cache.get(AI_CONFIG.DESTEK_SUNUCU_ID);
      if (guild) uye = await guild.members.fetch(message.author.id).catch(() => null);
    } catch {}

    if (uye) {
      // Sunucuda ise bonus 100 hakkı ver
      gunlukSayac.set(message.author.id, { count: gunluk.toplam - 100, date: new Date().toDateString() });
      await message.reply({
        content: `🎉 **RiseBunny destek sunucusundasın!** Günlük hakkına **+100 mesaj** ekledik. Devam edebilirsin! ✨`,
        allowedMentions: { repliedUser: false }
      }).catch(() => {});
      // Devam et (AI cevap verecek)
    } else {
      // Sunucuda değilse davet at
      await message.reply(destekSunucuEmbed(message.author, 0, gunluk.premium)).catch(() => {});
      return true;
    }
  }

  // 8) cevaplar.json'da ara
  const sonuc = matcher.bul(soru);

  if (sonuc) {
    // ✅ JSON'da bulundu → oradan cevap ver
    let cevap = matcher.degiskenleriDoldur(sonuc.cevap, message, client);
    
    // Premium değişkenleri
    const premDurum = premium ? "✅ Aktif" : "❌ Pasif";
    const premKalan = premium ? (require("../utils").premiumKalan(message.author.id) || "Süresiz") : "Yok";
    cevap = cevap
      .replace(/\{\{premium_durum\}\}/g, premDurum)
      .replace(/\{\{premium_kalan\}\}/g, premKalan)
      .replace(/\{\{ping\}\}/g, client.ws.ping);

    // "yazıyor..." efekti
    await message.channel.sendTyping().catch(() => {});
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

    await message.reply({
      content: cevap,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});

    // Debug log
    console.log(`🤖 [AI] ${message.author.tag}: "${soru}" → "${sonuc.eslesenSoru}" (skor: ${sonuc.skor.toFixed(2)}, kat: ${sonuc.kategori})`);

    return true;
  }

  // 9) JSON'da bulunamadı - fallback cevap
  const fallbackMesajlar = [
    "🤔 Bunu cevap listemde bulamadım. Başka bir şekilde sorabilir misin?",
    "😅 Bu konuda bilgim yok. `{{prefix}}yardım` yazıp komutlarıma bakabilirsin!",
    "🤷‍♂️ Anlayamadım ama öğrenmek isterim! Daha basit sorar mısın?",
    "❓ Bu soru benim biligim dışında. Destek sunucusunda sorabilirsin: " + AI_CONFIG.DESTEK_SUNUCU_LINK
  ];
  const fallback = fallbackMesajlar[Math.floor(Math.random() * fallbackMesajlar.length)]
    .replace(/\{\{prefix\}\}/g, process.env.PREFIX || "r!");

  await message.channel.sendTyping().catch(() => {});
  await new Promise(r => setTimeout(r, 300));
  await message.reply({
    content: fallback,
    allowedMentions: { repliedUser: false }
  }).catch(() => {});

  return true;
}

/** Hot reload için export */
function reloadMatcher() {
  matcher.reload();
}

module.exports = {
  aiIsle,
  reloadMatcher,
  AI_CONFIG,
  gunlukSayac,
  gunlukKontrol
};