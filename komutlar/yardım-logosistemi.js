const WestraDiscord = require('discord.js');
const ayarlar = require('../ayarlar.json');
const { getLangSync } = require("../dil");
let prefix = ayarlar.prefix

exports.run = (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
 const WestraEmbed = new WestraDiscord.EmbedBuilder()
  .setColor(0x36393F)
 .setAuthor({ name: (EN ? "Logo Help Menu" : `${client.user.username} | Logo Sistemi Yardım Menüsü  `) })
 .setDescription((EN ? ` <a1140645961979404399>
  Logos: arrow-logo, gold-logo, green-logo, graffiti-logo.` : ` <a1140645961979404399> 
 **${prefix}arrow** \n-> Ok şeklinde logo yapar.
 **${prefix}gold** \n-> Altın şeklinde logo yapar.
 **${prefix}green** \n-> Yeşil şeklinde logo yapar.
 **${prefix}graffiti** \n-> Graffiti şeklinde logo yapar.
`))
 .setTimestamp()
 .setImage("https://media.discordapp.net/attachments/1126239630203818095/1130479789757693952/standard.gif")
 message.channel.send({ embeds: [WestraEmbed] })
}
exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["logo"],
  kategori: "Bot",
  permLevel: 0
};

exports.help = {
  name: 'logosistemi',
  description: 'Bot ile ilgili bilgi verir.',
  usage: 'bilgi'
};