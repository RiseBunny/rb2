const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { ownerLog } = require("../utils");
const { getLangSync, t } = require("../dil");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  if (!message.guild) return;
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return message.reply((lang === "en" ? "This command requires the Ban Members permission." : "Bu komut için Üyeleri Yasakla izni gerekir."));
  const bans = await message.guild.bans.fetch().catch(() => null);
  if (!bans || bans.size === 0) return message.reply((lang === "en" ? "No banned users." : "Banlı kullanıcı yok."));
  let sayi = 0;
  for (const [, ban] of bans) {
    try { await message.guild.members.unban(ban.user.id); sayi++; } catch {}
  }
  await message.react("✅").catch(() => {});
  await message.channel.send({ embeds: [new EmbedBuilder().setColor("Green").setDescription((lang === "en" ? `${sayi} bans removed.` : `${sayi} ban kaldırıldı.`))] });
  await ownerLog(client, new EmbedBuilder().setColor("Orange").setDescription((lang === "en" ? `🔓 UnbanAll: **${message.guild.name}** | ${message.author.tag} | ${sayi} users` : `🔓 UnbanAll: **${message.guild.name}** | ${message.author.tag} | ${sayi} kişi`)));
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["unban-all"], permLevel: 3, kategori: "moderasyon" };
exports.help = { name: "unbanall", description: "Tüm banları kaldırır.", usage: "unbanall" };
