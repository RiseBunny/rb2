const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
    return message.reply(t(lang, "sistem.mesajYonet"));

  // r!anket-gelişmiş <süre> <soru> | <seçenek1> | <seçenek2> ...
  const sureStr = args[0];
  const sure = ms(sureStr);
  if (!sure || sure < 10000 || sure > 7 * 24 * 3600 * 1000)
    return message.reply(EN ? "Usage: `advanced-poll 10m Question | Option1 | Option2 ...` (10s - 7 days)" : "Kullanım: `anket-gelişmiş 10m Soru | Seçenek1 | Seçenek2 ...` (10 sn - 7 gün)");

  const geri = args.slice(1).join(" ");
  const parcalar = geri.split("|").map(s => s.trim()).filter(Boolean);
  const soru = parcalar[0];
  const secenekler = parcalar.slice(1);
  if (!soru || secenekler.length < 2 || secenekler.length > 10)
    return message.reply(EN ? "You need a question and 2-10 options separated by `|`." : "`|` ile ayrılmış bir soru ve 2-10 seçenek girmelisin.");

  const emojiler = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle(EN ? "📊 Poll" : "📊 Anket")
    .setDescription(`**${soru}**\n\n${secenekler.map((s, i) => `${emojiler[i]} ${s}`).join("\n")}`)
    .setFooter({ text: EN ? `Ends in ${ms(sure, { long: true })}` : `${ms(sure, { long: true })} içinde biter` });

  const sent = await message.channel.send({ embeds: [embed] });
  for (let i = 0; i < secenekler.length; i++) await sent.react(emojiler[i]).catch(() => {});

  // Süre dolunca sonucu göster
  setTimeout(async () => {
    try {
      const msg = await sent.channel.messages.fetch(sent.id).catch(() => null);
      if (!msg) return;
      const sonuclar = [];
      for (let i = 0; i < secenekler.length; i++) {
        const r = msg.reactions.cache.get(emojiler[i]);
        sonuclar.push({ secenek: secenekler[i], sayi: r ? r.count - 1 : 0 });
      }
      sonuclar.sort((a, b) => b.sayi - a.sayi);
      const kazanan = sonuclar[0];
      const sonuc = new EmbedBuilder()
        .setColor("Green")
        .setTitle(EN ? "📊 Poll Results" : "📊 Anket Sonuçları")
        .setDescription(`**${soru}**\n\n${sonuclar.map(s => `${s.secenek}: **${s.sayi}** oy`).join("\n")}\n\n${EN ? `Winner: **${kazanan.secenek}**` : `Kazanan: **${kazanan.secenek}**`}`);
      await sent.channel.send({ embeds: [sonuc] }).catch(() => {});
    } catch {}
  }, sure);
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["anket-gelismis", "poll-advanced", "advanced-poll", "anketgelişmiş"], permLevel: 0, kategori: "eglence" };
exports.help = { name: "anket-gelişmiş", description: "Butonlu/tepkili, süreli anket başlatır.", usage: "anket-gelişmiş <süre> <soru> | <seçenek1> | <seçenek2>" };
