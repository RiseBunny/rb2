const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("croxydb");
const { t, getLang, komutBilgi } = require("../dil");

function panel(client, baslik, metin) {
  return new EmbedBuilder()
    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
    .setTitle(baslik)
    .setColor(0x36393F)
    .setDescription(metin)
    .setThumbnail(client.user.displayAvatarURL())
    .setFooter({ text: "RiseBunny" });
}

exports.run = async (client, message, args) => {
  const lang = await getLang(message.author.id);
  const bilgi = komutBilgi(lang, "kayıt-hg");
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "sistem.yonetici"))] });
  if (args[0] === "sıfırla") {
    db.delete(`kayıthg_${message.guild.id}`);
    return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.hgSifirlandi"))] });
  }
  const kanal = message.mentions.channels.first();
  if (!kanal) return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.hgBelirt"))] });
  db.set(`kayıthg_${message.guild.id}`, kanal.id);
  return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.hgAyarlandi", { kanal: `${kanal}` }))] });
};
exports.conf = { enabled: true, guildOnly: true, aliases: [], permLevel: 0, kategori: "kayit" };
exports.help = { name: "kayıt-hg", description: "Kayıt hoş geldin kanalını ayarlar", usage: "kayıt-hg #kanal" };
