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
  

  if (!message.mentions.roles.first()) {
    const embed = new Discord.EmbedBuilder()
      .setColor('Blue')
      .setTitle((lang === "en" ? 'Unregistered Role Setting' : (lang === "en" ? 'Unregistered Role' : 'Kayıtsız Rol Ayarı')))
      .setDescription((lang === "en" ? 'You must mention the Unregistered role to set!' : 'Ayarlamak istediğiniz Kayıtsız rolünü etiketlemelisiniz!'));

    return message.channel.send({ embeds: [embed] });
  }

  const role = message.mentions.roles.first();
  database.set(`kayıt-kayıtsız.${message.guild.id}`, role.id);

  const successEmbed = new Discord.EmbedBuilder()
    .setColor('Blue')
    .setTitle((lang === "en" ? 'Role Set!' : 'Rol Başarıyla Ayarlandı!'))
    .setFooter({ text: (lang === "en" ? 'Mention again to change the channel.' : 'Kanalı değiştirmek istersen tekrar etiketlemelisin.') })
    .setDescription((lang === "en" ? `» Unregistered Role set to **${role.name}**!` : `» Kayıtsız Rolü: **${role.name}** olarak ayarlandı!`));
  
  return message.channel.send({ embeds: [successEmbed] });
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['y-kayıtkayıtsız', 'y-kayıt-kayıtsız', 'y-k-kayıtsız'],
  permLevel: 1,
   kategori: "yapayzeka"
};

exports.help = {
  name: 'ykayıt-kayıtsız'
};
