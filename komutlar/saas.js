const db = require('croxydb')
const Discord = require('discord.js')
const { getLangSync, t } = require("../dil");

exports.run = async (bot, message, args) => {
  const lang = getLangSync(message.author.id);
    
    
    if (!message.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) return message.channel.send(t(lang, "sistem.sunucuYonet"))
    if (!args[0]) return message.channel.send((lang === "en" ? '**To enable the greeting text write `r!greeting on or off`**' : (lang === "en" ? '**To enable greeting write `r!greeting on or off`**' : '**Sa-as yazısını açmak için `r!sa-as aç veya kapat`**')))
    
    if (args[0] == 'aç') {
        db.set(`saas_${message.guild.id}`, 'açık')
        message.channel.send((lang === "en" ? `**Greeting \`sa-as\` ON, I will reply to \`sa\`.**` : `**Başarıyla \`sa-as Sistemini\` Açtınız, Artık Bot \`sa\` Yazıldığında Cevap Verecek.**`))
        
    }
    if (args[0] == 'kapat') {
        db.set(`saas_${message.guild.id}`, 'kapali')
        
        message.channel.send((lang === "en" ? `**Greeting \`sa-as\` OFF, I will stay silent.**` : `**Başarıyla \`sa-as Sistemini\` Kapattınız, Artık Bot \`sa\` Yazıldığında Cevap Vermeyecek.**`))
        
    }
    
}

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ['saas'],
    permLevel: 3
};

exports.help = {
    name: 'sa-as',
    description: 'Selamün aleyküm, Aleyküm selam',
    usage: 'r!sa-as'
};