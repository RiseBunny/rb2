const Discord = require("discord.js");
const { getLangSync, t } = require("../dil");

exports.run = (client, message) => {
  const lang = getLangSync(message.author.id);
  let üye = new Discord.EmbedBuilder()
    .setAuthor({ name: (lang === "en" ? "Member Status" : "Üyedurum") })
    .setColor("Random")
   .addFields({ name: (lang === "en" ? "**Total Users**" : "**Toplam Kullanıcı**"), value: String(message.guild.memberCount) })
  
    .setTimestamp()
  return message.channel.send(üye);
};

module.exports.conf = {
  aliases: ["üyesayısı"],
  permLevel: 0,
  enabled: true,
  guildOnly: true
};

module.exports.help = {
  name: "üyedurum",
  description: "",
  usage: ""
};
