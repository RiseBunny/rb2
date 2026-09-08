const { getLangSync, t } = require("../dil");
const Discord = require("discord.js"),
  db = require('croxydb');

module.exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
	 if(message.author.id !== message.guild.ownerId) return message.reply(t(lang, "sistem.sunucuSahibi"))
  let kontrol = await db.fetch(`dil_${message.guild.id}`);
  let prefix = (await db.fetch(`prefix_${message.guild.id}`)) || "c?";
  if (kontrol == "agayokaga") {
    let kanal = await db.fetch(`rolk_${message.guild.id}`)
    if (!kanal) {
      const embed = new Discord.EmbedBuilder()
        .setColor(0x36393F)
        .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setDescription((lang === "en" ? `<a770187639801774080> Role protection is not set!` : `<a770187639801774080> Rol koruma sistemi zaten ayarlanmamış!`));
      message.channel.send({ embeds: [embed] });
      return;
    }
    db.delete(`rolk_${message.guild.id}`);
    const embed = new Discord.EmbedBuilder()
      .setColor(0x36393F)
      .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
      .setDescription((lang === "en" ? `<a770187639801774080> Role protection reset!` : `<a770187639801774080> Rol koruma sistemi sıfırlandı!`));
    message.channel.send({ embeds: [embed] });
    return;
  } else {
    let kanal = await db.fetch(`rolk_${message.guild.id}`)
    if (!kanal) {
      const embed = new Discord.EmbedBuilder()
        .setColor(0x36393F)
        .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setDescription((lang === "en" ? `<a770187639801774080> Role protection is not set!` : `<a770187639801774080> Rol koruma sistemi zaten ayarlanmamış!`));
      message.channel.send({ embeds: [embed] });
      return;
    }
    db.delete(`rolk_${message.guild.id}`);
    const embed = new Discord.EmbedBuilder()
      .setColor(0x36393F)
      .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
      .setDescription((lang === "en" ? `<a770187639801774080> Role protection reset!` : `<a770187639801774080> Rol koruma sistemi sıfırlandı!`));
    message.channel.send({ embeds: [embed] });
    return;
  }
};

exports.conf = {
  enabled: true,
  guildOnly: true,
  aliases: ["role-protection-reset"],
  permLevel: 3
};

exports.help = {
  name: "rol-koruma-sıfırla",
  description: "rol-koruma-sıfırla",
  usage: "rol-koruma-sıfırla"
};