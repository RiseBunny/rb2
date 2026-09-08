const discord = require('discord.js');
exports.run = async (client, message, args) => {
  const wembed = new discord.EmbedBuilder()
  .setColor("Blue")
  .setTimestamp()
  .setDescription(`https://discord.com/channels/${message.guild.id}/${message.author.lastMessageChannelID}/${message.author.lastMessageID}`)
  message.channel.send({ embeds: [wembed] })
}
exports.conf = {
  enabled: true,
  guildOnly: true,
  aliases: ["son-mesaj","snipe"],
  permLevel: 0
}

exports.help = {
  name: 'sonmesaj'
};