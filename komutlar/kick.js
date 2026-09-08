const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { t, getLang } = require("../dil");
const { komutLog } = require("../utils");

module.exports.run = async (bot, message, args) => {
  const lang = await getLang(message.author.id);
  if (!message.guild) return;
  if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
    return message.reply(t(lang, "moderasyon.kickYetki"));

  const hedef = message.mentions.members.first();
  if (!hedef) return message.reply(t(lang, "moderasyon.kickEtiket"));
  if (hedef.id === message.guild.ownerId || hedef.user.bot && hedef.id === bot.user.id)
    return message.reply((lang === "en" ? "I can't do that ;)" : "Bunu yapamam ;)"));
  if (!hedef.kickable) return message.reply((lang === "en" ? "I cannot kick this user (role order/permission)." : "Bu kullanıcıyı atamıyorum (rol sıralaması/yetki)."));

  const embed = new EmbedBuilder()
    .setColor("Red")
    .setDescription(t(lang, "moderasyon.kickOnay", { kullanici: `${hedef}` }));
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`kick_evet_${hedef.id}_${message.author.id}`).setLabel("Onayla").setStyle(ButtonStyle.Danger).setEmoji("☑"),
    new ButtonBuilder().setCustomId("kick_hayir").setLabel("İptal").setStyle(ButtonStyle.Secondary)
  );
  const msg = await message.reply({ embeds: [embed], components: [row] }).catch(() => null);
  if (msg) setTimeout(() => msg.edit({ components: [] }).catch(() => {}), 30000);
  await komutLog(bot, message, "kick");
};

module.exports.conf = { aliases: [], permLevel: 2, enabled: true, guildOnly: true, kategori: "moderasyon" };
module.exports.help = { name: "kick", description: "Belirtilen kullanıcıyı sunucudan atar (onaylı).", usage: "kick @kullanıcı" };
