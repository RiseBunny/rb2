const westradiscord = require('discord.js');
const { getLangSync, t } = require("../dil");

exports.conf = {
  enabled: true,
  guildOnly: true,
  aliases: ["bilgi", "sunucubilgi", "sunucu-bilgi", "sb"],
  permLevel: 0,
  kategori: "bot",
};

exports.help = {
  name: 'say',
  description: 'westra',
  usage: 'westra',

};
exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const seskanallari = message.guild.channels.cache.filter(c => c.isVoiceBased());
  let westracc = 0
  let  westrabroo = message.guild.members.cache.filter(m => !m.user.bot && m.user.presence?.status !== "offline").size
  let metinkanallari = message.guild.channels.cache.filter(m => m.isTextBased()).size;
  for (const [id, voiceChannel] of seskanallari) westracc += (voiceChannel.members?.size || 0);
  const sayi = (durum) => message.guild.members.cache.filter(m => m.user.presence?.status === durum).size;
  const westraembed = new westradiscord.EmbedBuilder()
  .setColor(0x36393F)
  .setTitle((lang === "en" ? "RiseBunny - Server" : "RiseBunny  - Say"))
  .setFooter({ text: "RiseBunny " })
  .setTimestamp()
  .setDescription(EN ? `
  Total members: **${message.guild.memberCount}**
  Online members: **${westrabroo}**
  Text channels: **${metinkanallari}**
  Voice channels: **${seskanallari.size}**
  Online: **${sayi('online')}**
  Idle: **${sayi('idle')}**
  Do not disturb: **${sayi('dnd')}**
` : `
  Toplam üye sayısı: **${message.guild.memberCount}**
  Toplam çevrimiçi üye sayısı: **${westrabroo}**
  Toplam metin kanalı sayısı: **${metinkanallari}**
  Toplam ses kanalı sayısı: **${seskanallari.size}**
  Toplam çevrimiçi durumda olan üye sayısı: **${sayi('online')}**
  Toplam boşta durumda olan üye sayısı: **${sayi('idle')}**
  Toplam rahatsız etme durumda olan üye sayısı: **${sayi('dnd')}**
`)
  message.channel.send({ embeds: [westraembed] })
  }