const WestraDiscord = require('discord.js');
const ayarlar = require('../ayarlar.json');
const { getLangSync } = require("../dil");
let prefix = ayarlar.prefix

exports.run = (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
 const WestraEmbed = new WestraDiscord.EmbedBuilder()
  .setColor(0x36393F)
 .setAuthor({ name: (EN ? "User Help Menu" : `${client.user.username} | Kullanıcı Yardım Menüsü   `) })
 .setDescription((EN ? `<a1140646053591388301>
  User: invite, shard, avatar, random-avatar, suggest, stats, snipe.` : `<a1140646053591388301> 
 **r!davet** \n-> Botu davet edersiniz.
 **r!shardbilgi** \n-> Botun shard bilgilerini gösterir.
 **r!pp** \n-> Etiketlediğiniz kişinin avatarını gösterir.
 **r!randompp** \n-> Botun ekli olduğu sunuculardaki her hangi birinin avatarını atar.
 **r!öneri** \n-> Bota öneri belirtirsiniz.
 **r!istatistik** \n-> Botun istatistiğini gösterir.
 **r!snipe** \n-> Yazdığınız son mesajı gösterir.
`))
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
  name: 'kullanıcı',
  description: 'Bot ile ilgili bilgi verir.',
  usage: 'bilgi'
};