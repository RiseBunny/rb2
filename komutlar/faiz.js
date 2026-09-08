const { EmbedBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const { isPremium } = require("../utils");

const GUN = 86400000;

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const uid = message.author.id;

  const banka = Number(db.fetch(`bankapara_${uid}`) || 0);
  if (banka <= 0) return message.reply(EN ? "Your bank balance is empty. Deposit first with `deposit`." : "Banka bakiyen boş. Önce `yatır` komutuyla para yatır.");

  const son = Number(db.fetch(`faiz_son_${uid}`) || 0);
  if (Date.now() - son < GUN) {
    const kalan = GUN - (Date.now() - son);
    const saat = Math.floor(kalan / 3600000);
    const dk = Math.floor((kalan % 3600000) / 60000);
    return message.reply(EN ? `You already collected interest! Come back in **${saat}h ${dk}m**.` : `Faizini zaten aldın! **${saat}s ${dk}dk** sonra tekrar gel.`);
  }

  // Faiz oranı: normal %2, premium %4
  const oran = isPremium(uid) ? 0.04 : 0.02;
  const faiz = Math.floor(banka * oran);
  db.add(`bankapara_${uid}`, faiz);
  db.set(`faiz_son_${uid}`, Date.now());

  const e = new EmbedBuilder().setColor("Green").setTitle(EN ? "🏦 Bank Interest" : "🏦 Banka Faizi")
    .setDescription(EN
      ? `You earned **${faiz.toLocaleString()} 💸** interest (${(oran * 100)}%).\nNew bank balance: **${(banka + faiz).toLocaleString()} 💸**`
      : `**${faiz.toLocaleString()} 💸** faiz kazandın (%${oran * 100}).\nYeni banka bakiyen: **${(banka + faiz).toLocaleString()} 💸**`);
  await message.channel.send({ embeds: [e] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["faiz", "interest"], permLevel: 0, kategori: "ekonomi" };
exports.help = { name: "faiz", description: "Bankadaki paranıza günlük faiz kazandırır.", usage: "faiz" };
