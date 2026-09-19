const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const { isPremium, parseSure } = require("../utils");

const HAZIR = [
  { id: "10dk", ms: 10 * 60 * 1000, tr: "10 Dakika", en: "10 Minutes" },
  { id: "1sa", ms: 3600000, tr: "1 Saat", en: "1 Hour" },
  { id: "1gun", ms: 86400000, tr: "1 Gün", en: "1 Day" },
  { id: "1hafta", ms: 604800000, tr: "1 Hafta", en: "1 Week" }
];
const MAKS = 30 * 86400000, MIN = 30000;

function listeAl() { try { const l = db.get("hatirlaticilar"); return Array.isArray(l) ? l : []; } catch { return []; } }

async function kaydet(client, message, ms, metin, EN) {
  const userId = message.author.id;
  const benim = listeAl().filter(h => h.userId === userId);
  if (benim.length >= 5) return message.reply(EN ? "You already have 5 active reminders. Delete one first (`hatırlat liste`)." : "Zaten 5 aktif hatırlatıcın var. Önce birini sil (`hatırlat liste`).");
  const h = { id: `${userId}_${Date.now()}`, userId, at: Date.now() + ms, metin: String(metin).slice(0, 500), olusturma: Date.now() };
  const tum = listeAl(); tum.push(h); db.set("hatirlaticilar", tum);
  const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "⏰ Reminder Set!" : "⏰ Hatırlatıcı Kuruldu!")
    .setDescription(`📩 ${h.metin}\n\n⏳ <t:${Math.floor(h.at / 1000)}:R> (${EN ? "you'll get a DM" : "DM ile haber vereceğim"})`);
  return message.channel.send({ embeds: [e] });
}

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const userId = message.author.id;

  // Premium komut
  if (!isPremium(userId)) {
    const e = new EmbedBuilder().setColor("Red").setTitle(EN ? "💎 Premium Required" : "💎 Premium Gerekli")
      .setDescription(EN ? "Reminders are a **premium** feature. Get premium from the website shop!" : "Hatırlatıcı **premium** özelliğidir. Site mağazasından premium alabilirsin!");
    return message.reply({ embeds: [e] });
  }

  const alt = (args[0] || "").toLowerCase();

  // r!hatırlat liste
  if (alt === "liste" || alt === "list") {
    const benim = listeAl().filter(h => h.userId === userId).sort((a, b) => a.at - b.at);
    if (!benim.length) return message.reply(EN ? "No active reminders." : "Aktif hatırlatıcın yok.");
    const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "⏰ Your Reminders" : "⏰ Hatırlatıcıların")
      .setDescription(benim.map((h, i) => `**${i + 1}.** <t:${Math.floor(h.at / 1000)}:R> — ${h.metin.slice(0, 80)}`).join("\n").slice(0, 3900));
    return message.channel.send({ embeds: [e] });
  }

  // r!hatırlat sil <no>
  if (alt === "sil" || alt === "delete") {
    const no = parseInt(args[1], 10);
    const benim = listeAl().filter(h => h.userId === userId).sort((a, b) => a.at - b.at);
    const hedef = benim[no - 1];
    if (!hedef) return message.reply(EN ? "Invalid number. Use `hatırlat liste`." : "Geçersiz numara. `hatırlat liste` ile bak.");
    db.set("hatirlaticilar", listeAl().filter(h => h.id !== hedef.id));
    return message.reply(EN ? "🗑️ Reminder deleted." : "🗑️ Hatırlatıcı silindi.");
  }

  // r!hatırlat <süre> <metin>
  const ms = parseSure(args.slice(0, 2).join(" ")) ?? parseSure(args[0]);
  const metin = ms ? args.slice(ms === parseSure(args[0]) ? 1 : 2).join(" ") : "";
  if (ms && metin.trim()) {
    if (ms < MIN) return message.reply(EN ? "Minimum is 30 seconds." : "En az 30 saniye olmalı.");
    if (ms > MAKS) return message.reply(EN ? "Maximum is 30 days." : "En fazla 30 gün olabilir.");
    return kaydet(client, message, ms, metin.trim(), EN);
  }

  // Süresiz panel: hazır butonlar + özel
  const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "⏰ New Reminder" : "⏰ Yeni Hatırlatıcı")
    .setDescription(EN ? "Pick a preset, or type: `hatırlat <duration> <text>`\nExample: `hatırlat 2 saat dişçiyi ara`" : "Hazır süre seç, ya da yaz: `hatırlat <süre> <metin>`\nÖrnek: `hatırlat 2 hafta aidatı yatır`");
  const row = new ActionRowBuilder().addComponents(
    ...HAZIR.map(h => new ButtonBuilder().setCustomId(`hatir_${h.id}_${userId}`).setLabel(EN ? h.en : h.tr).setStyle(ButtonStyle.Secondary))
  );
  const m = await message.channel.send({ embeds: [e], components: [row] });
  const col = m.createMessageComponentCollector({ filter: (i) => i.user.id === userId, time: 60000 });
  col.on("collect", async (i) => {
    try {
      const hz = HAZIR.find(h => i.customId === `hatir_${h.id}_${userId}`);
      if (!hz) return;
      await i.reply({ content: EN ? "✏️ Now type the reminder text (60s)..." : "✏️ Şimdi hatırlatma metnini yaz (60 sn)...", ephemeral: true }).catch(() => {});
      const top = await message.channel.awaitMessages({ filter: (mm) => mm.author.id === userId && mm.content.trim().length > 0, max: 1, time: 60000 }).catch(() => null);
      const mm = top?.first?.();
      if (!mm) return message.channel.send(EN ? "⏳ Cancelled." : "⏳ İptal.").catch(() => {});
      try { await mm.delete(); } catch {}
      await kaydet(client, message, hz.ms, mm.content.trim(), EN);
    } catch {}
  });
  col.on("end", () => m.edit({ components: [] }).catch(() => {}));
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["hatirlat", "remind", "reminder"], permLevel: 0, kategori: "genel" };
exports.help = { name: "hatırlat", description: "Premium hatırlatıcı: süre dolunca DM ile embed hatırlatır.", usage: "hatırlat <süre> <metin> | liste | sil <no>" };
