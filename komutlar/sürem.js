const Discord = require('discord.js');
const db = require('croxydb');
const fs = require('fs');
let ayarlar = require('../ayarlar.json');
const { getLangSync } = require("../dil");
const { isPremium } = require("../utils");
const { bilgiKarti } = require("./_kart");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const user = message.author;
  const avatar = user.displayAvatarURL({ extension: 'png', size: 256 });

  if (!isPremium(user.id)) {
    const kart = await bilgiKarti({
      baslik: user.username,
      avatarURL: avatar,
      satirlar: [
        `💎 Premium: ${EN ? "None" : "Yok"}`,
        EN ? "Get premium from the website!" : "Siteden premium alabilirsin!"
      ],
      lang, renk1: '#3d2c1f', renk2: '#a77b5e', dosya: 'sure-kart.png'
    });
    return message.channel.send({ files: [kart] });
  }

  let premiumExpiration = db.get(`premium_${user.id}`);

  if (!premiumExpiration) {
    const kart = await bilgiKarti({
      baslik: user.username,
      avatarURL: avatar,
      satirlar: [`💎 Premium: ${EN ? "Unlimited" : "Süresiz"} ♾️`],
      lang, renk1: '#3d2c1f', renk2: '#a77b5e', dosya: 'sure-kart.png'
    });
    return message.channel.send({ files: [kart] });
  }

  if (Date.now() >= premiumExpiration) {
    db.delete(`premium_${user.id}`);
    ayarlar.premiumIDs = ayarlar.premiumIDs.filter(id => id !== user.id);
    fs.writeFileSync('./ayarlar.json', JSON.stringify(ayarlar, null, 2));
    return message.reply((lang === "en" ? "Your VIP membership has expired and been cancelled." : "VIP üyeliğinizin süresi dolmuş ve iptal edilmiştir."));
  }

  const kalan = premiumExpiration - Date.now();
  const days = Math.floor(kalan / (1000 * 60 * 60 * 24));
  const hours = Math.floor((kalan / (1000 * 60 * 60)) % 24);
  const kart = await bilgiKarti({
    baslik: user.username,
    avatarURL: avatar,
    satirlar: [
      `💎 Premium: ${EN ? "Active" : "Aktif"} ✅`,
      EN ? `${days} days, ${hours} hours left` : `${days} gün, ${hours} saat kaldı`
    ],
    lang, renk1: '#3d2c1f', renk2: '#a77b5e', dosya: 'sure-kart.png'
  });
  return message.channel.send({ files: [kart] });
};

exports.conf = {
  enabled: true,
  aliases: ['vip-sürem', 'premium-sürem'],
};

exports.help = {
  name: 'sürem',
  description: 'VIP kalan süreni resimli kartla gösterir.',
  usage: 'sürem'
};
