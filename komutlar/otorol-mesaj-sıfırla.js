const Discord = require('discord.js');
const db = require('croxydb')
const { getLangSync, t } = require("../dil");
exports.run = (client, message, args) => {
  const lang = getLangSync(message.author.id); 

if (!message.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) return message.channel.send(t(lang, "sistem.yonetici"));
 const rol = db.fetch(`otoRM_${message.guild.id}`) 
 if(!rol) return message.reply((lang === "en" ? `Autorole message is not set.` : `Otorol mesajı zaten ayarlanmamış.`))
 
 
  message.channel.send((lang === "en" ? `Autorole message reset successfully.` : `Otorol mesajı başarıyla sıfırlandı.`))

 
 db.delete(`otoRM_${message.guild.id}`)  

};
exports.conf = {
    enabled: true,
    guildOnly: false,
    permLevel: 0,
    aliases: ['otorol-mesaj-sıfırla']
  };
  
  exports.help = {
    name: 'otorol-mesaj-sıfırla',
    description: 'Türkiyenin Saatini Gösterir',
    usage: 'gç'
  };