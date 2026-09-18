/**
 * Yardım Komutu
 */

const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "yardım",
  description: "Bot komutlarını gösterir",
  aliases: ["help", "h", "komutlar"],
  cooldown: 3,

  async execute(message, args, client) {
    const prefix = "otomasyon";

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle("🤖 Otomasyon - Yardım Menüsü")
      .setDescription("Topluluk destekli AI ticket sistemi. API yok, limit yok, tamamen offline.")
      .addFields(
        { name: "🚀 **Temel Kullanım**", value: `\`${prefix} <soru>\` - AI'ya soru sor\n\`${prefix} yardım\` - Bu menüyü göster`, inline: false },
        { name: "⚙️ **Yönetici Komutları**", value: `\`${prefix}\` - Kurulum başlat\n\`${prefix} eğit <soru> | <cevap>\` - Manuel veri ekle\n\`${prefix} sıfırla\` - Tüm verileri sil\n\`${prefix} dil <tr/en>\` - Sunucu dili\n\`${prefix} adminrol @rol\` - Yönetici rolü`, inline: false },
        { name: "💎 **Premium**", value: `\`${prefix} premium\` - Durum göster\n\`${prefix} premium aktif <gün>\` - Aktif et (Sahip)`, inline: false },
        { name: "📊 **Bilgi**", value: `\`${prefix} istatistik\` - Sunucu istatistikleri`, inline: false }
      )
      .setFooter({ text: "Otomasyon • Yardım" })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};