const { EmbedBuilder } = require("discord.js");
const { db, isPremium, addPremium, DESTEK, ownerLog, komutLog } = require("../utils");
const { t, getLang } = require("../dil");

exports.run = async (client, message) => {
  const lang = await getLang(message.author.id);
  if (isPremium(message.author.id)) return message.reply(t(lang, "premium.zaten"));

  const cost = 1500000;
  const balance = Number(db.fetch(`para_${message.author.id}`) || 0);
  if (balance < cost) return message.reply(t(lang, "ekonomi.vipGerek", { eksik: (cost - balance).toLocaleString() }));

  if (typeof db.subtract === "function") db.subtract(`para_${message.author.id}`, cost);
  else db.set(`para_${message.author.id}`, balance - cost);

  addPremium(message.author.id);
  const e = new EmbedBuilder().setColor("Gold").setTitle("✨ Premium Aktif").setDescription(t(lang, "premium.aktif"));
  await message.reply({ embeds: [e] });
  await komutLog(client, message, "premium-al");
  await ownerLog(client, new EmbedBuilder().setColor("Gold").setDescription((lang === "en" ? `💎 Premium purchased: **${message.author.tag}** (${message.author.id})` : `💎 Premium satın alındı: **${message.author.tag}** (${message.author.id})`)));
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["alpremium", "premiumal", "preal", "alpre", "premium-al"], permLevel: 0, kategori: "premium" };
exports.help = { name: "premium-al", description: "Oyun parasiyla 30 günlük premium satin alir (1.500.000).", usage: "premium-al" };
