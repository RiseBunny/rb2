const { EmbedBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");

const KIRMIZI = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const uid = message.author.id;
  const bakiye = Number(db.fetch(`para_${uid}`) || 0);

  const miktar = args[0]?.toLowerCase() === "all" || args[0]?.toLowerCase() === "hepsi"
    ? Math.min(bakiye, 50000) : Number(args[0]);
  const secim = (args[1] || "").toLowerCase();
  if (!Number.isInteger(miktar) || miktar < 1 || miktar > 50000 || miktar > bakiye)
    return message.reply(EN ? "Enter an amount between 1 and 50,000 that does not exceed your balance." : "1 ile 50.000 arasında ve bakiyeni aşmayan bir miktar gir.");
  if (!secim) return message.reply(EN ? "Choose: `red`, `black`, `green` or a number (0-36)." : "Seçim yap: `kırmızı`, `siyah`, `yeşil` veya bir sayı (0-36).");

  const gelen = Math.floor(Math.random() * 37); // 0-36
  const renk = gelen === 0 ? "green" : (KIRMIZI.includes(gelen) ? "red" : "black");

  let kazandi = false, carpan = 0;
  if (secim === "kırmızı" || secim === "red") { if (renk === "red") { kazandi = true; carpan = 2; } }
  else if (secim === "siyah" || secim === "black") { if (renk === "black") { kazandi = true; carpan = 2; } }
  else if (secim === "yeşil" || secim === "green") { if (renk === "green") { kazandi = true; carpan = 14; } }
  else { const sayi = parseInt(secim); if (!isNaN(sayi) && sayi === gelen) { kazandi = true; carpan = 35; } }

  const kazanc = Math.floor(miktar * carpan);
  if (kazandi) db.add(`para_${uid}`, kazanc - miktar);
  else db.subtract(`para_${uid}`, miktar);

  const renkAdi = renk === "green" ? (EN ? "green" : "yeşil") : (renk === "red" ? (EN ? "red" : "kırmızı") : (EN ? "black" : "siyah"));
  const e = new EmbedBuilder().setColor(kazandi ? "Green" : "Red").setTitle("🎡 Rulet")
    .setDescription(EN ? `The ball landed on **${gelen} (${renkAdi})**` : `Top **${gelen} (${renkAdi})** üzerinde durdu`)
    .addFields({ name: EN ? "Result" : "Sonuç", value: kazandi
      ? (EN ? `You won **${kazanc.toLocaleString()} 💸**!` : `**${kazanc.toLocaleString()} 💸** kazandın!`)
      : (EN ? `You lost **${miktar.toLocaleString()} 💸**.` : `**${miktar.toLocaleString()} 💸** kaybettin.`) },
      { name: EN ? "Balance" : "Bakiye", value: String(db.fetch(`para_${uid}`) || 0) });

  await message.channel.send({ embeds: [e] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["rulet", "roulette"], permLevel: 0, kategori: "ekonomi" };
exports.help = { name: "rulet", description: "Rulet oyunu.", usage: "rulet <miktar> <kırmızı/siyah/yeşil/sayı>" };
