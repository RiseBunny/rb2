const Discord = require('discord.js');
const db = require('croxydb')
const { getLangSync, t } = require("../dil");
exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id); 
const ayarlar = require("../ayarlar.json");
let prefix = await db.fetch(`prefix.${message.guild.id}`) || ayarlar.prefix     
let rol = message.mentions.roles.first() 
let kanal = message.mentions.channels.first()
if (!message.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) return message.channel.send(t(lang, "sistem.yonetici"));
 
 if(!rol) return message.channel.send((lang === "en" ? ` Mention a role.\nExample: ${prefix}autorole-set @role #channel` : ` Bir rol etiketlemelisin.\nÖrnek kullanım: ${prefix}otorol-ayarla @rol #kanal`))
 
 if(!kanal) return message.channel.send((lang === "en" ? ` Mention a channel.\nExample: ${prefix}autorole-set @role #channel` : ` Bir kanal etiketlemelisin.\nÖrnek kullanım: ${prefix}otorol-ayarla @rol #kanal`))
 
  message.channel.send((lang === "en" ? ` Autorole enabled. Role set to **${rol}**, channel set to **${kanal}**.` : ` Otorol başarıyla aktif edildi. Otorol rolü **${rol}** olarak ayarlandı. Otorol kanalı **${kanal}** olarak ayarlandı.`))

 
  db.set(`otoRL_${message.guild.id}`, rol.id)  
  db.set(`otoRK_${message.guild.id}`, kanal.id) 
};
exports.conf = {
    enabled: true,
    guildOnly: false,
    permLevel: 0,
    aliases: ['otorol-ayarla']
  };
  
  exports.help = {
    name: 'otorol-ayarla',
    description: 'Türkiyenin Saatini Gösterir',
    usage: 'gç'
  };