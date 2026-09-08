const { EmbedBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const uid = message.author.id;
  const alt = (args[0] || "").toLowerCase();

  // r!kasa -> durum
  if (!alt) {
    const kasa = Number(db.fetch(`kasa_${uid}`) || 0);
    const e = new EmbedBuilder().setColor("Grey").setTitle(EN ? "🔐 Vault" : "🔐 Kasa")
      .setDescription(EN
        ? `Your vault balance: **${kasa.toLocaleString()} 💸**\nMoney in the vault cannot be stolen.\nUsage: \`vault deposit <amount>\` / \`vault withdraw <amount>\``
        : `Kasa bakiyen: **${kasa.toLocaleString()} 💸**\nKasadaki para çalınamaz.\nKullanım: \`kasa yatır <miktar>\` / \`kasa çek <miktar>\``);
    return message.channel.send({ embeds: [e] });
  }

  const miktar = args[1]?.toLowerCase() === "all" || args[1]?.toLowerCase() === "hepsi"
    ? (alt === "yatır" || alt === "deposit" ? Number(db.fetch(`para_${uid}`) || 0) : Number(db.fetch(`kasa_${uid}`) || 0))
    : Number(args[1]);

  if (alt === "yatır" || alt === "deposit") {
    const para = Number(db.fetch(`para_${uid}`) || 0);
    if (!Number.isInteger(miktar) || miktar < 1 || miktar > para)
      return message.reply(EN ? "Enter a valid amount that does not exceed your wallet." : "Cüzdanını aşmayan geçerli bir miktar gir.");
    db.subtract(`para_${uid}`, miktar);
    db.add(`kasa_${uid}`, miktar);
    return message.reply(EN ? `Deposited **${miktar.toLocaleString()} 💸** to your vault.` : `Kasana **${miktar.toLocaleString()} 💸** yatırdın.`);
  }

  if (alt === "çek" || alt === "withdraw") {
    const kasa = Number(db.fetch(`kasa_${uid}`) || 0);
    if (!Number.isInteger(miktar) || miktar < 1 || miktar > kasa)
      return message.reply(EN ? "Enter a valid amount that does not exceed your vault." : "Kasanı aşmayan geçerli bir miktar gir.");
    db.subtract(`kasa_${uid}`, miktar);
    db.add(`para_${uid}`, miktar);
    return message.reply(EN ? `Withdrew **${miktar.toLocaleString()} 💸** from your vault.` : `Kasandan **${miktar.toLocaleString()} 💸** çektin.`);
  }

  return message.reply(EN ? "Usage: `vault deposit <amount>` / `vault withdraw <amount>`" : "Kullanım: `kasa yatır <miktar>` / `kasa çek <miktar>`");
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["kasa", "vault", "safe"], permLevel: 0, kategori: "ekonomi" };
exports.help = { name: "kasa", description: "Çalınamayan kişisel kasa (para saklama).", usage: "kasa [yatır <miktar> | çek <miktar>]" };
