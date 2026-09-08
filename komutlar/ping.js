const Discord = require('discord.js');
const db = require('croxydb')
const { getLangSync, t } = require("../dil");

exports.run = async(client, message, args) => {
  const lang = getLangSync(message.author.id);
//ottamancode
let pingmesaj;//ottamancode
let pingdurum;

let mesaj;
  let mesajdurum;
if(Date.now() - message.createdAt < 100){//ottamancode

mesaj = ""
mesajdurum = "#ff0000"
}
if(Date.now() - message.createdAt < 60){
mesaj = ""
mesajdurum = "#ffff00"
}
if(Date.now() - message.createdAt < 30){
mesaj = " "
mesajdurum = "#66ff00"
}
if(Date.now() - message.createdAt > 100){
mesaj = ""
mesajdurum = "#ff0000"
}

if(Date.now() - message.createdAt > 60){
mesaj = ""
mesajdurum = "#ffff00"
}//ottamancode
if(Date.now() - message.createdAt > 150){
mesaj = ""
mesajdurum = "#ff0000"
}
if(Date.now() - message.createdAt > 250){
mesaj = ""
mesajdurum = "#ff0000"
}
if(Date.now() - message.createdAt > 500){
mesaj = " "
mesajdurum = "#66ff00"
}
if(Date.now() - message.createdAt > 1000){
mesaj = " "
mesajdurum = "#66ff00"
}

if(client.ws.ping < 100){
pingmesaj = ""
pingdurum = "#ff0000"
}
if(client.ws.ping < 60){
pingmesaj = ""
pingdurum = "#ffff00"
}
if(client.ws.ping < 30){
pingmesaj = " "
pingdurum = "#66ff00"
}
if(client.ws.ping > 100){
pingmesaj = ""
pingdurum = "#ff0000"
}

if(client.ws.ping > 60){
pingmesaj = ""
pingdurum = "#ffff00"
}
if(client.ws.ping > 150){
pingmesaj = ""
pingdurum = "#ff0000"
}
if(client.ws.ping > 250){
pingmesaj = ""
pingdurum = "#ff0000"
}
if(client.ws.ping > 500){
pingmesaj = " "
pingdurum = "#66ff00"
}
if(client.ws.ping > 1000){
pingmesaj = " "
pingdurum = "#66ff00"
}
const ottamanembed = new Discord.EmbedBuilder()
.setTitle('RiseBunny  | Ping')
.setDescription((lang === "en" ? `Latency: ${client.ws.ping+ "ms"} ${pingmesaj}\n\nMessage Latency: ${(Date.now() - message.createdAt)+ "ms"} ${mesaj}` : `Gecikme: ${client.ws.ping+ "ms"} ${pingmesaj}\n\nMesaj Gecikmesi: ${(Date.now() - message.createdAt)+ "ms"} ${mesaj}`))
.setImage('https://api.alexflipnote.dev/supreme?text='+ client.ws.ping +'%20Ping')
.setColor(pingdurum)
.setFooter({ text: (lang === "en" ? `${message.author.username} used the command.` : `${message.author.username} komutu kullandı.`) })
message.channel.send({ embeds: [ottamanembed] })

}
//ottamancode

  

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['botping','bot-ping'],
  permLevel: 0
};

exports.help = {
  name: 'ping',
};