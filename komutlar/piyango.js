const { EmbedBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");

const BILET = 5000;

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const uid = message.author.id;
  const alt = (args[0] || "").toLowerCase();

  // r!piyango -> bilgi + bilet al
  if (alt === "çek" || alt === "draw") {
    if (message.author.id !== require("../utils").SAHIP_ID)
      return message.reply(EN ? "Only the owner can draw the lottery." : "Piyangoyu sadece sahip çekebilir.");
    const biletler = db.get("piyangoBiletleri") || [];
    if (!biletler.length) return message.reply(EN ? "No tickets sold yet." : "Henüz bilet satılmadı.");
    const toplam = biletler.reduce((s, b) => s + BILET, 0);
    const kazanan = biletler[Math.floor(Math.random() * biletler.length)];
    db.add(`para_${kazanan.uid}`, toplam);
    db.set("piyangoBiletleri", []);
    return message.channel.send({ embeds: [
      new EmbedBuilder().setColor("Gold").setTitle(EN ? "🎰 Lottery Result" : "🎰 Piyango Sonucu")
        .setDescription(EN ? `Winner: <@${kazanan.uid}> — **${toplam.toLocaleString()} 💸**!` : `Kazanan: <@${kazanan.uid}> — **${toplam.toLocaleString()} 💸**!`)
    ]});
  }

  if (alt === "al" || alt === "buy") {
    const bakiye = Number(db.fetch(`para_${uid}`) || 0);
    if (bakiye < BILET) return message.reply(EN ? `A ticket costs ${BILET.toLocaleString()} 💸.` : `Bir bilet ${BILET.toLocaleString()} 💸 tutar.`);
    db.subtract(`para_${uid}`, BILET);
    const biletler = db.get("piyangoBiletleri") || [];
    biletler.push({ uid, tarih: Date.now() });
    db.set("piyangoBiletleri", biletler);
    return message.reply(EN ? `You bought a lottery ticket! Current pool: **${(biletler.length * BILET).toLocaleString()} 💸**` : `Piyango bileti aldın! Güncel havuz: **${(biletler.length * BILET).toLocaleString()} 💸**`);
  }

  const biletler = db.get("piyangoBiletleri") || [];
  const e = new EmbedBuilder().setColor("Purple").setTitle(EN ? "🎰 Lottery" : "🎰 Piyango")
    .setDescription(EN
      ? `Buy a ticket for **${BILET.toLocaleString()} 💸** and win the whole pool!\nCurrent pool: **${(biletler.length * BILET).toLocaleString()} 💸**\nTickets sold: **${biletler.length}**\n\nUsage: \`lottery buy\``
      : `**${BILET.toLocaleString()} 💸** karşılığında bilet al ve tüm havuzu kazan!\nGüncel havuz: **${(biletler.length * BILET).toLocaleString()} 💸**\nSatılan bilet: **${biletler.length}**\n\nKullanım: \`piyango al\``);
  await message.channel.send({ embeds: [e] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["piyango", "lottery", "loto"], permLevel: 0, kategori: "ekonomi" };
exports.help = { name: "piyango", description: "Piyango bileti al ve havuzu kazan.", usage: "piyango [al | çek]" };
