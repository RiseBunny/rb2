const Discord = require('discord.js');
const db = require('croxydb');
const ayarlar = require('../ayarlar.json');
const { getLangSync, t } = require("../dil");
const { isPremium, SAHIP_ID } = require("../utils");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
    // Premium Check
    if (!isPremium(message.author.id) && message.author.id !== SAHIP_ID) {
        return message.reply(t(lang, "ortak.premiumGerek"));
    }

    let isEnabled = db.fetch(`premiumKoruma_${message.guild.id}`);
    if (isEnabled) {
        db.delete(`premiumKoruma_${message.guild.id}`);
        message.reply((lang === "en" ? "Premium server protection **disabled**!" : "Premium sunucu koruması **kapatıldı**!"));
    } else {
        db.set(`premiumKoruma_${message.guild.id}`, true);
        message.reply((lang === "en" ? "Premium server protection **enabled**!" : "Premium sunucu koruması **açıldı**!"));
    }
};

exports.conf = {
    enabled: true,
    aliases: ['ykoruma', 'premium-koruma'],
    kategori: "yapayzeka",
};

exports.help = {
    name: 'y-koruma',
    description: 'Premium koruma modunu açar veya kapatır.',
    usage: 'y-koruma'
};
