const Discord = require('discord.js');
const database = require('croxydb');
const fs = require('fs');
const { getLangSync, t } = require("../dil");
const { isPremium } = require("../utils");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  // Ayarlar dosyasını oku
  let rawdata = fs.readFileSync('ayarlar.json');
  let ayarlar = JSON.parse(rawdata);
  let premiumIDs = ayarlar.premiumIDs; // Premium kullanıcı ID'leri

  // Kullanıcının belirlediğiniz premium ID listesinde olup olmadığını kontrol et
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
  

  if (!message.mentions.roles.first()) return message.reply((lang === "en" ? 'You must mention the Female role to set!' : 'Ayarlamak istediğiniz Kadın rolünü etiketlemelisiniz!'));

  const role = message.mentions.roles.first();

  // Eğer kullanıcı gerekli role sahipse, işlemi gerçekleştir
  database.set(`kayıt-kadın.${message.guild.id}`, role.id);

  const successEmbed = new Discord.EmbedBuilder()
    .setColor('Blue')
    .setTitle((lang === "en" ? 'Role Set!' : 'Rol Başarıyla Ayarlandı!'))
    .setFooter({ text: (lang === "en" ? 'Mention again to change the role.' : 'Rolü değiştirmek istersen tekrar etiketlemelisin.') })
    .setDescription((lang === "en" ? `» Female Role set to **${role.name}**!` : `» Kadın Rolü: **${role.name}** olarak ayarlandı!`));

  return message.channel.send({ embeds: [successEmbed] });
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['y-kayıt-kadın', 'y-k-kadın', 'y-k-k', 'y-kayıtkadın', 'ykayıt-kadın'],
  permLevel: 1,
   kategori: "yapayzeka"
};

exports.help = {
  name: 'y-kayıt-kadın'
};
