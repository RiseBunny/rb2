const { EmbedBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const uid = message.author.id;
  const alt = (args[0] || "").toLowerCase();

  const notlar = db.get(`not_${uid}`) || [];

  if (alt === "ekle" || alt === "add") {
    const metin = args.slice(1).join(" ").trim();
    if (!metin) return message.reply(EN ? "Usage: `note add <text>`" : "Kullanım: `not ekle <metin>`");
    if (notlar.length >= 25) return message.reply(EN ? "You can have at most 25 notes." : "En fazla 25 not tutabilirsin.");
    notlar.push({ metin: metin.slice(0, 500), tarih: Date.now() });
    db.set(`not_${uid}`, notlar);
    return message.reply(EN ? `Note added (#${notlar.length}).` : `Not eklendi (#${notlar.length}).`);
  }

  if (alt === "liste" || alt === "list") {
    if (!notlar.length) return message.reply(EN ? "You have no notes." : "Hiç notun yok.");
    const e = new EmbedBuilder().setColor("Blue").setTitle(EN ? "📝 Your Notes" : "📝 Notların")
      .setDescription(notlar.map((n, i) => `\`${i + 1}.\` ${n.metin}`).join("\n").slice(0, 3900));
    return message.channel.send({ embeds: [e] });
  }

  if (alt === "sil" || alt === "delete") {
    const index = parseInt(args[1]);
    if (isNaN(index) || index < 1 || index > notlar.length) return message.reply(EN ? "Invalid note number." : "Geçersiz not numarası.");
    notlar.splice(index - 1, 1);
    db.set(`not_${uid}`, notlar);
    return message.reply(EN ? "Note deleted." : "Not silindi.");
  }

  if (alt === "temizle" || alt === "clear") {
    db.set(`not_${uid}`, []);
    return message.reply(EN ? "All notes cleared." : "Tüm notlar silindi.");
  }

  return message.reply(EN ? "Usage: `note add <text> | list | delete <no> | clear`" : "Kullanım: `not ekle <metin> | liste | sil <no> | temizle`");
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["notlar", "note", "notes"], permLevel: 0, kategori: "kullanici" };
exports.help = { name: "not", description: "Kişisel not defteri.", usage: "not ekle <metin> | liste | sil <no> | temizle" };
