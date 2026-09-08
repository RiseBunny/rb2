const { EmbedBuilder } = require("discord.js");
const moment = require("moment");
const { getLangSync, t } = require("../dil");
require("moment-duration-format");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const guilds = client.guilds.cache;
  const users = guilds.reduce((total, guild) => total + (guild.memberCount || 0), 0);
  const embed = new EmbedBuilder()
    .setColor("#00fff7")
    .setTitle((lang === "en" ? "Bot statistics" : "Bot istatistikleri"))
    .addFields(
      { name: (lang === "en" ? "Servers" : "Sunucular"), value: guilds.size.toLocaleString(), inline: true },
      { name: (lang === "en" ? "Users" : "Kullanıcılar"), value: users.toLocaleString(), inline: true },
      { name: (lang === "en" ? "Channels" : "Kanallar"), value: client.channels.cache.size.toLocaleString(), inline: true },
      { name: "Ping", value: `${client.ws.ping} ms`, inline: true },
      { name: (lang === "en" ? "Memory" : "Bellek"), value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
      { name: (lang === "en" ? "Uptime" : "Çalışma süresi"), value: moment.duration(client.uptime || 0).format((lang === "en" ? "D [days], H [hours], m [minutes], s [seconds]" : "D [gün], H [saat], m [dakika], s [saniye]")), inline: true }
    );
  return message.channel.send({ embeds: [embed] });
};
exports.conf = { enabled: true, guildOnly: false, aliases: ["i"], permLevel: 0 };
exports.help = { name: "istatistik", description: "Bot istatistiklerini gösterir.", usage: "istatistik" };