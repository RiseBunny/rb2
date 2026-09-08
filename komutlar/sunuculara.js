const { EmbedBuilder } = require("discord.js");
const { getLangSync, t } = require("../dil");
exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const invite = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
  return message.channel.send({ embeds: [
    new EmbedBuilder().setColor("Blue").setTitle((lang === "en" ? "Add to your server" : "Sunucuna ekle")).setDescription((lang === "en" ? `[Add me to your server](${invite})` : `[Botu sunucuna eklemek için tıkla](${invite})`))
  ]});
};
exports.conf = { enabled: true, guildOnly: false, aliases: ["sunuculara-ekle", "davet"], permLevel: 0 };
exports.help = { name: "sunuculara", description: "Bot ekleme bağlantısını gösterir.", usage: "sunuculara" };