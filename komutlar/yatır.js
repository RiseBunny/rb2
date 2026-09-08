const Discord = require("discord.js");
const db = require('croxydb')
const { getLangSync, t } = require("../dil");
module.exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  
  let param = db.fetch(`para_${message.author.id}`)
    let miktar = args[0]
//-----------------------------------------------------------------------------------------------------\\   

    if(!miktar) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `⛔ Enter how much to deposit!\n\`r!deposit <amount || all>\`` : `⛔ Bankaya yatırılacak para miktarını girmelisin!
\`r!yatır <miktar || hepsi>\``)))

//-----------------------------------------------------------------------------------------------------\\
 if(miktar === 'hepsi' || miktar === 'all') {
   if(param === 0) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? "⛔ You have no money to deposit!" : "⛔ Bankaya yatırmak için hiç paran yok!")))
db.add(`bankapara_${message.author.id}`, param)
db.add(`para_${message.author.id}`, -param)   
message.channel.send(new Discord.EmbedBuilder()
.setColor("Green")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `✅ Success, you deposited ${param} 💸 to the bank!` : `✅ Başarılı, bankaya ${param} 💸 yatırdın!`)))
} else {
    if(isNaN(miktar)) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `🤔 The amount you entered is not a valid number!?` : `🤔 Girdiğin miktar geçerli bir sayı değil !?`)))  
  }
//-----------------------------------------------------------------------------------------------------\\
      if(miktar < 0 || miktar.startsWith('0')) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `🤔 Hmm, is that a valid number?` : `🤔 Geçerli sayımı acaba bu?`)))
   if (miktar > param) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `⛔ You only have ${param} 💸 to deposit` : `⛔ Bankaya yatırmak için elinde sadece ${param} 💸 var`)))
  
//-----------------------------------------------------------------------------------------------------\\
if(args[0] === 'all' || args[0] === 'hepsi') {
  return;
}  else {
message.channel.send(new Discord.EmbedBuilder()
.setColor("Green")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `✅ Success, you deposited ${miktar} 💸 to the bank!` : `✅ Başarılı, bankaya ${miktar} 💸 yatırdın!`)))
db.add(`para_${message.author.id}`, -miktar)
db.add(`bankapara_${message.author.id}`, miktar) 
  }
}
exports.conf = {
  enabled: true,
  aliases: ["dep","deposit","yatir"] };

exports.help = {
  name: 'yatır' };