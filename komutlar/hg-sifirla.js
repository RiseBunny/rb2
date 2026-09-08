const Discord = require("discord.js");
const db = require('croxydb');
const ayarlar = require("../ayarlar.json");
const { getLangSync, t } = require("../dil");
exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  if (!message.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild))
    return message.reply(
      t(lang, "sistem.sunucuYonet")
    );
  //Resađ Seferov?#0809
  let prefix = ayarlar.prefix;

  if (db.has(`gçkanal_${message.guild.id}`) === false) {
    const embed = new Discord.EmbedBuilder()
      .setDescription((lang === "en" ? `No welcome channel set to reset!` : `Giriş çıkışı Ayarlamadığın İçin Sıfırlayamazsın!`))
      .setColor("Red")
      .setFooter({ text: (lang === "en" ? `To set: ${prefix}welcome-set #channel` : `Ayarlamak İçin ${prefix}giriş-çıkış-ayarla #kanal`) })
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
    return;
  }
  db.delete(`gçkanal_${message.guild.id}`);

  const embed = new Discord.EmbedBuilder()
    .setDescription((lang === "en" ? `Welcome channel reset` : `Giriş Çıkış Başarıyla Sıfırlandı`))
    .setColor("Random")
    .setTimestamp();
  message.channel.send({ embeds: [embed] });
  return;
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["giriş-çıkış-sıfırla"],
  permLevel: 0
};

exports.help = {
  name: "giriş-çıkış-kapat",
  description: "Giriş çıkışı kapatır",
  usage: "giriş-çıkış-kapat"
};