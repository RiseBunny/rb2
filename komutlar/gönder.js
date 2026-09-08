const Discord = require("discord.js");
const db = require('croxydb')
const { getLangSync, t } = require("../dil");
module.exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);

  let para = db.fetch(`para_${message.author.id}`)
  
  let etiket = message.mentions.users.first()

  let  miktar = args[1]
  
  if(!etiket) return message.channel.send(new Discord.EmbedBuilder()
                      .setColor("Red")
                      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })                   
                      .setDescription(t(lang, "sistem.kullaniciBelirt")))

  if(! miktar) return message.channel.send(new Discord.EmbedBuilder()
                      .setColor("Red")
                      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
                      .setDescription((lang === "en" ? `Enter the amount to send!\n\`r!send-money <amount || all>\`` : `Göndermek istediğin para miktarını girmelisin!
                      \`c!gönder <miktar || hepsi>\``)))
  if(miktar < 0 ||  miktar.startsWith('0') ) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `🤔 The amount you entered is not a valid number!?` : `🤔 Girdiğin miktar geçerli bir sayı değil !?`)));
 if(miktar === 'all' || miktar === 'hepsi') {
   if(para < 0) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `⛔ You have no money right now.` : `⛔ Şuan elinde hiç para yok.`)))
db.add(`para_${etiket.id}`, para)
db.add(`para_${message.author.id}`, -para)   
message.channel.send(new Discord.EmbedBuilder()
.setColor("Green")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `✅ Success, you sent ${para} 💸 to ${etiket}!` : `✅ Başarılı, ${etiket}'a ${para} 💸 gönderdin!`)))

 } else {
  if(isNaN(miktar)) return message.channel.send(new Discord.EmbedBuilder()
.setColor("Red")
.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
.setDescription((lang === "en" ? `🤔 The amount you entered is not a valid number!?` : `🤔 Girdiğin miktar geçerli bir sayı değil !?`)))
 } 
  if(etiket.id === message.author.id) return message.channel.send(new Discord.EmbedBuilder()
                      .setColor("Red")
                      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })               
                      .setDescription((lang === "en" ? `⛔ You cannot send money to yourself!` : `⛔ Kendine para gönderemezsin!`)))

  if(miktar > para) return message.channel.send(new Discord.EmbedBuilder()
                      .setColor("Red")
                      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })                 
                      .setDescription((lang === "en" ? `⛔ Right now you ${para ? "only have " + para + " 💸!": "have no money!"} ` : `⛔ Şuan elinde ${para ? "sadece " + para + " 💸 var!": "hiç para yok!"} `)))
if(miktar === 'all' || miktar === 'hepsi') {
  return;
}  else { 
  message.channel.send(new Discord.EmbedBuilder()
                .setColor("Green")
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })  
                .setDescription((lang === "en" ? `✅ Success, you sent ${miktar} 💸 to ${etiket}!` : `✅ Başarılı,${etiket}'a ${miktar} 💸 gönderdin!`)))
  db.add(`para_${etiket.id}`, miktar)
  db.add(`para_${message.author.id}`, -miktar)

}};
exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["gonder"],
  permLevel: 0
};

exports.help = {
  name: 'gönder' };