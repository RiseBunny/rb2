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
      (lang === "en" ? `❌ **You Need To Mention A Role \n > Example: __r!subscribe-staff @role__**` : `❌ **Bir Rol Etiketlemen Gerekmekte \n > Örnek: __r!abone-yetkili @rol__**`)
    );

  database.set(`aboneyetkilisi.${message.guild.id}`, rol.id);
  message.channel.send(
    (lang === "en" ? `✔️ **Subscriber staff set to "${rol}".**` : `✔️ **Abone yetkilisi başarıyla "${rol}" olarak ayarlandı.**`)
  );
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["abone-y-rol",'abone-yetkili','aboneyetkili'],
  perm: 0
};
exports.help = {
  name: "abone-yetkili"
};

exports.play = {
  kullanım: "y!abone-y-rol @rol",
  açıklama: "Abone Yetkili Rolünü Ayarlarsınız",
  kategori: "Abone"
};
