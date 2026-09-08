const { EmbedBuilder } = require("discord.js");
const db = require('croxydb');
const { getLangSync, t } = require("../dil");
const cooldown = 7 * 24 * 60 * 60 * 1000;
exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  // Guild check for VIP
  const vipGuildId = '1192948403232067725';
  const guild = client.guilds.cache.get(vipGuildId);
  const isMember = guild ? await guild.members.fetch(message.author.id).catch(() => null) : null;
  if (!isMember) {
    return message.reply((lang === "en" ? "You must be on our special VIP server to use this command!" : "Bu komutu kullanabilmek için özel VIP sunucumuzda olmalısın!"));
  }

  const last = Number(db.fetch(`lastWeeklyReward.${message.author.id}`) || 0);
  if (Date.now() - last < cooldown)
    return message.reply((lang === "en" ? `You must wait ${Math.ceil((cooldown - Date.now() + last) / 86400000)} days for the weekly reward.` : `Haftalık ödül için ${Math.ceil((cooldown - Date.now() + last) / 86400000)} gün beklemelisin.`));
  const amount = Math.floor(Math.random() * 30001) + 70000;
  db.add(`para_${message.author.id}`, amount);
  db.set(`lastWeeklyReward.${message.author.id}`, Date.now());
  return message.channel.send({ embeds: [
    new EmbedBuilder().setColor("Green").setTitle((lang === "en" ? "Weekly reward" : "Haftalık ödül")).setDescription((lang === "en" ? `${amount.toLocaleString()} RiseBunny Cash earned.` : `${amount.toLocaleString()} RiseBunny Cash kazandın.`))
  ]});
};
exports.conf = { enabled: true, aliases: ["haftalık-para", "weekly"], permLevel: 0 };
exports.help = { name: "haftalık", description: "Haftalık para ödülünü verir.", usage: "haftalık" };