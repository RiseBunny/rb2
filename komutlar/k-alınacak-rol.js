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
  const bilgi = komutBilgi(lang, "alınacak-rol");
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "sistem.yonetici"))] });
  if (args[0] === "sıfırla") {
    db.delete(`alınacakrol_${message.guild.id}`);
    return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.alinacakSifirlandi"))] });
  }
  const rol = message.mentions.roles.first();
  if (!rol) return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.alinacakBelirt", { tur: t(lang, "kayitSistem.alinacak") }))] });
  db.set(`alınacakrol_${message.guild.id}`, rol.id);
  return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.alinacakAyarlandi", { tur: t(lang, "kayitSistem.alinacak"), rol: `${rol}` }))] });
};
exports.conf = { enabled: true, guildOnly: true, aliases: ['alınacakrol', 'arol', 'a-rol'], permLevel: 0, kategori: "kayit" };
exports.help = { name: "alınacak-rol", description: "Kayıt Olunca Alınacak Rolü Ayarlar", usage: "alınacak-rol @rol" };
