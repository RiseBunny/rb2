const Discord = require('discord.js');
const db = require('croxydb');
const fs = require('fs');
let ayarlar = require('../ayarlar.json');
const ms = require("ms");
const { getLangSync, t } = require("../dil");
const { isPremium } = require("../utils");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const mentioned = message.mentions.users.first();
  if (!mentioned) {
    if (!isPremium(message.author.id)) return message.reply((lang === "en" ? "You have no active VIP membership." : "Aktif VIP üyeliğin yok."));
    
    let premiumExpiration = db.get(`premium_${message.author.id}`);
    if (!premiumExpiration) return message.reply((lang === "en" ? "You have VIP, but it is set as unlimited." : "VIP üyeliğiniz var fakat süresiz olarak ayarlanmış."));

    const kalan = premiumExpiration - Date.now();
    if(kalan <= 0) {
        db.delete(`premium_${message.author.id}`);
        ayarlar.premiumIDs = ayarlar.premiumIDs.filter(id => id !== message.author.id);
        fs.writeFileSync('./ayarlar.json', JSON.stringify(ayarlar, null, 2));
        return message.reply((lang === "en" ? "Your VIP time has expired and been cancelled." : "VIP süreniz dolmuş ve iptal edilmiştir."));
    }
    const days = Math.floor(kalan / (1000 * 60 * 60 * 24));
    const hours = Math.floor((kalan / (1000 * 60 * 60)) % 24);
    return message.reply((lang === "en" ? `Remaining VIP time: ${days} days, ${hours} hours.` : `Kalan VIP süren: ${days} gün, ${hours} saat.`));
  }

  if (message.author.id !== ayarlar.sahip) return message.reply(t(lang, "ortak.sahipSadece"));
  const duration = ms(args[1] || "30d");
  if (!duration || duration < 60000) return message.reply((lang === "en" ? "You must write a valid duration. Example: 30d, 12h." : "Geçerli bir süre yazmalısın. Örnek: 30d, 12h."));
  
  if(!ayarlar.premiumIDs.includes(mentioned.id)) {
      ayarlar.premiumIDs.push(mentioned.id);
      fs.writeFileSync('./ayarlar.json', JSON.stringify(ayarlar, null, 2));
  }
  db.set(`premium_${mentioned.id}`, Date.now() + duration);

  const days = Math.floor(duration / (1000 * 60 * 60 * 24));
  return message.reply((lang === "en" ? `${mentioned.tag} VIP set for ${days} days.` : `${mentioned.tag} için VIP süresi ${days} gün olarak ayarlandı.`));
};

exports.conf = { enabled: true, aliases: ["vipsüre"], permLevel: 0, kategori: "premium" };
exports.help = { name: "vip", description: "VIP kalan süresini gösterir veya VIP tanımlar.", usage: "vip [@kullanıcı] [süre]" };