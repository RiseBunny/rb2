let database = require('croxydb');
const Discord = require("discord.js");
const { getLangSync, t } = require("../dil");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  if (!message.member.permissions.has(Discord.PermissionFlagsBits.Administrator))
    return message.channel.send(
      (lang === "en" ? `❌ You do not have the required permission to use this command.` : `❌ Bu komutu kullanabilmek için gerekli yetkiye sahip değilsin.`)
    );

  let log = message.mentions.channels.first();
  if (!log)
    return message.channel.send(
      (lang === "en" ? `> <822546675221397584> **Mention A Channel \n > Example __r!subscribe-log #channel__**` : `> <822546675221397584> **Bir Kanal Etiketlemen Gerekmekte \n > Örnek __r!abonelog #kanal__**`)
    );

  database.set(`abonelog.${message.guild.id}`, log.id);
  message.channel.send(
    (lang === "en" ? `<822545421628342312> **Subscriber channel set to "${log}".**` : `<822545421628342312> **Abone kanalı başarıyla "${log}" olarak ayarlandı.**`)
  );
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["abone-log"],
  perm: 0
};
exports.help = {
  name: "abonelog"
};

exports.play = {
  kullanım: "abonelog #kanal",
  açıklama: "Abone Logunu Ayarlarsınız",
  kategori: "Abone"
};
