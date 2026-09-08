const { EmbedBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const { isPremium } = require("../utils");

const MESLEKLER = {
  "yazılımcı": { en: "Software Developer", emoji: "💻", min: 3000, max: 9000 },
  "doktor": { en: "Doctor", emoji: "🩺", min: 4000, max: 10000 },
  "öğretmen": { en: "Teacher", emoji: "📚", min: 2500, max: 7000 },
  "polis": { en: "Police", emoji: "👮", min: 3000, max: 8000 },
  "şef": { en: "Chef", emoji: "👨‍🍳", min: 2500, max: 7500 },
  "mühendis": { en: "Engineer", emoji: "⚙️", min: 3500, max: 9500 }
};

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const uid = message.author.id;
  const alt = (args[0] || "").toLowerCase();

  if (alt === "seç" || alt === "select") {
    const secim = (args[1] || "").toLowerCase();
    const meslek = MESLEKLER[secim];
    if (!meslek) return message.reply(EN ? "Invalid job. Use `job` to see the list." : "Geçersiz meslek. Listeyi görmek için `meslek` yaz.");
    db.set(`meslek_${uid}`, secim);
    return message.reply(EN ? `You are now a **${meslek.en}** ${meslek.emoji}!` : `Artık bir **${secim.charAt(0).toUpperCase() + secim.slice(1)}** ${meslek.emoji}!`);
  }

  if (alt === "çalış" || alt === "work") {
    const secim = db.fetch(`meslek_${uid}`);
    if (!secim) return message.reply(EN ? "Choose a job first with `job select <job>`." : "Önce `meslek seç <meslek>` ile bir meslek seç.");
    const meslek = MESLEKLER[secim];
    const son = Number(db.fetch(`meslek_cd_${uid}`) || 0);
    if (Date.now() - son < 3600000) {
      const kalan = Math.ceil((3600000 - (Date.now() - son)) / 60000);
      return message.reply(EN ? `Wait ${kalan} minutes before working again.` : `${kalan} dakika sonra tekrar çalışabilirsin.`);
    }
    const kazanc = Math.floor(Math.random() * (meslek.max - meslek.min + 1)) + meslek.min;
    const bonus = isPremium(uid) ? Math.floor(kazanc * 0.5) : 0;
    db.add(`para_${uid}`, kazanc + bonus);
    db.set(`meslek_cd_${uid}`, Date.now());
    const e = new EmbedBuilder().setColor("Green").setTitle(EN ? `${meslek.emoji} Work` : `${meslek.emoji} Çalışma`)
      .setDescription(EN
        ? `You worked as a **${meslek.en}** and earned **${(kazanc + bonus).toLocaleString()} 💸**${bonus ? " (+50% premium bonus)" : ""}!`
        : `**${secim.charAt(0).toUpperCase() + secim.slice(1)}** olarak çalıştın ve **${(kazanc + bonus).toLocaleString()} 💸** kazandın${bonus ? " (+%50 premium bonus)" : ""}!`);
    return message.channel.send({ embeds: [e] });
  }

  const secim = db.fetch(`meslek_${uid}`);
  const satirlar = Object.entries(MESLEKLER).map(([k, m]) => `${m.emoji} **${EN ? m.en : k.charAt(0).toUpperCase() + k.slice(1)}** — ${m.min.toLocaleString()}-${m.max.toLocaleString()} 💸`);
  const e = new EmbedBuilder().setColor("Blue").setTitle(EN ? "💼 Jobs" : "💼 Meslekler")
    .setDescription(`${satirlar.join("\n")}\n\n${EN ? `Your job: **${secim ? MESLEKLER[secim].en : "None"}**` : `Mesleğin: **${secim ? secim.charAt(0).toUpperCase() + secim.slice(1) : "Yok"}**`}\n${EN ? "Usage: `job select <job>` / `job work`" : "Kullanım: `meslek seç <meslek>` / `meslek çalış`"}`);
  await message.channel.send({ embeds: [e] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["meslek", "job", "iş"], permLevel: 0, kategori: "ekonomi" };
exports.help = { name: "meslek", description: "Meslek seç ve çalışarak para kazan.", usage: "meslek [seç <meslek> | çalış]" };
