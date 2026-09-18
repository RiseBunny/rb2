/**
 * Embed Şablonları
 * Tutarlı görsel tasarım için merkezi embed oluşturucular
 */

const { EmbedBuilder, Colors } = require("discord.js");

const RENKLER = {
  BASARI: 0x00FF00,
  HATA: 0xFF0000,
  UYARI: 0xFFAA00,
  BILGI: 0x0099FF,
  PREMIUM: 0xFFD700,
  AI: 0x9933FF,
  TICKET: 0x00FFFF,
  KURULUM: 0x00FF88
};

function basariEmbed(baslik, aciklama, fields = []) {
  return new EmbedBuilder()
    .setColor(RENKLER.BASARI)
    .setTitle(`✅ ${baslik}`)
    .setDescription(aciklama)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: "Otomasyon • Başarılı" });
}

function hataEmbed(baslik, aciklama, fields = []) {
  return new EmbedBuilder()
    .setColor(RENKLER.HATA)
    .setTitle(`❌ ${baslik}`)
    .setDescription(aciklama)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: "Otomasyon • Hata" });
}

function uyariEmbed(baslik, aciklama, fields = []) {
  return new EmbedBuilder()
    .setColor(RENKLER.UYARI)
    .setTitle(`⚠️ ${baslik}`)
    .setDescription(aciklama)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: "Otomasyon • Uyarı" });
}

function bilgiEmbed(baslik, aciklama, fields = []) {
  return new EmbedBuilder()
    .setColor(RENKLER.BILGI)
    .setTitle(`ℹ️ ${baslik}`)
    .setDescription(aciklama)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: "Otomasyon • Bilgi" });
}

function premiumEmbed(baslik, aciklama, fields = []) {
  return new EmbedBuilder()
    .setColor(RENKLER.PREMIUM)
    .setTitle(`💎 ${baslik}`)
    .setDescription(aciklama)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: "Otomasyon • Premium" });
}

function aiEmbed(baslik, aciklama, fields = []) {
  return new EmbedBuilder()
    .setColor(RENKLER.AI)
    .setTitle(`🤖 ${baslik}`)
    .setDescription(aciklama)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: "Otomasyon AI" });
}

function kurulumEmbed(baslik, aciklama, fields = [], adim = null, toplamAdim = null) {
  const embed = new EmbedBuilder()
    .setColor(RENKLER.KURULUM)
    .setTitle(`⚙️ ${baslik}`)
    .setDescription(aciklama)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: "Otomasyon Kurulum" });

  if (adim !== null && toplamAdim !== null) {
    embed.setFooter({ text: `Otomasyon Kurulum • Adım ${adim}/${toplamAdim}` });
  }

  return embed;
}

function ticketEmbed(baslik, aciklama, fields = []) {
  return new EmbedBuilder()
    .setColor(RENKLER.TICKET)
    .setTitle(`🎫 ${baslik}`)
    .setDescription(aciklama)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: "Otomasyon Ticket" });
}

function cevapEmbed(soru, cevap, kaynak = "manual", skor = null) {
  const kaynakEtiketleri = {
    manual: "👤 Manuel Eklendi",
    ai_approved: "🤖 AI Onaylı",
    user_feedback: "👍 Kullanıcı Onayı",
    community: "🌐 Topluluk Cevabı"
  };

  const fields = [
    { name: "❓ Soru", value: soru.length > 1024 ? soru.slice(0, 1021) + "..." : soru, inline: false },
    { name: "📌 Kaynak", value: kaynakEtiketleri[kaynak] || kaynak, inline: true }
  ];

  if (skor !== null) {
    fields.push({ name: "🎯 Benzerlik", value: `%${Math.round(skor * 100)}`, inline: true });
  }

  return new EmbedBuilder()
    .setColor(RENKLER.BILGI)
    .setTitle("🔍 Cevap Bulundu")
    .setDescription(cevap)
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: "Otomasyon • Cevap" });
}

function cevapYokEmbed(soru) {
  return new EmbedBuilder()
    .setColor(RENKLER.UYARI)
    .setTitle("🤔 Cevap Bulunamadı")
    .setDescription(`**Sorunuz:** "${soru}"\n\nBu soruya özel bir cevabım yok. Size daha iyi yardımcı olabilmem için ticket açmamı ister misiniz?`)
    .addFields(
      { name: "🎫 Ticket Aç", value: "Yetkili ekibimiz size özel yardımcı olacak", inline: true },
      { name: "❌ İptal", value: "Başka bir şey sormak isterseniz", inline: true }
    )
    .setTimestamp()
    .setFooter({ text: "Otomasyon • Cevap Yok" });
}

module.exports = {
  RENKLER,
  basariEmbed,
  hataEmbed,
  uyariEmbed,
  bilgiEmbed,
  premiumEmbed,
  aiEmbed,
  kurulumEmbed,
  ticketEmbed,
  cevapEmbed,
  cevapYokEmbed
};