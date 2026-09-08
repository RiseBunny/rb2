const { EmbedBuilder } = require("discord.js");
const moment = require("moment");
require("moment-duration-format");
const { getLang } = require("../dil");
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const user = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || message.author;
  const member = message.guild?.members.cache.get(user.id);
  const tarih = moment(user.createdAt).format("DD MM YYYY HH:mm");
  const katilma = member?.joinedAt ? moment(member.joinedAt).format("DD MM YYYY HH:mm") : "-";
  const durumMap = { online: "Aktif", idle: "Boşta", dnd: "Rahatsız Etmeyin", offline: "Çevrimdışı" };
  const durum = durumMap[member?.presence?.status] || "Bilinmiyor";
  const aktivite = member?.presence?.activities?.[0]?.name || "Yok";
  const rozetler = user.flags?.toArray().join(", ") || "Yok";

  const avatar = user.displayAvatarURL({ size: 1024 });
  const e = new EmbedBuilder()
    .setColor("#36393F")
    .setAuthor({ name: (lang === "en" ? `${user.username} | User Info` : `${user.username} | Kullanıcı Bilgi`), iconURL: message.author.displayAvatarURL() })
    .setThumbnail(avatar)
    .addFields(
      { name: (lang === "en" ? "User" : "Kullanıcı"), value: (lang === "en" ? `Name: **${user.username}**\nID: **${user.id}**\nBot: **${user.bot ? "Yes" : "No"}**\nAccount: **${tarih}**` : `Ad: **${user.username}**\nID: **${user.id}**\nBot: **${user.bot ? "Evet" : "Hayır"}**\nHesap: **${tarih}**`), inline: true },
      { name: (lang === "en" ? "Server" : "Sunucu"), value: (lang === "en" ? `Joined: **${katilma}**\nStatus: **${durum}**\nActivity: **${aktivite}**` : `Katılma: **${katilma}**\nDurum: **${durum}**\nAktivite: **${aktivite}**`), inline: true },
      { name: (lang === "en" ? "Badges" : "Rozetler"), value: `${rozetler}`.slice(0, 1000) },
      { name: "Avatar", value: (lang === "en" ? `[View](${avatar}) | [Support](https://dsc.gg/risebunny)` : `[Tıkla](${avatar}) | [Destek](https://dsc.gg/risebunny)`) }
    )
    .setFooter({ text: "RiseBunny", iconURL: message.author.displayAvatarURL() });
  return message.channel.send({ embeds: [e] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["kullanıcı-bilgi", "userinfo"], permLevel: 0, kategori: "kullanici" };
exports.help = { name: "kullanıcibilgi", description: "Kullanıcı bilgisini gösterir.", usage: "kullanıcibilgi [@kullanıcı]" };
