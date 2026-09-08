const WestraDiscord = require('discord.js');
const ayarlar = require('../ayarlar.json');
const { getLangSync } = require("../dil");
let Prefix = ayarlar.prefix

exports.run = (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
 const WestraEmbed = new WestraDiscord.EmbedBuilder()
  .setColor(0x36393F)
 .setAuthor({ name: (EN ? "Giveaway Help Menu" : `${client.user.username} | Çekiliş Sistemi Yardım Menüsü  `) })
 .setDescription((EN ? ` <a1140646392507945032>
  Giveaway: giveaway-start, giveaway-reroll, giveaway-end.` : ` <a1140646392507945032>
 **${Prefix}çekiliş** \n-> Çekiliş başlatır.
 **${Prefix}reroll** \n-> Çekilişi yeniden çeker.
 **${Prefix}bitir** \n-> Çekilişi bitirir.
`))
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
  name: 'çekilişsistemi',
  description: 'Bot ile ilgili bilgi verir.',
  usage: 'bilgi'
};