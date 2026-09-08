const Discord = require("discord.js")
const db = require('croxydb')
const { getLangSync, t } = require("../dil");
exports.run = (client, message, args) => {
  const lang = getLangSync(message.author.id);
  
   
  let code = args[1]
  let kişi = ''
  const tum = db.all() || {};
  const ids = Object.keys(tum).filter(k => k.startsWith('karalist_'));
  for (const id of ids) {
    kişi += id.replace('karalist_', '<@') + "> \n"
  }
  if (!kişi) kişi = lang === "en" ? "The blacklist is empty." : "Karaliste boş.";

  const embed = new Discord.EmbedBuilder()
  .setAuthor({ name: (lang === "en" ? " Blacklist" : " Karaliste Listesi"), iconURL: client.user.displayAvatarURL() })
  .setColor(0x36393F)
  .setDescription(kişi)
  .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
  return message.channel.send({ embeds: [embed] })



 
}

exports.conf = {
  enabled : true,
  guildOnly : false,
  aliases : ["karalisteliste"],
  permLevel : 0
}

exports.help = {
  name : 'karaliste-liste',
  description : 'Gold Üyeleri Gösterir.',
  usage : 'r!gold-liste'
}