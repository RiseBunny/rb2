const db = require('croxydb');
const { PermissionsBitField, ChannelType } = require("discord.js");
const { isPremium, komutLog } = require("../utils");
const { getLangSync, t } = require("../dil");
exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  if (!isPremium(message.author.id)) return message.reply(t(lang, "ortak.premiumGerek"));
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return message.reply(t(lang, "ortak.yoneticiGerek"));
  const active = Boolean(db.fetch(`yKoruma.${message.guild.id}`));
  if (args[0]?.toLowerCase() === "kapat" || (active && !args[0])) {
    db.delete(`yKoruma.${message.guild.id}`);
    await komutLog(client, message, "koruma");
    return message.channel.send((lang === "en" ? "Premium protection disabled." : "Premium koruma sistemi kapatıldı."));
  }
  let log = message.guild.channels.cache.find(channel => channel.name === "premium-koruma-log");
  if (!log) log = await message.guild.channels.create({ name: "premium-koruma-log", type: ChannelType.GuildText });
  await log.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
  await log.permissionOverwrites.edit(message.guild.members.me, { ViewChannel: true, SendMessages: true });
  db.set(`yKoruma.${message.guild.id}`, { log: log.id, enabled: true });
  await komutLog(client, message, "koruma");
  return message.channel.send((lang === "en" ? `Premium protection enabled. Log channel: ${log}` : `Premium koruma açıldı. Log kanalı: ${log}`));
};
exports.conf = { enabled: true, guildOnly: true, aliases: ["y-koruma", "ykoruma"], permLevel: 0 };
exports.help = { name: "koruma", description: "Premium koruma sistemlerini açar veya kapatır.", usage: "koruma [kapat]" };