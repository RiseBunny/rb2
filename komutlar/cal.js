const Discord = require('discord.js');
const ms = require('parse-ms');
const db = require('croxydb')
const { getLangSync, t } = require("../dil");
module.exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  function rastgeleMiktar(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
} 
 let user =  message.mentions.users.first()

 if(!user) return message.channel.send(new Discord.EmbedBuilder()
                      .setColor("Red")
                      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })                   
                      .setDescription(t(lang, "sistem.kullaniciBelirt")))
  let targetuser = await db.fetch(`para_${user.id}`);
  let author     = await db.fetch(`çalma_${message.author.id}`);
  let author2    = await db.fetch(`para_${message.author.id}`);

  let timeout = 1200000;

if (author !== null && timeout - (Date.now() - author) > 0) {
  let time = ms(timeout - (Date.now() - author));
    let timeEmbed = new Discord.EmbedBuilder()
    .setColor("Red")
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
     .setDescription((lang === "en" ? `⏱ To rob someone wait ${time.minutes ? time.minutes + ' minutes,' : ''} ${time.seconds ? time.seconds + ' seconds!' : 'try again!'}` : `⏱ Birisini soymak için ${time.minutes ? time.minutes + ' dakika,' : ''} ${time.seconds ? time.seconds + ' saniye beklemelisin!' : 'tekrar dene!'}`));
    message.channel.send({ embeds: [timeEmbed] })

  } else {

    let moneyEmbed = new Discord.EmbedBuilder()
  .setColor("Red")
  .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })  
  .setDescription((lang === "en" ? `⛔ You need at least 200 💸 to steal money` : `⛔ Para çalmak için en az 200 💸 paraya ihtiyacın var`));


  if (author2 < 200) {
    return message.channel.send({ embeds: [moneyEmbed] })
  }
var lostmoney = rastgeleMiktar(150,500)
  let moneyEmbed2 = new Discord.EmbedBuilder()
  .setColor("Red")
  .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })  
  .setDescription((lang === "en" ? `⛔ You tried to rob a poor person and got fined ${lostmoney} 💸` : `⛔ Fakir birisini soymaya çalıştın ve ${lostmoney} 💸 ceza yedin`));
  

  
  if (targetuser <= 100) {
    return message.channel.send({ embeds: [moneyEmbed2] }),db.set(`çalma_${message.author.id}`, Date.now()),db.add(`para_$${message.author.id}`, -lostmoney)
db.set(`çalma_${message.author.id}`, Date.now())
db.add(`para_${message.author.id}`, -lostmoney)
  }

  let authorembed = new Discord.EmbedBuilder()
  .setColor("Red")
  .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })  
  .setDescription((lang === "en" ? `⛔ Were you thinking of robbing yourself?!` : `⛔ Kendini soymayımı düşünüyorsun?!`));

    if(user.id === message.author.id) {
    return message.channel.send({ embeds: [authorembed] })
  }

    let gotmoney = rastgeleMiktar(1000,5000)

  let embed = new Discord.EmbedBuilder()
   .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })  
   .setDescription((lang === "en" ? `✅ Heist Successful, you robbed ${user} and earned ${gotmoney} 💸` : `✅ Soygun Başarılı, ${user}'ı soydun ve ${gotmoney} 💸 kazandın`))
   .setColor("Green")

   message.channel.send({ embeds: [embed] })

    await db.add(`para_${user.id}`, -gotmoney);
await db.add(`para_${message.author.id}`, gotmoney);
await db.set(`çalma_${message.author.id}`, Date.now());
  
		}

}
exports.conf = {
  enabled: true,
  aliases: [] };

exports.help = {
  name: 'çal' };