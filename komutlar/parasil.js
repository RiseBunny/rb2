const Discord = require("discord.js");
const db = require('croxydb')
const ayarlar = require("../ayarlar.json")
const { getLangSync, t } = require("../dil");
module.exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  
let user = message.mentions.users.first()
let money = args[1]    
  if(message.author.id !== ayarlar.sahip) return message.react("❌")
  if(!user) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription(t(lang, "sistem.kullaniciBelirt")))

  if(!args[1]) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `⛔ You must enter how much to remove from the wallet!` : `⛔ Cüzdandan silinecek para miktarını girmelisin!`))) 
  
if(isNaN(args[1])) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `⛔ You must enter how much to remove from the wallet!` : `⛔ Cüzdandan silinecek para miktarını girmelisin!`))) 
 
if(args[1] < 0) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `🤔 The amount you entered is not a valid number!?` : `🤔 Girdiğin miktar geçerli bir sayı değil !?`))
                                                   );    

 
message.channel.send(new Discord.EmbedBuilder()
.setColor("Green")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `✅ Removed ${money} 💸 from ${user}'s wallet!` : `✅ ${user} kullanıcısının cüzdanından ${money} 💸 silindi!`)))
db.add(`para_${user.id}`,- money)  
}
  

exports.conf = {
  enabled: true,
  aliases: ["parasil"] };

exports.help = {
  name: 'para-sil' };
 