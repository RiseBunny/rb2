const WestraDiscord = require('discord.js');
const ayarlar = require('../ayarlar.json');
const { getLangSync } = require("../dil");
let prefix = ayarlar.prefix

exports.run = (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
 const WestraEmbed = new WestraDiscord.EmbedBuilder()
  .setColor(0x36393F)
 .setAuthor({ name: (EN ? "Protection Help Menu" : `${client.user.username} | Koruma Sistemi Yardım Menüsü   `) })
 .setDescription((EN ? ` <a1140647212792164352>
  Protection: ban-protection, channel-protection, role-protection, spam-filter, raid.` : ` <a1140647212792164352>
 **${prefix}ban-koruma #kanal** \n-> Ban koruma sistemini açar.
 **${prefix}ban-koruma-sıfırla** \n-> Ban koruma sistemini sıfırlar.
 **${prefix}kanal-koruma #kanal** \n-> Kanal koruma sistemini açar.
 **${prefix}kanal-koruma-sıfırla** \n-> Kanal koruma sistemini sıfırlar.
 **${prefix}rol-koruma #kanal** \n-> Rol koruma sistemini açar.
 **${prefix}rol-koruma-sıfırla** \n-> Rol koruma sistemini sıfırlar.
 **${prefix}spam-koruma** \n-> Spam koruma sistemini açar.
 **${prefix}spam-koruma-kapat** \n-> Spam koruma sistemini kapatır.
 **${prefix}raid aç / kapat** \n-> Raid koruma sistemini açar veya kapatır.`))
 .setFooter({ text: `RiseBunny` })
 .setTimestamp()
 .setImage("https://media.discordapp.net/attachments/1126239630203818095/1130479789757693952/standard.gif")
 message.channel.send({ embeds: [WestraEmbed] })
}
exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  kategori: "Bot",
  permLevel: 0
};

exports.help = {
  name: 'korumasistemi',
  description: 'Bot ile ilgili bilgi verir.',
  usage: 'bilgi'
};