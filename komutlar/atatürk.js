const Discord = require('discord.js');
const { getLangSync, t } = require("../dil");

exports.run = async(client, message) => {
  const lang = getLangSync(message.author.id);
     
      const atam = new Discord.EmbedBuilder()
    .setAuthor({ name: (lang === "en" ? 'Remembering Mustafa Kemal Atatürk with respect. ❤️💛' : 'Mustafa Kemal Atatürkü Saygı ve Sevgiyle Anıyoruz. ❤️💛') })
    .setColor(3447003)
        .setImage(`https://i.hizliresim.com/8CIYMl.gif`)
    return message.channel.send({ embeds: [atam] });
    
};
//OTTOMAN
exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: 0
};
//ottoman
exports.help = {
  name: 'atatürk',
  description: 'Atam',
  usage: 'atatürk'
};