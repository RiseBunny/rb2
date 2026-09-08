const Discord = require("discord.js");
const ayarlar = require("../ayarlar.json");
const { getLangSync, t } = require("../dil");
const { isPremium } = require("../utils");
let prefix = ayarlar.prefix;
let premiumIDs = ayarlar.premiumIDs || [];

exports.run = async (bot, msg, args) => {
  const lang = getLangSync(msg.author.id);
  const EN = lang === "en";
  if (!isPremium(msg.author.id)) {
    const premiumEmbed = new Discord.EmbedBuilder()
      .setColor('Red')
      .setTitle(t(lang, "sistem.premiumBaslik"))
      .setDescription(t(lang, "ortak.premiumGerek"))
      .setImage('https://media.discordapp.net/attachments/1116091586657407076/1149387613577412608/Picsart_23-09-07_19-50-01-287.jpg');

    return msg.channel.send({ embeds: [premiumEmbed] });
  }

  const panel = new Discord.EmbedBuilder()
    .setAuthor({ name: EN ? `RiseBunny Premium Registration | AI System (Beta)` : `RiseBunny Premium Kayıt Sistemi| YapayZeka Kayıt Sistemi (Beta)  ` })
    .setTitle(`<a1140645416828932228>`)
    .setImage('https://cdn.discordapp.com/attachments/1108819464524415097/1109034877774483466/standard_7.gif')
    .setColor('Random')
    .addFields(
      { name: EN ? `**Register Channel**` : `**Kayıt Kanalı**`, value: EN ? `💓  \`${prefix}ai-register-channel #channel\` \nSets the registration channel.` : `💓  \`${prefix}ykayıt-kanal #kanal\` \nKayıtın yapılacağı kanalı belirlersiniz.`, inline: true },
      { name: EN ? `**Unregistered Role**` : `**Kayıtsız Rol Belirle**`, value: EN ? `💓  \`${prefix}ai-register-unregistered @role\` \nRole for joiners until registered!` : `💓  \`${prefix}ykayıt-kayıtsız @rol\` \nKayıtsız rolünü sunucuya giren kişiye verir, kayıt olana kadar kalır!`, inline: true },
      { name: EN ? `**Male Role**` : `**Erkek Rolü Belirle**`, value: EN ? `💓  \`${prefix}ai-register-male @role\` \nRole for males after registration.` : `💓  \`${prefix}ykayıt-erkek @rol\` \nBelirttiğiniz erkek rolünü kullanıcılar kayıt sonrasında alır.`, inline: true },
      { name: EN ? `**Tag (Optional)**` : `**Tag Belirle (İsteğe bağlı)**`, value: EN ? `💓  \`${prefix}ai-register-tag <Tag>\` \nUsers get this tag after registering.` : `💓  \`${prefix}ykayıt-tag <Tag>\` \nBaşarılı kayıt sonrası kullanıcılar tagı alır.`, inline: true },
      { name: EN ? `**Female Role**` : `**Kadın Rolü Belirle**`, value: EN ? `💓  \`${prefix}ai-register-female @role\` \nRole for females after registration.` : `💓  \`${prefix}ykayıt-kadın @rol\` \nKadın olarak kayıt edilenlerin aldığı roldür.`, inline: true },
      { name: EN ? `**Close System**` : `**Kayıt Sistemini Kapat**`, value: EN ? `💓  \`${prefix}ai-register-close\` \nCloses AI registration, resets data!` : `💓  \`${prefix}ykayıt-kapat\` \nYapayZeka kayıt kapatılır, veriler sıfırlanır!`, inline: true }
    );
  msg.channel.send({ embeds: [panel] });
};

exports.conf = {
  enabled: true,
  guildOnly: true,
  aliases: ["y-kayıt-sistem", 'y-kayıt-sistemi', 'ykayıt-sistemi', 'ykayıtsistem', 'y-kayıtsistemi'],
  kategori: "yapayzeka",
  permLevel: 0
};

exports.help = {
  name: "ykayıt-sistem",
  description: "İstediğiniz kullanıcını bilgilerini gösterir.",
  usage: ""
};
