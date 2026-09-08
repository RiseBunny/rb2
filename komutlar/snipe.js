const { EmbedBuilder } = require("discord.js");
const { getLangSync, t } = require("../dil");
exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const item = client.snipeCache?.get(message.channel.id);
  if (!item) return message.reply((lang === "en" ? "No deleted messages to show in this channel." : "Bu kanalda gösterilecek silinmiş mesaj yok."));
  const embed = new EmbedBuilder().setColor("Orange").setTitle((lang === "en" ? "Last deleted message" : "Son silinen mesaj"))
    .setDescription(item.content || (lang === "en" ? "No message content." : "Mesaj içeriği yok."))
    .setFooter({ text: item.author ? (lang === "en" ? `Sender: ${item.author}` : `Gönderen: ${item.author}`) : (lang === "en" ? "Unknown sender" : "Gönderen bilinmiyor") });
  return message.channel.send({ embeds: [embed] });
};
exports.conf = { enabled: true, guildOnly: true, aliases: ["silinen"], permLevel: 0 };
exports.help = { name: "snipe", description: "Son silinen mesajı gösterir.", usage: "snipe" };