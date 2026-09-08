const Discord = require('discord.js');
const { getLangSync, t } = require("../dil");

exports.run = async(client, message, args) => {
  const lang = getLangSync(message.author.id);
    let type = args.slice(0).join(' ');
    if (type.length < 1) return message.channel.send((lang === "en" ? 'Wrong Usage! Example: Correct Usage: r!request counter command' : 'Yanlış Kullanım! Örnek:Doğru Kullanım : r!istek sayaç komutu'))
const embed = new Discord.EmbedBuilder()
.setColor('0000bf')
.setDescription((lang === "en" ? 'Your Request Has Been Reported Successfully \nWe Will Reply Soon In The <#1192951046012670204> Channel. ' : 'İstek Kodunuz başarıyla bildirildi  \nEn Yakın Zamanda <#1192951046012670204>  Kanalından Cevap Vereceğiz. '))
message.channel.send({ embeds: [embed] })
const embed2 = new Discord.EmbedBuilder()
.setColor("0000bf")
.setDescription((lang === "en" ? `**Request by ${message.author.tag} ;**` : `**${message.author.tag}** adlı kullanıcının **isteği ;**`))
.addFields({ name: (lang === "en" ? `**Sender Info**` : `**Gönderen Kişinin Bilgileri**`), value: (lang === "en" ? `__ID: ${message.author.id}\nName: ${message.author.username}\n<Tag: ${message.author.discriminator}__` : `__Kullanıcı ID: ${message.author.id}\nKullanıcı Adı: ${message.author.username}\n<Kullanıcı Tagı: ${message.author.discriminator}__`) })
.addFields({ name: (lang === "en" ? "**Sent Request/Suggestion Message**" : "**Gönderilen İstek/Tavsiye Mesajı**"), value: type })
.setThumbnail(message.author.displayAvatarURL())
const hedefKanal = client.channels.cache.get('1192951046012670204'); //Mesajın Gideceği Kanal ID
if (hedefKanal) hedefKanal.send({ embeds: [embed2] }).catch(() => {});

};

exports.conf = {
    enabled: true,
    guildOnly: true,
    aliases: ['istekkod','istek-kod'],
  permLevel: 0
}

exports.help = {
    name: 'istek',
    description: 'Sunucuya giren kullanıcıya seçtiğiniz rolü otomatik verir.',
    usage: 'istek <istek>'
}
//Space