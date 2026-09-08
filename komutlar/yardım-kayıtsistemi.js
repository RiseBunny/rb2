const WestraDiscord = require('discord.js');
const ayarlar = require('../ayarlar.json');
const { getLangSync } = require("../dil");
let prefix = ayarlar.prefix

exports.run = (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
 const WestraEmbed = new WestraDiscord.EmbedBuilder()
  .setColor(0x36393F)
 .setAuthor({ name: (EN ? "Registration Help Menu" : `${client.user.username} | Kayıt Sistemi Yardım Menüsü  `) })
 .setDescription((EN ? `<a1140647212792164352>
  Register: unregistered-role, register-channel, register-welcome, registrar, male-role, female-role, register-male, register-female.` : `<a1140647212792164352>
 **${prefix}alınacak-rol @rol** \n-> Kayıt edilen kişiden alınacak rolü ayarlar.
 **${prefix}alınacak-rol sıfırla** \n-> Kayıt edilen kişiden alınacak rolü sıfırlar.
 **${prefix}kayıt-kanal #kanal** \n-> Kayıtın yapılacağı kanalı belirlersiniz.
 **${prefix}kayıt-kanal sıfırla** \n-> Kayıtın yapılacağı kanalı sıfırlarsınız.
 **${prefix}kayıt-hg #kanal** \n-> Kayıt hoş geldin kanalını ayarlarsınız.
 **${prefix}kayıt-hg sıfırla** \n-> Kayıt hoş geldin kanalını sıfırlarsınız.
 **${prefix}kayıt-yetkili @rol** \n-> Kayıt edebilecek yetkiyi ayarlar.
 **${prefix}kayıt-yetkili sıfırla** \n-> Kayıt edebilecek yetkiyi sıfırlar.
 **${prefix}erkek-rol @rol** \n-> Kayıt edilince verilecek erkek rolü ayarlar.
 **${prefix}erkek-rol sıfırla** \n-> Kayıt edilince verilecek erkek rolünü sıfırlar.
 **${prefix}kız-rol @rol** \n-> Kayıt edilince verilecek kız rolü ayarlar.
 **${prefix}kız-rol sıfırla** \n-> Kayıt edilince verilecek kız rolünü sıfırlar.
 **${prefix}erkek @kullanıcı isim yaş** \n-> Erkekleri kayıt etmeye yarar.
**${prefix}kız @kullanıcı isim yaş** \n-> Kızları kayıt etmeye yarar.
**${prefix}k veya r!kayıt isim **/n-> Kullanıcıyı belirlediğiniz kanalda belirlediğiniz rolde kayıt eder.
`))
 .setTimestamp()
 .setImage("https://media.discordapp.net/attachments/1126239630203818095/1130479789757693952/standard.gif")
 message.channel.send({ embeds: [WestraEmbed] })
}
exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['kayıt-sistemi'],
  kategori: "Bot",
  permLevel: 0
};

exports.help = {
  name: 'kayıtsistemi',
  description: 'Bot ile ilgili bilgi verir.',
  usage: 'bilgi'
};