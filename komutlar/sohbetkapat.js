const Discord = require("discord.js");
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  if (!message.guild || !message.channel.permissionOverwrites) return;
  let every = message.guild.roles.everyone || message.guild.roles.cache.find(r => r.name === "@everyone");
  try {
    await message.channel.permissionOverwrites.edit(every, { SendMessages: false });
  } catch {
    return message.channel.send(t(lang, "ortak.hata")).catch(() => {});
  }

  const embed = new Discord.EmbedBuilder()
  .setColor("#00ff00")
  .setDescription((lang === "en" ? "**Chat channel closed successfully**" : "**Başarıyla Sohbet Kanalı Kapatılmıştır**"));
  message.channel.send({ embeds: [embed] })
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['sohbetkapat'],
  kategori: "sohbet",
  permLevel: 3
};

exports.help = {
  name: "sohbet-kapat",
  description: "kapat ac",
  usage: "prefix + sohbet-kapat"
};