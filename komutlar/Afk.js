const db = require('croxydb');
const Discord = require("discord.js");
const ayarlar = require("../ayarlar.json");
const { getLangSync, t } = require("../dil");
let prefix = ayarlar.prefix;

exports.run = function(client, message, args) {
  const lang = getLangSync(message.author.id);

  var USER = message.author;
  var REASON = args.slice(0).join("  ");
  const embed = new Discord.EmbedBuilder()
  .setColor("#00ff00")
  .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
  .setDescription((lang === "en" ? `Specify A Reason To Go AFK.\n\n Example Usage: ${prefix}afk <reason>` : `Afk Olmak İçin Bir Sebep Belirtin.\n\n Örnek Kullanım : ${prefix}afk <sebep>`))
  if(!REASON) return message.channel.send({ embeds: [embed] })
  db.set(`afk_${USER.id}`, REASON);
  db.set(`afk_süre_${USER.id}`, Date.now());
  const afk = new Discord.EmbedBuilder()
  .setColor("#00ff00")
  .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
  .setDescription((lang === "en" ? `You Have Successfully Entered \`AFK\` Mode For ${REASON}.` : `Başarıyla ${REASON} Sebebiyle \`Afk\` Moduna Başarıyla Girildi.`))
  message.channel.send({ embeds: [afk] })
 
};
 
exports.conf = {
  enabled: true,
  guildOnly: true,
  aliases: [],
  permLevel: 0
};
 
exports.help = {
  name: 'afk',
  description: 'afk komutu',
  usage: 'afk'
};