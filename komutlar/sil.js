const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { getLangSync, t } = require("../dil");
const { komutLog } = require("../utils");
exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
    return message.reply(t(lang, "sistem.mesajYonet"));
  const amount = Number.parseInt(args[0], 10);
  if (!Number.isInteger(amount) || amount < 1 || amount > 100)
    return message.reply((lang === "en" ? "Specify a message count between 1 and 100." : "1 ile 100 arasında bir mesaj sayısı belirtmelisin."));
  const deleted = await message.channel.bulkDelete(amount, true);
  const response = await message.channel.send({ embeds: [
    new EmbedBuilder().setColor("Green").setDescription((lang === "en" ? `${deleted.size} messages deleted.` : `${deleted.size} mesaj silindi.`))
  ]});
  setTimeout(() => response.delete().catch(() => {}), 5000);
  await komutLog(client, message, "sil");
};
exports.conf = { enabled: true, guildOnly: true, aliases: ["temizle"], permLevel: 0 };
exports.help = { name: "sil", description: "Mesajları siler.", usage: "sil <1-100>" };