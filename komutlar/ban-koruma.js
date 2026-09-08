const { getLangSync, t } = require("../dil");
const Discord = require("discord.js"),
  db = require('croxydb');

module.exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
	 if(message.author.id !== message.guild.ownerId) return message.reply(t(lang, "sistem.sunucuSahibi"))
  let kontrol = await db.fetch(`dil_${message.guild.id}`);
  let prefix = (await db.fetch(`prefix_${message.guild.id}`)) || "!";
  if (kontrol == "agayokaga") {
    let kanal = message.mentions.channels.first();
    if (!kanal) {
      const embed = new Discord.EmbedBuilder()
        .setColor(0x36393F)
        .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setDescription((lang === "en" ? ` Please mention a log channel!` : ` Lütfen bir log kanalı etiketleyiniz!`));
      message.channel.send({ embeds: [embed] });
      return;
    }
    db.set(`bank_${message.guild.id}`, kanal.id);
    const embed = new Discord.EmbedBuilder()
      .setColor(0x36393F)
      .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
      .setDescription((lang === "en" ? ` Ban protection log channel set to ${kanal}!` : (lang === "en" ? `Ban protection log channel set to ${kanal}!` : ` Ban koruma log kanalı; ${kanal} olarak ayarlandı!`)));
    message.channel.send({ embeds: [embed] });
    return;
  } else {
    let kanal = message.mentions.channels.first();
    if (!kanal) {
      const embed = new Discord.EmbedBuilder()
        .setColor(0x36393F)
        .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setDescription((lang === "en" ? ` Please mention a log channel!` : ` Lütfen bir log kanalı etiketleyiniz!`));
      message.channel.send({ embeds: [embed] });
      return;
    }
    db.set(`bank_${message.guild.id}`, kanal.id);
    const embed = new Discord.EmbedBuilder()
      .setColor(0x36393F)
      .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
      .setDescription((lang === "en" ? `Ban protection log channel set to ${kanal}!` : `Ban koruma log kanalı; ${kanal} olarak ayarlandı!`));
    message.channel.send({ embeds: [embed] });
    return;
  }
};

exports.conf = {
  enabled: true,
  guildOnly: true,
  aliases: ["ban-protection"],
  permLevel: 3
};

exports.help = {
  name: "ban-koruma",
  description: "ban-koruma",
  usage: "ban-koruma"
};
