const { EmbedBuilder } = require("discord.js");
const db = require("croxydb");
const { getLangSync, t } = require("../dil");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  if (!message.guild) return;
  const data = db.fetch(`invites_${message.guild.id}`) || {};
  const list = Object.keys(data).map(k => ({ Id: k, Value: (data[k].total || 0) + (data[k].bonus || 0) })).sort((x, y) => y.Value - x.Value);
  if (list.length === 0) return message.reply((lang === "en" ? "No invite data yet." : "Henüz davet verisi yok."));
  const satirlar = list.slice(0, 10).map((item, index) => "`" + (index + 1) + ".` <@" + item.Id + ">: `" + item.Value + (lang === "en" ? " Invites`" : " Davet`")).join("\n");
  const embed = new EmbedBuilder().addFields({ name: (lang === "en" ? "Invites" : "Davetler"), value: satirlar.slice(0, 1000) });
  return message.channel.send({ embeds: [embed] });
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["davettop"], permLevel: 0, kategori: "davet" };
exports.help = { name: "davettop", description: "Davet sıralamasını gösterir.", usage: "davettop" };
