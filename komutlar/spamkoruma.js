const db = require('croxydb');
const { PermissionsBitField } = require("discord.js");
const { getLangSync, t } = require("../dil");
exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return message.reply(t(lang, "ortak.yoneticiGerek"));
  const key = `spam.${message.guild.id}`;
  const active = Boolean(db.fetch(key));
  db.set(key, !active);
  return message.channel.send((lang === "en" ? `Spam protection ${active ? "disabled" : "enabled"}.` : `Spam koruma ${active ? "kapatıldı" : "açıldı"}.`));
};
exports.conf = { enabled: true, guildOnly: true, aliases: ["spam-koruma", "spamkoruma"], permLevel: 0 };
exports.help = { name: "spamkoruma", description: "Spam korumayı açar veya kapatır.", usage: "spamkoruma" };