const Discord = require('discord.js');
const database = require('croxydb');
const ayarlar = require('../ayarlar.json');
const { getLangSync, t } = require("../dil");
const { isPremium } = require("../utils");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const premiumIDs = ayarlar.premiumIDs || [];

  // Premium ID kontrolü eklendi.
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
  

  if (!args[0]) {
    const embed = new Discord.EmbedBuilder()
      .setColor('Blue')
      .setTitle((lang === "en" ? 'Tag Setting' : 'Tag Ayarı'))
      .setDescription((lang === "en" ? 'To set or reset the tag:\n\nSet Tag: `r!ai-register-tag YOURTAG`\nReset Tag: `r!ai-register-tag reset`' : 'Tag ayarlamak veya sıfırlamak için:\n\nTag Ayarla: `r!ykayıt-tag TAGINIZ`\nTag Sıfırla: `r!ykayıt-tag sıfırla`'));

    return message.channel.send({ embeds: [embed] });
  }

  if (args[0] === 'sıfırla') {
    database.delete(`kayıt-tag.${message.guild.id}`);
    return message.channel.send((lang === "en" ? 'Tag reset successfully!' : 'Tag başarıyla sıfırlandı!'));
  } else {
    database.set(`kayıt-tag.${message.guild.id}`, args[1]);
    return message.channel.send(new Discord.EmbedBuilder()
      .setColor('Blue')
      .setTitle((lang === "en" ? 'Tag Set Successfully!' : 'Tag Başarıyla Ayarlandı!'))
      .setDescription((lang === "en" ? `» Set Tag: **${args[1]}**!` : `» Ayarlanan Tag: **${args[1]}** olarak ayarlandı!`)));
  }
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['y-kayıttag','y-kayıt-tag'],
  permLevel: 1,
   kategori: "yapayzeka"
};

exports.help = {
  name: 'ykayıt-tag'
};
