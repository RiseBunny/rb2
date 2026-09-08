const { EmbedBuilder } = require("discord.js");
const moment = require("moment");
const { getLangSync, t } = require("../dil");
require("moment-duration-format");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const rows = client.shard
    ? await client.shard.fetchClientValues("ws.ping")
    : [client.ws.ping];
  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle((lang === "en" ? "Shard info" : "Shard bilgileri"))
    .setDescription(rows.map((ping, index) => `Shard ${index + 1}: ${Math.round(ping)} ms`).join("\n"))
    .addFields(
      { name: (lang === "en" ? "Servers" : "Sunucular"), value: String(client.guilds.cache.size), inline: true },
      { name: (lang === "en" ? "Users" : "Kullanıcılar"), value: String(client.users.cache.size), inline: true },
      { name: (lang === "en" ? "Uptime" : "Çalışma süresi"), value: moment.duration(client.uptime || 0).format((lang === "en" ? "D [days], H [hours], m [minutes]" : "D [gün], H [saat], m [dakika]")) }
    );
  return message.channel.send({ embeds: [embed] });
};
exports.conf = { enabled: true, guildOnly: true, aliases: ["shardbilgi"], permLevel: 0 };
exports.help = { name: "shard", description: "Shard bilgilerini gösterir.", usage: "shard" };