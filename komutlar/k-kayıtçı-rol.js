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
  const bilgi = komutBilgi(lang, "kayıtçı-rol");
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "sistem.yonetici"))] });
  if (args[0] === "sıfırla") {
    db.delete(`kayıtçırol_${message.guild.id}`);
    return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.kayitciSifirlandi"))] });
  }
  const rol = message.mentions.roles.first();
  if (!rol) return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.kayitciBelirt", { tur: t(lang, "kayitSistem.kayitci") }))] });
  db.set(`kayıtçırol_${message.guild.id}`, rol.id);
  return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.kayitciAyarlandi", { tur: t(lang, "kayitSistem.kayitci"), rol: `${rol}` }))] });
};
exports.conf = { enabled: true, guildOnly: true, aliases: ['kayıtçırol', 'kayıtçı', 'kayıt-yetkili'], permLevel: 0, kategori: "kayit" };
exports.help = { name: "kayıtçı-rol", description: "kayıtçı rolünü ayarlar", usage: "kayıtçı-rol @rol" };
