const Discord = require("discord.js");
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  if (!message.guild || !message.channel.permissionOverwrites) return;
  let every = message.guild.roles.everyone || message.guild.roles.cache.find(r => r.name === "@everyone");
  try {
    await message.channel.permissionOverwrites.edit(every, { SendMessages: true });
  } catch {
    return message.channel.send(t(lang, "ortak.hata")).catch(() => {});
  }

  const Embed = new Discord.EmbedBuilder()
      .setColor("#00ff00")
  .setDescription((lang === "en" ? "**Chat channel opened successfully**" : "**Başarıyla Sohbet Kanalı Açılmıştır**"));
  message.channel.send({ embeds: [Embed] })
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['sohbetaç'],
  kategori: "sohbet",
  permLevel: 3
};

exports.help = {
  name: "sohbet-aç",
  description: "kapat ac",
  usage: "prefix + sohbet-aç"
};
