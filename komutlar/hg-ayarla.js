const Discord = require("discord.js");
const ayarlar = require("../ayarlar.json");
const db = require('croxydb');
const { getLangSync, t } = require("../dil");
const { bilgiKarti } = require("./_kart");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (!message.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) return message.reply(t(lang, "sistem.yonetici"));

  let channel = message.mentions.channels.first();
  if (!channel) {
    return message.reply(t(lang, "sistem.kanalBelirt"));
  }
  db.set(`gçkanal_${message.guild.id}`, channel.id);
  // Önizleme kartı (örnek üye: komutu yazan)
  const user = message.author;
  const kart = await bilgiKarti({
    baslik: EN ? "Welcome Channel Set" : "Hoşgeldin Kanalı",
    avatarURL: user.displayAvatarURL({ extension: 'png', size: 256 }),
    satirlar: [
      `${EN ? "Channel" : "Kanal"}: #${channel.name}`,
      EN ? "Image cards will be sent here" : "Resimli kartlar buraya gelecek"
    ],
    lang, renk1: '#1f2c2c', renk2: '#5b8d7d', dosya: 'hg-ayarla.png'
  });
  message.channel.send({ content: (lang === "en" ? `| ** Image welcome-goodbye channel set to ${channel}.** ` : `| ** Resimli Hoşgeldin - Güle Güle kanalı ${channel} Olarak Ayarlandı.** `), files: [kart] });
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["gç-ayarla"],
  permLevel: 0
};

exports.help = {
  name: "giriş-çıkış-ayarla",
  description: "Giriş Çıkış Kanalını Ayarlar.",
  usage: "gç-ayarla <#kanal>"
};
