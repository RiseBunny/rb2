const { EmbedBuilder } = require("discord.js");
const settings = require("../ayarlar.json");
const { getLangSync, t } = require("../dil");
exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const text = args.join(" ").trim();
  if (!text) return message.reply((lang === "en" ? "You must write your suggestion." : "Önerini yazmalısın."));
  const channel = client.channels.cache.get(process.env.SUGGESTION_CHANNEL_ID || settings.suggestionChannelId);
  if (!channel) return message.reply((lang === "en" ? "Suggestion channel is not set yet." : "Öneri kanalı henüz ayarlanmamış."));
  await channel.send({ embeds: [new EmbedBuilder().setColor("Blue").setTitle((lang === "en" ? "New suggestion" : "Yeni öneri")).setDescription(text).setFooter({ text: message.author.tag })] });
  return message.reply((lang === "en" ? "Your suggestion has been sent." : "Önerin iletildi."));
};
exports.conf = { enabled: true, guildOnly: false, aliases: ["oneri", "öner"], permLevel: 0 };
exports.help = { name: "öneri", description: "Öneri gönderir.", usage: "öneri <metin>" };