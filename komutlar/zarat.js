const Discord = require('discord.js')
const { getLangSync, t } = require("../dil");

exports.run = function(bot, message) {
  const lang = getLangSync(message.author.id);
    message.channel.send(new Discord.EmbedBuilder()
    .setColor(message.guild.members.me?.displayHexColor || "#00FF00")
    .setTitle((lang === "en" ? '🎲 Your dice: ' : '🎲 Zarın: ') + doMagicDiceVoodoo()));

    function doMagicDiceVoodoo() {
        var rand = ['1', '2', '3', '4', '5', '6'];

        return rand[Math.floor(Math.random()*rand.length)];
    }
}

exports.conf = {
  enabled: true,
  aliases: ['zar'],
  guildOnly: false,
  permLevel: 0
};

exports.help = {
  name: 'zarat',
  description: 'Zar Atın',
  usage: ''
};