const Discord = require(`discord.js`)
const { getLangSync, t } = require("../dil");

exports.run = async(client, message)=> {
  const lang = getLangSync(message.author.id);
  
  let user = message.mentions.users.first() || message.author
  if(user){
    
const embed = new Discord.EmbedBuilder()
//.setAuthor({ name: (lang === "en" ? `Avatar of ${user.tag}:` : `${user.tag} adlı kullanıcının avatarı:`) })
 .setDescription((lang === "en" ? `Avatar of ${message.author.tag}:` : `${message.author.tag} adlı kullanıcının avatarı:`))
.setImage(user.displayAvatarURL({})) 
.setTimestamp()
.setColor(`Blue`)
.setFooter({ text: `RiseBunny` })
message.channel.send({ embeds: [embed] })
 } else {
  const embed = new Discord.EmbedBuilder()
//.setAuthor({ name: (lang === "en" ? `Avatar of ${message.author.tag}:` : `${message.author.tag} adlı kullanıcının avatarı:`) })
  .setDescription((lang === "en" ? `Avatar of ${message.author.tag}:` : `${message.author.tag} adlı kullanıcının avatarı:`))
.setImage(message.author.displayAvatarURL({}))
.setTimestamp()
  .setColor(`Blue`)
.setFooter({ text: `RiseBunny` })
message.channel.send({ embeds: [embed] })
 }
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    aliases: ["avatar","avatarım"],
    permLevel: 0
}

exports.help = {
    name: 'pp' }