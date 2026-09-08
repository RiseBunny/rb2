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
  const kayitci = db.fetch(`kayıtçırol_${message.guild.id}`);
  const kanal = db.fetch(`kayıtkanal_${message.guild.id}`);
  const alinacak = db.fetch(`alınacakrol_${message.guild.id}`);
  const hedefRol = db.fetch(`kızrol_${message.guild.id}`);
  if (!kayitci || !kanal || !hedefRol)
    return message.channel.send(t(lang, "kayitSistem.kurulumYok"));
  if (!message.member.roles.cache.has(kayitci))
    return message.channel.send(t(lang, "kayitSistem.kayitciGerek", { rol: `<@&${kayitci}>` }));
  if (message.channel.id !== kanal)
    return message.channel.send(t(lang, "kayitSistem.kanalOzel", { kanal: `<#${kanal}>` }));
  const member = message.mentions.members.first();
  if (!member) return message.channel.send(t(lang, "sistem.kullaniciBelirt"));
  const isim = args[1];
  if (!isim) return message.channel.send(t(lang, "kayitSistem.isimBelirt"));
  const yas = args[2];
  if (!yas) return message.channel.send(t(lang, "kayitSistem.yasBelirt"));
  try {
    await member.setNickname(`${isim} | ${yas}`).catch(() => {});
    if (alinacak) await member.roles.remove(alinacak).catch(() => {});
    await member.roles.add(hedefRol);
  } catch {
    return message.channel.send(t(lang, "ortak.hata"));
  }
  try { db.add(`kayıtsayı_${message.author.id}`, 1); } catch {}
  const ok = new EmbedBuilder()
    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
    .setTitle(t(lang, "kayitSistem.kizKayit"))
    .setColor(0x36393F)
    .setDescription(t(lang, "kayitSistem.kayitBasarili", { uye: `${member}`, yetkili: `${message.author}` }))
    .addFields(
      { name: t(lang, "kayitSistem.isim"), value: `${isim}`, inline: true },
      { name: t(lang, "kayitSistem.yas"), value: `${yas}`, inline: true }
    )
    .setThumbnail(member.displayAvatarURL())
    .setFooter({ text: "RiseBunny" });
  return message.channel.send({ embeds: [ok] });
};
exports.conf = { enabled: true, guildOnly: true, aliases: ['k'], permLevel: 0, kategori: "kayit" };
exports.help = { name: "kız", description: "kız olarak kayıt eder", usage: "kız @kullanıcı isim yaş" };
