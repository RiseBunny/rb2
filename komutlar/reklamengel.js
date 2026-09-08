const db = require('croxydb');
const { PermissionsBitField } = require("discord.js");
const { getLangSync, t } = require("../dil");
exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
    return message.reply(t(lang, "sistem.mesajYonet"));
  const key = `reklam.${message.guild.id}.durum`;
  const active = Boolean(db.fetch(key));
  db.set(key, !active);
  return message.channel.send((lang === "en" ? `Ad filter ${active ? "disabled" : "enabled"}.` : `Reklam engel ${active ? "kapatıldı" : "açıldı"}.`));
};
exports.conf = { enabled: true, guildOnly: true, aliases: ["reklam-engel", "linkengel", "link-engel"], permLevel: 0 };
exports.help = { name: "reklamengel", description: "Reklam filtresini açar veya kapatır.", usage: "reklamengel" };