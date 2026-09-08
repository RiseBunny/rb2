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
  const bilgi = komutBilgi(lang, "erkek-rol");
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "sistem.yonetici"))] });
  if (args[0] === "sıfırla") {
    db.delete(`erkekrol_${message.guild.id}`);
    return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.rolSifirlandi"))] });
  }
  const rol = message.mentions.roles.first();
  if (!rol) return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.rolSec", { tur: t(lang, "kayitSistem.erkek") }))] });
  db.set(`erkekrol_${message.guild.id}`, rol.id);
  return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.rolAyarlandi", { tur: t(lang, "kayitSistem.erkek"), rol: `${rol}` }))] });
};
exports.conf = { enabled: true, guildOnly: true, aliases: ['erkekrol', 'erol', 'e-rol'], permLevel: 0, kategori: "kayit" };
exports.help = { name: "erkek-rol", description: "erkek rolünü ayarlar", usage: "erkek-rol @rol" };
