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
  const bilgi = komutBilgi(lang, "kayıt-kanal");
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "sistem.yonetici"))] });
  if (args[0] === "sıfırla") {
    db.delete(`kayıtkanal_${message.guild.id}`);
    return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.kanalSifirlandi"))] });
  }
  const kanal = message.mentions.channels.first();
  if (!kanal) return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.kanalBelirt"))] });
  db.set(`kayıtkanal_${message.guild.id}`, kanal.id);
  return message.channel.send({ embeds: [panel(client, bilgi.kullanim, t(lang, "kayitSistem.kanalAyarlandi", { kanal: `${kanal}` }))] });
};
exports.conf = { enabled: true, guildOnly: true, aliases: ['kayıtkanal', 'kkanal', 'k-kanal'], permLevel: 0, kategori: "kayit" };
exports.help = { name: "kayıt-kanal", description: "Kayıt Olunacak Kanalı Ayarlar", usage: "kayıt-kanal #kanal" };
