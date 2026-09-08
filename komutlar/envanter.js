const { EmbedBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const { isPremium, xpSeviye } = require("../utils");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const uid = message.author.id;

  const para = Number(db.fetch(`para_${uid}`) || 0);
  const banka = Number(db.fetch(`bankapara_${uid}`) || 0);
  const kasa = Number(db.fetch(`kasa_${uid}`) || 0);
  const pets = db.get(`pets_${uid}`) || [];
  const xp = Number(db.fetch(`xp_${uid}`) || 0);
  const seviye = xpSeviye(xp);
  const meslek = db.fetch(`meslek_${uid}`);
  const zincir = Number(db.fetch(`zincir_${uid}`) || 0);

  const e = new EmbedBuilder()
    .setColor("Gold")
    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
    .setTitle(EN ? "🎒 Inventory" : "🎒 Envanter")
    .addFields(
      { name: EN ? "💰 Wallet" : "💰 Cüzdan", value: para.toLocaleString(), inline: true },
      { name: EN ? "🏦 Bank" : "🏦 Banka", value: banka.toLocaleString(), inline: true },
      { name: EN ? "🔐 Vault" : "🔐 Kasa", value: kasa.toLocaleString(), inline: true },
      { name: EN ? "🏆 Level" : "🏆 Seviye", value: `${seviye} (${xp.toLocaleString()} XP)`, inline: true },
      { name: EN ? "💎 Premium" : "💎 Premium", value: isPremium(uid) ? (EN ? "Yes" : "Evet") : (EN ? "No" : "Hayır"), inline: true },
      { name: EN ? "🎁 Streak" : "🎁 Zincir", value: `${zincir} ${EN ? "day(s)" : "gün"}`, inline: true },
      { name: EN ? "💼 Job" : "💼 Meslek", value: meslek ? (EN ? meslek : meslek.charAt(0).toUpperCase() + meslek.slice(1)) : "-", inline: true },
      { name: EN ? "🐾 Pets" : "🐾 Petler", value: pets.length ? pets.map(p => `${p.emoji} ${p.name}`).join(", ").slice(0, 1000) : "-", inline: false }
    );
  await message.channel.send({ embeds: [e] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["envanter", "inventory", "inv"], permLevel: 0, kategori: "ekonomi" };
exports.help = { name: "envanter", description: "Tüm eşyalarını ve istatistiklerini gösterir.", usage: "envanter" };
