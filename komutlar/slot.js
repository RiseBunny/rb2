const { EmbedBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");

const SEMBOLLER = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣"];

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const uid = message.author.id;
  const bakiye = Number(db.fetch(`para_${uid}`) || 0);

  const miktar = args[0]?.toLowerCase() === "all" || args[0]?.toLowerCase() === "hepsi"
    ? Math.min(bakiye, 50000) : Number(args[0]);
  if (!Number.isInteger(miktar) || miktar < 1 || miktar > 50000 || miktar > bakiye)
    return message.reply(EN ? "Enter an amount between 1 and 50,000 that does not exceed your balance." : "1 ile 50.000 arasında ve bakiyeni aşmayan bir miktar gir.");

  const r1 = SEMBOLLER[Math.floor(Math.random() * SEMBOLLER.length)];
  const r2 = SEMBOLLER[Math.floor(Math.random() * SEMBOLLER.length)];
  const r3 = SEMBOLLER[Math.floor(Math.random() * SEMBOLLER.length)];

  let carpan = 0;
  if (r1 === r2 && r2 === r3) carpan = r1 === "7️⃣" ? 10 : 5;      // üçlü
  else if (r1 === r2 || r2 === r3 || r1 === r3) carpan = 2;        // ikili

  const kazanc = Math.floor(miktar * carpan);
  if (carpan > 0) db.add(`para_${uid}`, kazanc - miktar);
  else db.subtract(`para_${uid}`, miktar);

  const e = new EmbedBuilder()
    .setColor(carpan > 0 ? "Green" : "Red")
    .setTitle("🎰 Slot")
    .setDescription(`\`[ ${r1} | ${r2} | ${r3} ]\``)
    .addFields({ name: EN ? "Result" : "Sonuç", value: carpan > 0
      ? (EN ? `You won **${kazanc.toLocaleString()} 💸**!` : `**${kazanc.toLocaleString()} 💸** kazandın!`)
      : (EN ? `You lost **${miktar.toLocaleString()} 💸**.` : `**${miktar.toLocaleString()} 💸** kaybettin.`) },
      { name: EN ? "Balance" : "Bakiye", value: String(db.fetch(`para_${uid}`) || 0) });

  await message.channel.send({ embeds: [e] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["slot-makinesi", "slots"], permLevel: 0, kategori: "ekonomi" };
exports.help = { name: "slot", description: "Slot makinesi oyunu.", usage: "slot <miktar|all>" };
