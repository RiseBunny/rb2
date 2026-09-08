const WestraDiscord = require('discord.js');
const ayarlar = require('../ayarlar.json');
const { getLangSync } = require("../dil");
let prefix = ayarlar.prefix

exports.run = (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
 const WestraEmbed = new WestraDiscord.EmbedBuilder()
  .setColor(0x36393F)
 .setAuthor({ name: (EN ? "Moderation Help Menu" : `${client.user.username} | Moderasyon Yardım Menüsü  `) })
 .setDescription((EN ? ` <a1140646053591388301>
  Moderation: mod-log, ban-count, ban, swear-filter, swear-log, ad-filter, ad-log, greeting, clear, server-info, poll, autorole.` : ` <a1140646053591388301> 
 **${prefix}mod-log #kanal** \n-> Mod-log ayarlar.
 **${prefix}mod-log sıfırla** \n-> Mod-log sıfırlar.
 **${prefix}gç-ayarla #hosgeldin** \n-> Sunucuya gelenlere selam verin.
 **${prefix}bansay** \n-> Sunucuda kaç banlanan üye olduğunu gösterir.
 **${prefix}ban @kullanıcı** \n-> Etiketlediğiniz kullanıcıyı banlar.
 **${prefix}küfürengel** \n-> Küfür engel açar/kapatır.
 **${prefix}küfürlog #kanal** \n-> Küfür-log ayarlar.
 **${prefix}reklamengel** \n-> Reklam engel açar/kapatır.
 **${prefix}reklamlog #kanal** \n-> Reklam-log ayarlar.
 **${prefix}sa-as aç** \n-> SA-AS sistemini açar.
 **${prefix}sa-as kapat** \n-> SA-AS sistemini kapatır.
 **${prefix}sil** \n-> Yazdığınız miktar kadar mesaj siler.
 **${prefix}say** \n-> Sunucu bilgilerini gösterir.
 **${prefix}oylama** \n-> Oylama yapar.
 **${prefix}otorol-ayarla @rol #kanal** \n-> Otorol ayarlar.
**${prefix}otorol-sıfırla** \n-> Otorol sıfırlar.
 **${prefix}otorol-mesaj-ayarla** \n-> Otorol mesajı ayarlar.
 **${prefix}otorol-mesaj-sıfırla** \n-> Otorol mesajı sıfırlar.
`))
 .setTimestamp()
 .setImage("https://media.discordapp.net/attachments/1126239630203818095/1130479789757693952/standard.gif")
 message.channel.send({ embeds: [WestraEmbed] })
}
exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['mod'],
  kategori: "Bot",
  permLevel: 0
};

exports.help = {
  name: 'moderasyon',
  description: 'Bot ile ilgili bilgi verir.',
  usage: 'bilgi'
};