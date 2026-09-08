const { EmbedBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const { isPremium } = require("../utils");

const GUN = 86400000;

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const uid = message.author.id;

  const son = Number(db.fetch(`zincir_son_${uid}`) || 0);
  const zincir = Number(db.fetch(`zincir_${uid}`) || 0);

  // Aynı gün tekrar deneme
  if (Date.now() - son < GUN) {
    const kalan = GUN - (Date.now() - son);
    const saat = Math.floor(kalan / 3600000);
    const dk = Math.floor((kalan % 3600000) / 60000);
    return message.reply(EN
      ? `You already claimed your streak today! Come back in **${saat}h ${dk}m**.`
      : `Bugünkü zincir ödülünü zaten aldın! **${saat}s ${dk}dk** sonra tekrar gel.`);
  }

  // Zincir devam mı? (1 günden fazla ara verildiyse sıfırlanır)
  const yeniZincir = (son && Date.now() - son < 2 * GUN) ? zincir + 1 : 1;

  // Ödül: zincire göre büyür, premium %50 bonus
  const taban = 2000 + (yeniZincir - 1) * 1000;
  const odul = Math.floor(taban * (isPremium(uid) ? 1.5 : 1));

  db.set(`zincir_son_${uid}`, Date.now());
  db.set(`zincir_${uid}`, yeniZincir);
  db.add(`para_${uid}`, odul);

  const e = new EmbedBuilder()
    .setColor("Gold")
    .setTitle(EN ? "🎁 Daily Streak" : "🎁 Günlük Ödül Zinciri")
    .setDescription(EN
      ? `You claimed your reward!\n**Streak:** ${yeniZincir} day(s)\n**Reward:** ${odul.toLocaleString()} 💸${isPremium(uid) ? "\n💎 Premium +50% bonus!" : ""}\nCome back tomorrow to grow your streak!`
      : `Ödülünü aldın!\n**Zincir:** ${yeniZincir} gün\n**Ödül:** ${odul.toLocaleString()} 💸${isPremium(uid) ? "\n💎 Premium +50% bonus!" : ""}\nYarın tekrar gel, zincirin büyüsün!`);

  await message.channel.send({ embeds: [e] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["zincir", "gunluk-odul", "daily-streak", "streak"], permLevel: 0, kategori: "ekonomi" };
exports.help = { name: "günlük-ödül", description: "Art arda gün sayısına göre büyüyen günlük ödül verir.", usage: "günlük-ödül" };
