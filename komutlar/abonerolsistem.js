const Discord = require("discord.js");
const ayarlar = require("../ayarlar.json");
const { getLangSync, t } = require("../dil");
const prefix = ayarlar.prefix;
exports.run = async (bot, msg, args) => {
  const lang = getLangSync(msg.author.id);
  const seviye = new Discord.EmbedBuilder()
    .setAuthor({ name: (lang === "en" ? `RiseBunny | Subscriber System (Beta)` : `RiseBunny | AboneRol Sistemi (Beta)`) })
    .setTitle(lang === "en" ? `Subscriber System` : `Abone Sistemi`)
    .setColor("Random")
     .setDescription((lang === "en" ? `1-0 ahead with RiseBunny :) **Put my role on top or I won't work!!!  <a1140646315756359730> **
    ` : `RiseBunny ile 1-0 öndesin :) **Rölümü en üste al yoksa çalışmaz!!!  <a1140646315756359730> **
    `))
    .addFields({ name: `**__Abone__**`, value: (lang === "en" ? ` \`${prefix}subscribe\` \n Gives the subscriber role to your subscribers.` : ` \`${prefix}abone\` \n Youtubunuza Abone Olan Kişiye Abone Rol Verir.`), inline: true })
     .addFields({ name: `**__Abone Yetkili__**`, value: (lang === "en" ? ` \`${prefix}subscribe-staff\` \n Sets who can give the subscriber role.` : ` \`${prefix}abone-yetkili\` \n Abone Rölünü Verecek Kişinin AboneRol Yetkilisini Ayarlar.`), inline: true })
     .addFields({ name: `**__Abone Rol__**`, value: (lang === "en" ? ` \`${prefix}subscribe-role\` \n Sets the role given to subscribers.` : ` \`${prefix}abonerol\` \n Abone Olan Kişiye Verilecek Rölü Ayarlama.`), inline: true })
   .addFields({ name: `**__Abone Log__**`, value: (lang === "en" ? ` \`${prefix}subscribe-log\` \n Sets the log for given subscriber roles.` : ` \`${prefix}abonelog\` \n Abone Rölü Verecek Kişinin Verdigi Mesaj Logu Ayarlarsın`), inline: true });
  msg.channel.send({ embeds: [seviye] });
};
exports.conf = {
  enabled: true,
  guildOnly: true,
  aliases: ['abonerol-sistemi','abonerolsistem','abonerolsistemi'],
  permLevel: 0
};
exports.help = {
  name:"abonerol-sistem",
  description: "İstediğiniz kullanıcını bilgilerini gösterir.",
  usage: "seviye"
};
