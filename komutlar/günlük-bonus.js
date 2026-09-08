const { EmbedBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const { isPremium } = require("../utils");

const GUN = 86400000;

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const uid = message.author.id;

  if (!isPremium(uid)) {
    const e = new EmbedBuilder().setColor("Red").setTitle(EN ? "💎 Premium Only" : "💎 Sadece Premium")
      .setDescription(EN ? "This command is for premium members only. Buy premium with `buy-premium`." : "Bu komut sadece premium üyelere özeldir. `premium-al` ile premium alabilirsin.");
    return message.channel.send({ embeds: [e] });
  }

  const son = Number(db.fetch(`gunlukbonus_${uid}`) || 0);
  if (Date.now() - son < GUN) {
    const kalan = GUN - (Date.now() - son);
    const saat = Math.floor(kalan / 3600000);
    const dk = Math.floor((kalan % 3600000) / 60000);
    return message.reply(EN ? `You already claimed your premium bonus! Come back in **${saat}h ${dk}m**.` : `Premium bonusunu zaten aldın! **${saat}s ${dk}dk** sonra tekrar gel.`);
  }

  const odul = Math.floor(Math.random() * 30000) + 30000; // 30.000 - 60.000
  db.add(`para_${uid}`, odul);
  db.set(`gunlukbonus_${uid}`, Date.now());

  const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "💎 Premium Daily Bonus" : "💎 Premium Günlük Bonus")
    .setDescription(EN ? `You claimed **${odul.toLocaleString()} 💸** as your premium daily bonus!` : `Premium günlük bonusun olarak **${odul.toLocaleString()} 💸** aldın!`);
  await message.channel.send({ embeds: [e] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["gunluk-bonus", "premium-bonus", "daily-bonus"], permLevel: 0, kategori: "premium" };
exports.help = { name: "günlük-bonus", description: "Premium üyelere özel günlük bonus.", usage: "günlük-bonus" };
