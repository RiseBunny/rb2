const { EmbedBuilder } = require("discord.js");
const db = require('croxydb');
const { getLangSync, t } = require("../dil");
exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const userId = message.author.id;
  const last = Number(db.fetch(`cf_cooldown_${userId}`) || 0);
  if (Date.now() - last < 10000) return message.reply((lang === "en" ? "You can play this game once every 10 seconds." : "Bu oyunu 10 saniyede bir oynayabilirsin."));
  const balance = Number(db.fetch(`para_${userId}`) || 0);
  const amount = args[0]?.toLowerCase() === "all" || args[0]?.toLowerCase() === "hepsi"
    ? Math.min(balance, 50000) : Number(args[0]);
  if (!Number.isInteger(amount) || amount < 1 || amount > 50000 || amount > balance)
    return message.reply((lang === "en" ? "Write an amount between 1 and 50,000 that does not exceed your balance." : "1 ile 50.000 arasında ve bakiyeni aşmayan bir miktar yazmalısın."));
  db.set(`cf_cooldown_${userId}`, Date.now());
  const win = Math.random() < 0.4;
  if (win) db.add(`para_${userId}`, amount);
  else db.subtract(`para_${userId}`, amount);
  return message.channel.send({ embeds: [
    new EmbedBuilder().setColor(win ? "Green" : "Red").setTitle("Coin Flip")
      .setDescription(win ? (lang === "en" ? `You won ${amount.toLocaleString()}.` : `${amount.toLocaleString()} kazandın.`) : (lang === "en" ? `You lost ${amount.toLocaleString()}.` : `${amount.toLocaleString()} kaybettin.`))
      .addFields({ name: (lang === "en" ? "New balance" : "Yeni bakiye"), value: String(db.fetch(`para_${userId}`) || 0) })
  ]});
};
exports.conf = { enabled: true, aliases: ["coinflip"], permLevel: 0 };
exports.help = { name: "cf", description: "Coin flip oyunu.", usage: "cf <miktar|all>" };