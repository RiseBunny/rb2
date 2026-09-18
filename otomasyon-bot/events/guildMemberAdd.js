/**
 * Guild Member Add Event - Yeni üye katıldığında
 */

const { bilgiEmbed, basariEmbed } = require("../utils/embeds");
const config = require("../config");

module.exports = async (member, client) => {
  try {
    const guild = member.guild;
    const guildData = client.db.getGuild(guild.id);

    // Sunucu kurulu değilse işlem yapma
    if (!guildData?.setup_completed) return;

    // Hoş geldin mesajı (sistem kanalı varsa)
    if (guild.systemChannel) {
      const embed = bilgiEmbed(
        "👋 Hoş Geldin!",
        `**${member.user.tag}** sunucuya katıldı!\n\n` +
        `Sorularınız için \`otomasyon <soru>\` yazabilirsiniz.\n` +
        `Örn: \`otomasyon şifremi nasıl değiştiririm?\``
      );
      await guild.systemChannel.send({ embeds: [embed] }).catch(() => {});
    }

    // Premium sunucuysa özel karşılama
    if (guildData.premium_active && guildData.premium_expires_at > Date.now()) {
      try {
        await member.send({
          embeds: [{
            color: 0xFFD700,
            title: "💎 Premium Sunucusuna Hoş Geldiniz!",
            description: `**${guild.name}** sunucusu **Premium** avantajlarına sahip!\n\n` +
              `• Token limiti: **8000** (Normal: 2000)\n` +
              `• Günlük mesaj hakkı: **500** (Normal: 100)\n` +
              `• Öncelikli destek\n\n` +
              `Sorularınız için: \`otomasyon <soru>\``,
            footer: { text: "Otomasyon Premium" },
            timestamp: new Date()
          }]
        }).catch(() => {});
      } catch (e) {}
    }

    // Sahip log
    if (config.OWNER_LOG_CHANNEL) {
      const logChannel = client.channels.cache.get(config.OWNER_LOG_CHANNEL);
      if (logChannel) {
        await logChannel.send({
          embeds: [{
            color: 0x00FF00,
            title: "📥 Yeni Üye",
            description: `**Sunucu:** ${guild.name}\n**Üye:** ${member.user.tag} (${member.id})\n**Hesap Oluşturma:** ${member.user.createdAt.toLocaleDateString("tr-TR")}`,
            thumbnail: { url: member.user.displayAvatarURL() },
            timestamp: new Date()
          }]
        }).catch(() => {});
      }
    }

  } catch (error) {
    console.error("[GuildMemberAdd Hatası]:", error);
  }
};