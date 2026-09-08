const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { getLangSync, t } = require("../dil");
exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
    return message.reply(t(lang, "sistem.mesajYonet"));
  const question = args.join(" ").trim();
  if (!question) return message.reply((lang === "en" ? "You must write the poll text." : "Oylama metnini yazmalısın."));
  const sent = await message.channel.send({ embeds: [
    new EmbedBuilder().setColor("Blue").setTitle((lang === "en" ? "Poll" : "Oylama")).setDescription(question)
  ]});
  await sent.react("✅");
  await sent.react("❌");
};
exports.conf = { enabled: true, guildOnly: true, aliases: ["anket"], permLevel: 0 };
exports.help = { name: "oylama", description: "Oylama başlatır.", usage: "oylama <metin>" };