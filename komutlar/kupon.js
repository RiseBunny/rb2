const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const { SAHIP_ID, addPremium, ownerLog } = require("../utils");

function kodUret() {
  const alfabe = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const parca = () => Array.from({ length: 4 }, () => alfabe[Math.floor(Math.random() * alfabe.length)]).join("");
  return `RB-${parca()}-${parca()}`;
}
function kuponlar() {
  try { return db.get("kuponListesi") || []; } catch { return []; }
}
function kuponSil(kod) {
  try { db.delete(`kupon_${kod}`); } catch {}
  try { db.set("kuponListesi", kuponlar().filter(k => k.kod !== kod)); } catch {}
}
const SURELER = [
  { id: "1h",  ms: 3600000,        tr: "1 Saat",   en: "1 Hour" },
  { id: "6h",  ms: 21600000,       tr: "6 Saat",   en: "6 Hours" },
  { id: "1g",  ms: 86400000,       tr: "1 Gün",    en: "1 Day" },
  { id: "1h",  ms: 604800000,      tr: "1 Hafta",  en: "1 Week" },
  { id: "2h",  ms: 1209600000,     tr: "2 Hafta",  en: "2 Weeks" },
  { id: "1a",  ms: 2592000000,    tr: "1 Ay",     en: "1 Month" },
  { id: "3a",  ms: 7776000000,    tr: "3 Ay",     en: "3 Months" },
  { id: "6a",  ms: 15552000000,   tr: "6 Ay",     en: "6 Months" },
  { id: "1y",  ms: 31536000000,   tr: "1 Yıl",    en: "1 Year" },
  { id: "suresiz", ms: 0,          tr: "♾️ Süresiz", en: "♾️ Permanent" }
];

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (message.author.id !== SAHIP_ID)
    return message.reply(EN ? "Only the bot owner can manage coupons." : "Kuponları sadece bot sahibi yönetebilir.");

  const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "🎟️ Coupon Management" : "🎟️ Kupon Yönetimi")
    .setDescription(EN
      ? "Create coupons with **cash**, **pet** or **premium** rewards. Fully button-driven — pick duration, redeem location and usage limit."
      : "**Para**, **pet** veya **premium** ödüllü kuponlar oluştur. Tamamen butonlu — süre, kullanım yeri ve limiti seç.")
    .addFields({ name: EN ? "Active coupons" : "Aktif kuponlar", value: kuponlar().slice(0, 10).map(k => {
        const s = k.bitis ? Math.max(0, Math.ceil((k.bitis - Date.now()) / 3600000)) + "h" : "♾️";
        const nerede = k.yer === "bot" ? "🤖" : k.yer === "site" ? "🌐" : "🤖+🌐";
        return `\`${k.kod}\` ${nerede} ${k.tip === "premium" ? "💎" : k.tip === "pet" ? "🐾" : "💸"} ${k.calismalar || 0}/${k.limit || "∞"} | ${s}`;
      }).join("\n") || (EN ? "None yet." : "Henüz yok.") });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("kupon_yeni_para").setLabel(EN ? "💸 Cash Coupon" : "💸 Para Kuponu").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("kupon_yeni_pet").setLabel(EN ? "🐾 Pet Coupon" : "🐾 Pet Kuponu").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("kupon_yeni_premium").setLabel(EN ? "💎 Premium Coupon" : "💎 Premium Kuponu").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("kupon_liste").setLabel(EN ? "📋 List / Delete" : "📋 Liste / Sil").setStyle(ButtonStyle.Danger)
  );

  const panel = await message.channel.send({ embeds: [e], components: [row] });
  const col = panel.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: 300000 });

  col.on("collect", async (i) => {
    try {
      await i.deferUpdate().catch(() => {});
      if (i.customId === "kupon_liste") {
        const liste = kuponlar();
        if (!liste.length) return i.followUp({ content: EN ? "No coupons." : "Kupon yok.", ephemeral: true }).catch(() => {});
        const opts = liste.slice(0, 24).map(k => new StringSelectMenuOptionBuilder()
          .setLabel(`${k.kod} (${k.tip})`.slice(0, 100)).setValue(`kupon_sil_${k.kod}`)
          .setDescription((EN ? "Tap to delete" : "Silmek için seç").slice(0, 100)));
        return i.followUp({
          components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("kupon_sil_menu").setPlaceholder(EN ? "Pick to delete" : "Silinecek kupon").addOptions(opts))],
          ephemeral: true
        }).catch(() => {});
      }

      const tip = i.customId === "kupon_yeni_premium" ? "premium" : i.customId === "kupon_yeni_pet" ? "pet" : "para";

      // ── ADIM 1: Süre (BUTONLA — metin yazma YOK) ──
      const se = new EmbedBuilder().setColor("Gold").setTitle(EN ? "⏳ Step 1/5 — Duration" : "⏳ Adım 1/5 — Süre")
        .setDescription(EN ? "How long should this coupon stay valid?" : "Bu kupon ne kadar geçerli olsun?");
      const sRow1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("sure_1h").setLabel(EN ? "1 Hour" : "1 Saat").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("sure_6h").setLabel(EN ? "6 Hours" : "6 Saat").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("sure_1g").setLabel(EN ? "1 Day" : "1 Gün").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("sure_1hafta").setLabel(EN ? "1 Week" : "1 Hafta").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("sure_2hafta").setLabel(EN ? "2 Weeks" : "2 Hafta").setStyle(ButtonStyle.Secondary)
      );
      const sRow2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("sure_1ay").setLabel(EN ? "1 Month" : "1 Ay").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("sure_3ay").setLabel(EN ? "3 Months" : "3 Ay").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("sure_6ay").setLabel(EN ? "6 Months" : "6 Ay").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("sure_1yil").setLabel(EN ? "1 Year" : "1 Yıl").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("sure_suresiz").setLabel(EN ? "♾️ Permanent" : "♾️ Süresiz").setStyle(ButtonStyle.Success)
      );
      const sureMsg = await message.channel.send({ embeds: [se], components: [sRow1, sRow2] });
      const sureCol = sureMsg.createMessageComponentCollector({ filter: (x) => x.user.id === message.author.id, time: 60000 });
      const sureSecim = await new Promise((resolve) => {
        sureCol.on("collect", (x) => { resolve(x.customId); sureCol.stop("ok"); });
        sureCol.on("end", (r, rsn) => { if (rsn !== "ok") resolve(null); });
      });
      sureMsg.edit({ components: [] }).catch(() => {});
      if (!sureSecim) return message.channel.send(EN ? "⏳ Cancelled (timeout)." : "⏳ İptal (süre doldu).").catch(() => {});
      const sureMap = { sure_1h: 3600000, sure_6h: 21600000, sure_1g: 86400000, sure_1hafta: 604800000, sure_2hafta: 1209600000, sure_1ay: 2592000000, sure_3ay: 7776000000, sure_6ay: 15552000000, sure_1yil: 31536000000, sure_suresiz: 0 };
      const bitis = sureMap[sureSecim] || 0;

      // ── ADIM 2: Yer (BUTONLA) ──
      const ye = new EmbedBuilder().setColor("Gold").setTitle(EN ? "🌐 Step 2/5 — Where?" : "🌐 Adım 2/5 — Nerede kullanılsın?")
        .setDescription(EN ? "Website coupons require Discord sign-in on the site." : "Site kuponları sitede Discord girişi gerektirir.");
      const yRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("yer_bot").setLabel(EN ? "🤖 Bot only" : "🤖 Sadece Bot").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("yer_site").setLabel(EN ? "🌐 Website only" : "🌐 Sadece Site").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("yer_ikisi").setLabel(EN ? "🔄 Both" : "🔄 İkisi de").setStyle(ButtonStyle.Secondary)
      );
      const yerMsg = await message.channel.send({ embeds: [ye], components: [yRow] });
      const yerCol = yerMsg.createMessageComponentCollector({ filter: (x) => x.user.id === message.author.id, time: 60000 });
      const yerSecim = await new Promise((resolve) => {
        yerCol.on("collect", (x) => { resolve(x.customId.replace("yer_", "")); yerCol.stop("ok"); });
        yerCol.on("end", (r, rsn) => { if (rsn !== "ok") resolve(null); });
      });
      yerMsg.edit({ components: [] }).catch(() => {});
      if (!yerSecim) return message.channel.send(EN ? "⏳ Cancelled." : "⏳ İptal.").catch(() => {});
      const yer = yerSecim; // bot | site | ikisi

      // ── ADIM 3: Limit (BUTONLA) ──
      const le = new EmbedBuilder().setColor("Gold").setTitle(EN ? "♾️ Step 3/5 — Usage limit" : "♾️ Adım 3/5 — Kullanım limiti")
        .setDescription(EN ? "How many people can redeem it? (Each account: once)" : "Kaç kişi kullanabilsin? (Hesap başına yine tek)");
      const lRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("limit_1").setLabel(EN ? "1 person" : "1 kişi").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("limit_5").setLabel("5").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("limit_10").setLabel("10").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("limit_50").setLabel("50").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("limit_0").setLabel(EN ? "♾️ Unlimited" : "♾️ Sınırsız").setStyle(ButtonStyle.Success)
      );
      const lMsg = await message.channel.send({ embeds: [le], components: [lRow] });
      const lCol = lMsg.createMessageComponentCollector({ filter: (x) => x.user.id === message.author.id, time: 60000 });
      const limitSecim = await new Promise((resolve) => {
        lCol.on("collect", (x) => { resolve(parseInt(x.customId.replace("limit_", ""), 10) || 0); lCol.stop("ok"); });
        lCol.on("end", (r, rsn) => { if (rsn !== "ok") resolve(null); });
      });
      lMsg.edit({ components: [] }).catch(() => {});
      if (limitSecim === null) return message.channel.send(EN ? "⏳ Cancelled." : "⏳ İptal.").catch(() => {});

      // ── ADIM 4: Ödül detayı ──
      let detay = { tip, bitis, yer, limit: limitSecim, calismalar: 0 };
      if (tip === "premium") {
        const pe = new EmbedBuilder().setColor("Gold").setTitle(EN ? "💎 Step 4/5 — Premium days" : "💎 Adım 4/5 — Premium gün")
          .setDescription(EN ? "How many premium days does this coupon grant?" : "Kupon kaç gün premium versin?");
        const pRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prem_7").setLabel(EN ? "7 days" : "7 gün").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("prem_15").setLabel(EN ? "15 days" : "15 gün").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("prem_30").setLabel(EN ? "30 days" : "30 gün").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("prem_90").setLabel(EN ? "90 days" : "90 gün").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("prem_999").setLabel(EN ? "♾️ 1 year" : "♾️ 1 yıl").setStyle(ButtonStyle.Success)
        );
        const pMsg = await message.channel.send({ embeds: [pe], components: [pRow] });
        const pCol = pMsg.createMessageComponentCollector({ filter: (x) => x.user.id === message.author.id, time: 60000 });
        const pSecim = await new Promise((resolve) => {
          pCol.on("collect", (x) => { resolve(parseInt(x.customId.replace("prem_", ""), 10) || 30); pCol.stop("ok"); });
          pCol.on("end", (r, rsn) => { if (rsn !== "ok") resolve(null); });
        });
        pMsg.edit({ components: [] }).catch(() => {});
        if (!pSecim) return message.channel.send(EN ? "⏳ Cancelled." : "⏳ İptal.").catch(() => {});
        detay.premiumGun = pSecim; detay.miktar = 0;
      } else if (tip === "pet") {
        // Pet kataloğundan seçim (menü)
        const katalog = [
          { name: "Tavşan", emoji: "🐰", price: 80000 },
          { name: "Köpek", emoji: "🐶", price: 100000 },
          { name: "Kedi", emoji: "🐱", price: 150000 },
          { name: "Balık", emoji: "🐠", price: 180000 },
          { name: "Aslan", emoji: "🦁", price: 350000 },
          { name: "Kaplan", emoji: "🐅", price: 380000 }
        ];
        const pe = new EmbedBuilder().setColor("Gold").setTitle(EN ? "🐾 Step 4/5 — Pick the pet" : "🐾 Adım 4/5 — Pet seç");
        const opts = katalog.map(p => new StringSelectMenuOptionBuilder().setLabel(p.name).setValue(`kpet_${p.name}`).setEmoji(p.emoji).setDescription(`${p.price.toLocaleString()} 💸`));
        const pMsg = await message.channel.send({ embeds: [pe], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("kupon_pet_menu").setPlaceholder(EN ? "Pick a pet" : "Pet seç").addOptions(opts))] });
        const pCol = pMsg.createMessageComponentCollector({ filter: (x) => x.user.id === message.author.id, time: 60000 });
        const pSecim = await new Promise((resolve) => {
          pCol.on("collect", (x) => {
            const ad = x.values[0].replace("kpet_", "");
            const p = katalog.find(k => k.name === ad) || katalog[0];
            resolve(p); pCol.stop("ok");
          });
          pCol.on("end", (r, rsn) => { if (rsn !== "ok") resolve(null); });
        });
        pMsg.edit({ components: [] }).catch(() => {});
        if (!pSecim) return message.channel.send(EN ? "⏳ Cancelled." : "⏳ İptal.").catch(() => {});
        detay.petAd = pSecim.name; detay.petEmoji = pSecim.emoji; detay.petFiyat = pSecim.price; detay.miktar = 0;
      } else {
        // Para miktarı (butonlu hazır + özel)
        const pe = new EmbedBuilder().setColor("Gold").setTitle(EN ? "💸 Step 4/5 — Cash amount" : "💸 Adım 4/5 — Para miktarı");
        const pRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("para_50000").setLabel("50K").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("para_100000").setLabel("100K").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("para_250000").setLabel("250K").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("para_500000").setLabel("500K").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("para_ozel").setLabel(EN ? "✏️ Custom" : "✏️ Özel").setStyle(ButtonStyle.Primary)
        );
        const pMsg = await message.channel.send({ embeds: [pe], components: [pRow] });
        const pCol = pMsg.createMessageComponentCollector({ filter: (x) => x.user.id === message.author.id, time: 60000 });
        let miktar = await new Promise((resolve) => {
          pCol.on("collect", (x) => {
            if (x.customId === "para_ozel") { resolve("ozel"); pCol.stop("ozel"); }
            else { resolve(parseInt(x.customId.replace("para_", ""), 10)); pCol.stop("ok"); }
          });
          pCol.on("end", (r, rsn) => { if (rsn !== "ok" && rsn !== "ozel") resolve(null); });
        });
        pMsg.edit({ components: [] }).catch(() => {});
        if (miktar === "ozel") {
          await message.channel.send(EN ? "✏️ Type the custom amount (numbers only, 30s)..." : "✏️ Özel miktarı yaz (sadece sayı, 30 sn)...").catch(() => {});
          const top = await message.channel.awaitMessages({ filter: (m) => m.author.id === message.author.id && /^\d+$/.test(m.content.trim()), max: 1, time: 30000 }).catch(() => null);
          const mm = top?.first?.();
          if (!mm) return message.channel.send(EN ? "⏳ Cancelled." : "⏳ İptal.").catch(() => {});
          miktar = Math.min(Math.max(parseInt(mm.content.trim(), 10) || 0, 1), 1000000000);
          try { await mm.delete(); } catch {}
        }
        if (miktar === null || miktar === undefined) return message.channel.send(EN ? "⏳ Cancelled." : "⏳ İptal.").catch(() => {});
        detay.miktar = miktar;
      }

      // ── ADIM 5: Onay + oluştur ──
      const kod = kodUret();
      const odul = tip === "premium" ? `💎 ${detay.premiumGun} ${EN ? "days premium" : "gün premium"}`
        : tip === "pet" ? `${detay.petEmoji} ${detay.petAd}`
        : `💸 ${detay.miktar.toLocaleString()}`;
      const sureMetin = bitis ? new Date(bitis).toLocaleString("tr-TR") : (EN ? "♾️ Permanent" : "♾️ Süresiz");
      const onayE = new EmbedBuilder().setColor("Gold").setTitle(EN ? "✅ Step 5/5 — Confirm" : "✅ Adım 5/5 — Onay")
        .setDescription(`\`${kod}\`\n${EN ? "Reward" : "Ödül"}: **${odul}**\n${EN ? "Duration" : "Süre"}: ${sureMetin}\n${EN ? "Where" : "Yer"}: ${yer}\n${EN ? "Limit" : "Limit"}: ${limitSecim || "∞"}`);
      const oRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`kupon_olustur_${kod}`).setLabel(EN ? "Create ✅" : "Oluştur ✅").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("kupon_iptal").setLabel(EN ? "Cancel" : "İptal").setStyle(ButtonStyle.Danger)
      );
      const oMsg = await message.channel.send({ embeds: [onayE], components: [oRow] });
      const oCol = oMsg.createMessageComponentCollector({ filter: (x) => x.user.id === message.author.id, time: 30000 });
      const onay = await new Promise((resolve) => {
        oCol.on("collect", (x) => { resolve(x.customId.startsWith("kupon_olustur")); oCol.stop("ok"); });
        oCol.on("end", (r, rsn) => { if (rsn !== "ok") resolve(false); });
      });
      oMsg.edit({ components: [] }).catch(() => {});
      if (!onay) return message.channel.send(EN ? "❌ Cancelled." : "❌ İptal edildi.").catch(() => {});

      const kayit = { kod, olusturan: message.author.id, tarih: Date.now(), ...detay };
      db.set(`kupon_${kod}`, kayit);
      const liste = kuponlar(); liste.push(kayit); db.set("kuponListesi", liste);

      const ke = new EmbedBuilder().setColor("#00ff00").setTitle(EN ? "✅ Coupon Created!" : "✅ Kupon Oluşturuldu!")
        .setDescription(`\`${kod}\` — ${odul}\n${EN ? "Duration" : "Süre"}: ${sureMetin} | 🌐 ${yer}`);
      await message.channel.send({ embeds: [ke] }).catch(() => {});
      ownerLog(client, new EmbedBuilder().setColor("Gold").setTitle("🎟️ Kupon Oluşturuldu")
        .setDescription(`**Kod:** \`${kod}\`\n**Sahip:** ${message.author.tag}\n**Ödül:** ${odul}\n**Yer:** ${yer}\n**Limit:** ${limitSecim || "∞"}`).setTimestamp()).catch(() => {});
    } catch (err) {
      try { i.followUp({ content: "⚠️ " + err.message, ephemeral: true }); } catch {}
    }
  });
  col.on("end", () => { panel.edit({ components: [] }).catch(() => {}); });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["kupon-yonet", "kuponpanel", "coupon-manage"], permLevel: 4, kategori: "sahip" };
exports.help = { name: "kupon", description: 'Butonlu kupon yönetimi (sahip): para/pet/premium, süre, bot/site, limit — hepsi butonla.', usage: "kupon" };
