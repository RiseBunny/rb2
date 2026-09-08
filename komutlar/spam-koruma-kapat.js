const db = require('croxydb');
const { getLangSync, t } = require("../dil");
exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  if (!message.member.permissions.has("Administrator"))
    return message.reply(t(lang, "ortak.yoneticiGerek"));
  db.delete(`spam.${message.guild.id}`);
  return message.channel.send((lang === "en" ? "Spam protection disabled." : "Spam koruma kapatıldı."));
};
exports.conf = { enabled: true, guildOnly: true, aliases: ["spamkapat", "spam-koruma-kapat", "spamkoruma-kapat"], permLevel: 0 };
exports.help = { name: "spam-kapat", description: "Spam korumayı kapatır.", usage: "spam-kapat" };