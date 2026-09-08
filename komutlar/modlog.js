const Discord = require('discord.js')
const db = require('croxydb')
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  if (!message.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) return message.channel.send(t(lang, "sistem.yonetici"));

let logk = message.mentions.channels.first();
let logkanal = await db.fetch(`log_${message.guild.id}`)
  
  if (args[0] === "sıfırla" || args[0] === "kapat") {
    if(!logkanal) return message.channel.send((lang === "en" ? `<a770187639801774080> Mod-log channel is not set.` : `<a770187639801774080> Mod-log kanalı zaten ayarlı değil.`));
    db.delete(`log_${message.guild.id}`)
   message.channel.send((lang === "en" ? `<a770187639801774080> Mod-log channel reset.` : `<a770187639801774080> Mod-log kanalı başarıyla sıfırlandı.`));
    return
  }
  
if (!logk) return message.channel.send((lang === "en" ? `<a770187639801774080> Wrong usage, correct: r!mod-log #channel` : `<a770187639801774080> Yanlış kullanım doğru kullanım: r!mod-log #kanal`));

db.set(`log_${message.guild.id}`, logk.id)

message.channel.send((lang === "en" ? `<a770187690402250772> Mod-log channel set to ${logk}.` : `<a770187690402250772> Mod-log kanalı başarıyla ${logk} olarak ayarlandı.`));
  message.react('607634966959882250').catch(() => {});

};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ['mod-log','modlog','log-ayarlama'],
    permLevel: 3,
  kategori:'moderasyon'
};

exports.help = {
    name: 'mod-log',
    description: 'Mod-Log kanalını belirler.',
    usage: 'mod-log <#kanal>'
};