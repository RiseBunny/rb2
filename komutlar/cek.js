const Discord = require("discord.js");
const db = require('croxydb')
const { getLangSync, t } = require("../dil");
module.exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  


  
  let bankapara = db.fetch(`bankapara_${message.author.id}`)
    let miktar = args[0]
//-----------------------------------------------------------------------------------------------------\\   

    if(!miktar) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `⛔ Enter how much to withdraw!\n\n\`r!withdraw <amount || all>\`` : `⛔ Bankadan çekmek istediğin para miktarını girmelisin!

\`r!çek <miktar || hepsi>\``)))

  //-----------------------------------------------------------------------------------------------------\\
 if(miktar === 'all' || args[0] === 'hepsi') {
   if(bankapara === 0) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `⛔ You have no money to withdraw!` : `⛔ Bankadan çekmek için hiç paran yok!`)))
db.add(`bankapara_${message.author.id}`, -bankapara)
db.add(`para_${message.author.id}`, bankapara)   
message.channel.send(new Discord.EmbedBuilder()
.setColor("Green")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `✅ Success, you withdrew ${bankapara} 💸 from the bank!` : `✅ Başarılı, bankadan ${bankapara} 💸 çektin!`)))
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
.setDescription((lang === "en" ? `🤔 The amount you entered is not a valid number!?` : `🤔 Girdiğin miktar geçerli bir sayı değil !?`)))
   if (miktar > bankapara) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `⛔ You only have ${bankapara} 💸 in the bank right now` : `⛔ Şuan bankanda sadece ${bankapara} 💸 var`)))
  
//-----------------------------------------------------------------------------------------------------\\
if(args[0] === 'all' || args[0] === 'hepsi') {
  return;
}  else {
message.channel.send(new Discord.EmbedBuilder()
.setColor("Green")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription(`<775339203105259540> Başarılı, bankadan ${miktar} 💸 çektin!`))
db.add(`para_${message.author.id}`, miktar)
db.add(`bankapara_${message.author.id}`, -miktar) 
  }
}
exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["with","cek","withdraw","paraçek"],
  permLevel: 0
};

exports.help = {
  name: 'çek' };