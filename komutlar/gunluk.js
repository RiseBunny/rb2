const Discord = require('discord.js');
const db = require('croxydb')
const ms = require('parse-ms')
const { getLangSync, t } = require("../dil");
exports.run = async(client, message) => {
  const lang = getLangSync(message.author.id);

  function rastgeleMiktar(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
} 

let times = await db.fetch(`worktime_${message.author.id}`)
  let day = 86400000

  if (times !== null && day - (Date.now() - times) > 0) {
        let time = ms(day - (Date.now() - times));
    message.channel.send(new Discord.EmbedBuilder()
                        .setColor("Red")
                        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
                        .setDescription((lang === "en" ? `⏱ To claim daily wait ${time.hours ? time.hours + " hours,": ""} ${time.minutes ? time.minutes + ' minutes,' : ''} ${time.seconds ? time.seconds + ' seconds!' : 'run the command again!'}` : `⏱ Günlük ödülünü almak için ${time.hours ? time.hours + " saat,": ""} ${time.minutes ? time.minutes + ' dakika,' : ''} ${time.seconds ? time.seconds + ' saniye beklemelisin!' : 'komutu tekrar gir!'}`)))
  return
  }
let moneys = rastgeleMiktar(2000,10000);
      message.channel.send(new Discord.EmbedBuilder()
                   .setColor("Yellow")
                   .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
                   .setDescription((lang === "en" ? `You collected your daily reward, ${moneys} 💸 added to your wallet!` : `Günlük ödülünü topladın, cüzdanına ${moneys} 💸 eklendi!`)))

db.set(`worktime_${message.author.id}`, Date.now())

  db.add(`para_${message.author.id}`, moneys)
    
 };

exports.conf = {
  enabled: true,
  aliases: ["gunluk"] };

exports.help = {
  name: 'günlük' };