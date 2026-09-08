const Discord = require('discord.js');
const database = require('croxydb');
const fs = require('fs'); // fs modülünü ekledik
const { getLangSync, t } = require("../dil");
const { isPremium } = require("../utils");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  // Ayarlar dosyasını oku
  let rawdata = fs.readFileSync('ayarlar.json');
  let ayarlar = JSON.parse(rawdata);
  let premiumIDs = ayarlar.premiumIDs; // Premium kullanıcı ID'leri

  // Kullanıcının belirlediğiniz premium ID'lerden birine sahip olup olmadığını kontrol et
  if (!isPremium(message.author.id)) {
    const premiumEmbed = new Discord.EmbedBuilder()
      .setColor('Red')
      .setTitle(t(lang, "sistem.premiumBaslik"))
      .setDescription(t(lang, "ortak.premiumGerek"))
      .setImage('https://media.discordapp.net/attachments/1116091586657407076/1149387613577412608/Picsart_23-09-07_19-50-01-287.jpg');

    return message.channel.send({ embeds: [premiumEmbed] });
  }

  // Kullanıcının rolü yönetici olup olmadığını kontrol et
 if (!message.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
  return message.reply(t(lang, "sistem.yonetici"));
 }
  

  // Kayıt sistemini sıfırla
  database.delete(`kayıt-kadın.${message.guild.id}`);
  database.delete(`kayıt-tag.${message.guild.id}`);
  database.delete(`kayıt-kayıtsız.${message.guild.id}`);
  database.delete(`kayıt-erkek.${message.guild.id}`);
  database.delete(`kayıt-kanal.${message.guild.id}`);

  const successEmbed = new Discord.EmbedBuilder()
    .setColor('Random')
    .setURL('https://dsc.gg/risebunny')
    .setTitle(client.user.username + (lang === "en" ? ' | AI Registration System' : ' | AI-Kayıt Sistemi'))
    .setDescription((lang === "en" ? `AI registration has been reset!**\n\n**Tell us why with r!suggest :)**\n\n**Sorry if we made a mistake <3**` : `**Kayıt sistemi başarıyla sıfırlandı!**

**Neden sıfırladığınızı görmek isteriz.
r!öneri ile bize bildirin :)**

**Hatamız olduysa düzeltmeyi çok istiyoruz <3**`))

  return message.channel.send({ embeds: [successEmbed] });
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['y-kayıtkapat', 'y-kayıt-kapat', 'y-k-kapat'],
  permLevel: 1,
   kategori: "yapayzeka"
};

exports.help = {
  name: 'ykayıt-kapat'
};
