const Discord = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const U = require("../utils");

// Katalog varsayılanları (bot.js SHOP_CATALOG ile aynı ID'ler)
const VARSAYILAN = {
  premium_30:  { ad: "💎 Premium 30 Gün", fiyat: 250000 },
  pet_tavsan:  { ad: "🐰 Tavşan", fiyat: 72000 },
  pet_kopek:   { ad: "🐶 Köpek", fiyat: 90000 },
  pet_kedi:    { ad: "🐱 Kedi", fiyat: 135000 },
  pet_balik:   { ad: "🐠 Balık", fiyat: 162000 },
  pet_aslan:   { ad: "🦁 Aslan", fiyat: 315000 },
  pet_kaplan:  { ad: "🐅 Kaplan", fiyat: 342000 },
  paket_rastgele: { ad: "🎁 Rastgele Paket", fiyat: 150000 }
};

function liste() {
  return Object.entries(VARSAYILAN).map(([id, v]) => {
    const oz = db.fetch(`magaza_${id}`) || {};
    return { id, ad: v.ad, fiyat: oz.fiyat ?? v.fiyat, gorunur: oz.gorunur !== false };
  });
}

function embedYap(EN, secili) {
  const items = liste();
  const e = new Discord.EmbedBuilder().setColor("Gold")
    .setTitle(EN ? "🛒 Shop Management (Site)" : "🛒 Mağaza Yönetimi (Site)")
    .setDescription(items.map(it =>
      `${it.gorunur ? "🟢" : "🔴"} \`${it.id}\` — ${it.ad}: **${it.fiyat.toLocaleString()}** 💸${secili === it.id ? " ⬅️" : ""}`
    ).join("\n") + "\n\n" + (EN
      ? "_Pick a product, then use the buttons. Only you can change these._"
      : "_Ürünü seç, sonra butonları kullan. Bunları sadece sen değiştirebilirsin._"));
  return e;
}

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (message.author.id !== U.SAHIP_ID)
    return message.channel.send({ content: EN ? " Only **my owner** can manage the shop." : " Mağazayı sadece **sahibim** yönetebilir." });

  const items = liste();
  const menu = new Discord.StringSelectMenuBuilder()
    .setCustomId("magaza_sec")
    .setPlaceholder(EN ? "Pick a product..." : "Ürün seç...")
    .addOptions(items.map(it => new Discord.StringSelectMenuOptionBuilder()
      .setLabel(`${it.gorunur ? "🟢" : "🔴"} ${it.ad}`.slice(0, 100))
      .setValue(it.id)
      .setDescription(`${it.fiyat.toLocaleString()} 💸`.slice(0, 100))));

  const row1 = new Discord.ActionRowBuilder().addComponents(menu);
  const row2 = new Discord.ActionRowBuilder().addComponents(
    new Discord.ButtonBuilder().setCustomId("magaza_fiyat").setLabel(EN ? "Change Price" : "Fiyat Değiştir").setStyle(Discord.ButtonStyle.Primary).setEmoji("💰"),
    new Discord.ButtonBuilder().setCustomId("magaza_gorunur").setLabel(EN ? "Show/Hide" : "Göster/Gizle").setStyle(Discord.ButtonStyle.Secondary).setEmoji("👁️")
  );

  let secili = items[0].id;
  const panel = await message.channel.send({ embeds: [embedYap(EN, secili)], components: [row1, row2] });
  const col = panel.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: 180000 });

  const taze = async (i) => {
    const items2 = liste();
    const menu2 = new Discord.StringSelectMenuBuilder()
      .setCustomId("magaza_sec").setPlaceholder(EN ? "Pick a product..." : "Ürün seç...")
      .addOptions(items2.map(it => new Discord.StringSelectMenuOptionBuilder()
        .setLabel(`${it.gorunur ? "🟢" : "🔴"} ${it.ad}`.slice(0, 100)).setValue(it.id)
        .setDescription(`${it.fiyat.toLocaleString()} 💸`.slice(0, 100))));
    await i.message.edit({ embeds: [embedYap(EN, secili)], components: [new Discord.ActionRowBuilder().addComponents(menu2), row2] }).catch(() => {});
  };

  col.on("collect", async (i) => {
    try {
      if (i.isStringSelectMenu() && i.customId === "magaza_sec") {
        secili = i.values[0];
        await i.deferUpdate().catch(() => {});
        return taze(i);
      }
      if (i.customId === "magaza_gorunur") {
        const oz = db.fetch(`magaza_${secili}`) || {};
        const cur = liste().find(x => x.id === secili);
        db.set(`magaza_${secili}`, { fiyat: oz.fiyat ?? cur.fiyat, gorunur: !(cur.gorunur) });
        await i.reply({ content: `👁️ \`${secili}\`: ${cur.gorunur ? (EN ? "HIDDEN from site" : "sitede GİZLENDİ") : (EN ? "VISIBLE on site" : "sitede GÖRÜNÜYOR")}`, ephemeral: true }).catch(() => {});
        return taze(i);
      }
      if (i.customId === "magaza_fiyat") {
        await i.reply({ content: (EN ? `💰 Send the new price for \`${secili}\` in chat within 30s (numbers only).` : `💰 \`${secili}\` için yeni fiyatı 30 sn içinde sohbete yaz (sadece sayı).`), ephemeral: true }).catch(() => {});
        const f = (m) => m.author.id === message.author.id && /^\d+$/.test(m.content.trim());
        const top = await message.channel.awaitMessages({ filter: f, max: 1, time: 30000 }).catch(() => null);
        const msg = top?.first?.();
        if (!msg) { await message.channel.send(EN ? "⏳ Cancelled (timeout)." : "⏳ İptal (süre doldu).").catch(() => {}); return; }
        const fiyat = Math.max(0, Math.min(100000000, parseInt(msg.content.trim(), 10)));
        const oz = db.fetch(`magaza_${secili}`) || {};
        const cur = liste().find(x => x.id === secili);
        db.set(`magaza_${secili}`, { fiyat, gorunur: oz.gorunur ?? cur.gorunur });
        await message.channel.send(`✅ \`${secili}\` → **${fiyat.toLocaleString()}** 💸`).catch(() => {});
        try { await msg.delete(); } catch {}
        const items3 = liste();
        const menu3 = new Discord.StringSelectMenuBuilder().setCustomId("magaza_sec")
          .setPlaceholder(EN ? "Pick a product..." : "Ürün seç...")
          .addOptions(items3.map(it => new Discord.StringSelectMenuOptionBuilder()
            .setLabel(`${it.gorunur ? "🟢" : "🔴"} ${it.ad}`.slice(0, 100)).setValue(it.id)
            .setDescription(`${it.fiyat.toLocaleString()} 💸`.slice(0, 100))));
        await panel.edit({ embeds: [embedYap(EN, secili)], components: [new Discord.ActionRowBuilder().addComponents(menu3), row2] }).catch(() => {});
      }
    } catch {}
  });
  col.on("end", async () => { await panel.edit({ components: [] }).catch(() => {}); });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["mağaza-ayarla", "magaza"], permLevel: 4, kategori: "sahip" };
exports.help = { name: "mağaza-yönet", description: "Site mağazası: fiyat + görünürlük (sahip).", usage: "mağaza-yönet" };
