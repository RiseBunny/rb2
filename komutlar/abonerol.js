let database = require('croxydb');
const Discord = require("discord.js");
const { getLangSync, t } = require("../dil");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  if (!message.member.permissions.has(Discord.PermissionFlagsBits.Administrator))
    return message.channel.send(
      t(lang, "sistem.yetkiYok")
    );

  let rol = message.mentions.roles.first();
  if (!rol)
    return message.channel.send(
      (lang === "en" ? `>💲 **Mention A Role \n > Example: __r!subscribe-role @role__**` : `>💲 **Bir Rol Etiketlemen Gerekmekte \n > Örnek: __r!abonerol @rol__**`)
    );

  database.set(`abonerol.${message.guild.id}`, rol.id);
  message.channel.send(
    (lang === "en" ? `✔️ **Subscriber role set to "${rol}".**` : `✔️ **Abone rolü başarıyla "${rol}" olarak ayarlandı.**`)
  );
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["abone-rol"],
    permLevel: 0,
    kategori: "abone"
};
exports.help = {
  name: "abonerol",
  description: "Abone rolünü ayarlar.",
  usage: "abonerol @rol"
};

exports.play = {
  kullanım: "y!abonerol @rol",
  açıklama: "Abone Rolünü Ayarlarsınız",
  kategori: "Abone"
};
