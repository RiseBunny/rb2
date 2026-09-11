const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const { isPremium, ownerLog, satisDuyuruSatir, satisDuyuruButon } = require("../utils");

// Katalog (site mağazasıyla aynı fiyatlar — bot.js PET_FIYAT ile senkron)
const petler = {
  "common": [
    { name: "Tavşan", emoji: "🐰", price: 80000 },
    { name: "Köpek", emoji: "🐶", price: 100000 }
  ],
  "rare": [
    { name: "Kedi", emoji: "🐱", price: 150000 },
    { name: "Balık", emoji: "🐠", price: 180000 }
  ],
  "premium": [
    { name: "Aslan", emoji: "🦁", price: 350000 },
    { name: "Kaplan", emoji: "🐅", price: 380000 }
  ]
};
const RARITY_RENK = { common: "#22c55e", rare: "#3b82f6", premium: "#a855f7" };
const RARITY_ADI = (r, EN) => r === "common" ? (EN ? "Common" : "Normal") : r === "rare" ? (EN ? "Rare" : "Nadir") : (EN ? "Premium" : "Premium");

function katalogDuz() {
  const out = [];
  for (const r in petler) for (const p of petler[r]) out.push({ ...p, rarity: r });
  return out;
}
function findPetByName(name) {
  return katalogDuz().find(p => p.name.toLowerCase() === String(name || "").toLowerCase()) || null;
}

/* ── Saf işlem çekirdekleri (komut + global buton akışları ortak kullanır) ── */
function satinAlCekirdek(userId, secilen) {
  const bakiye = Number(db.fetch(`para_${userId}`) || 0);
  if (!secilen) return { ok: false, kod: "yok" };
  if (secilen.rarity === "premium" && !isPremium(userId)) return { ok: false, kod: "premium" };
  if (bakiye < secilen.price) return { ok: false, kod: "para", bakiye };
  const pets = db.get(`pets_${userId}`) || [];
  pets.push({ name: secilen.name, emoji: secilen.emoji, rarity: secilen.rarity, price: secilen.price });
  db.set(`pets_${userId}`, pets);
  db.subtract(`para_${userId}`, secilen.price);
  return { ok: true, bakiye: bakiye - secilen.price };
}
function satCekirdek(userId, idx) {
  const pets = db.get(`pets_${userId}`) || [];
  const secilen = pets[idx - 1];
  if (!secilen) return { ok: false };
  const taban = Number(secilen.price) || Number((findPetByName(secilen.name) || {}).price) || 50000;
  const zarar = Math.random() < 0.5;
  const oran = zarar ? 0.90 : 1.10;
  const geri = Math.floor(taban * oran);
  const fark = Math.abs(taban - geri);
  pets.splice(idx - 1, 1);
  db.set(`pets_${userId}`, pets);
  db.add(`para_${userId}`, geri);
  return { ok: true, secilen, taban, geri, fark, zarar };
}
exports.katalog = katalogDuz;
exports.bul = findPetByName;
exports.satinAlCekirdek = satinAlCekirdek;
exports.satCekirdek = satCekirdek;

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const userId = message.author.id;
  const trigger = (args[0] || "").toLowerCase();

  /* ── r!pet (menüsüz) → butonlu ana panel ── */
  if (!trigger) {
    const userPets = db.get(`pets_${userId}`) || [];
    const e = new EmbedBuilder().setColor("Gold")
      .setTitle(EN ? "🐾 Pet System 2.0" : "🐾 Pet Sistemi 2.0")
      .setDescription(EN
        ? `You have **${userPets.length}** pet(s). Buy from the catalog, or sell one with **±10% fair odds** — you never know if it's a profit or a loss!`
        : `Elinde **${userPets.length}** pet var. Katalogdan al, ya da **±%10 adil oranlarla** sat — kâr mı zarar mı, satana kadar belli olmaz!`)
      .addFields(
        { name: EN ? "🛒 Catalog" : "🛒 Katalog", value: katalogDuz().map(p => `${p.emoji} **${p.name}** — ${p.price.toLocaleString()} 💸 (${RARITY_ADI(p.rarity, EN)})${p.rarity === "premium" ? " 💎" : ""}`).join("\n").slice(0, 1020) },
        { name: EN ? "💼 Your pets" : "💼 Petlerin", value: userPets.length ? userPets.map((p, i) => `${i + 1}. ${p.emoji || "🐾"} **${p.name}** — ${Number(p.price) ? Number(p.price).toLocaleString() + " 💸" : (EN ? "priceless" : "paha biçilmez")}`).join("\n").slice(0, 1020) : (EN ? "None yet — adopt one!" : "Henüz yok — bir pet sahiplen!") }
      )
      .setFooter({ text: EN ? "Buttons below • Pet menu" : "Aşağıdaki butonlar • Pet menüsü" });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("pet_al_menu").setLabel(EN ? "🛒 Adopt" : "🛒 Sahiplen").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("pet_sat_menu").setLabel(EN ? "💼 Sell" : "💼 Sat").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("pet_liste").setLabel(EN ? "📋 My Pets" : "📋 Petlerim").setStyle(ButtonStyle.Secondary)
    );
    return message.channel.send({ embeds: [e], components: [row] }).catch(() => {});
  }

  /* ── r!pet liste / list ── */
  if (trigger === "liste" || trigger === "list") {
    const userPets = db.get(`pets_${userId}`) || [];
    if (!userPets.length) return message.reply(EN ? "You have no pets yet." : "Henüz petin yok.");
    const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "📋 Your Pets" : "📋 Petlerin")
      .setDescription(userPets.map((p, i) => `${i + 1}. ${p.emoji || "🐾"} **${p.name}** — ${Number(p.price) || 0} 💸`).join("\n").slice(0, 3900));
    return message.channel.send({ embeds: [e] });
  }

  /* ── r!pet al / buy (metin yolu — buton paneli ile aynı mantık) ── */
  if (trigger === "al" || trigger === "buy") {
    const petAd = args.slice(1).join(" ");
    if (!petAd) return petAlPanel(message, EN);
    const secilen = findPetByName(petAd);
    if (!secilen) {
      const e = new EmbedBuilder().setColor("Red").setTitle(EN ? "❌ Pet not found" : "❌ Pet bulunamadı")
        .setDescription(katalogDuz().map(p => `${p.emoji} \`${p.name}\` — ${p.price.toLocaleString()} 💸`).join("\n"));
      return message.channel.send({ embeds: [e] });
    }
    return petSatinAl(client, message, secilen, EN);
  }

  /* ── r!pet sat / sell <no> ── */
  if (trigger === "sat" || trigger === "sell") {
    const idx = parseInt(args[1]);
    if (isNaN(idx) || idx < 1) return petSatPanel(message, EN, userId);
    return petSat(client, message, idx, EN);
  }

  return message.reply(EN ? "Usage: `pet [al|sat|liste]`" : "Kullanım: `pet [al|sat|liste]`");
};

/* ── Sahiplenme paneli (buton) ── */
async function petAlPanel(message, EN) {
  const opts = katalogDuz().map(p => new StringSelectMenuOptionBuilder()
    .setLabel(`${p.name} — ${p.price.toLocaleString()} 💸`.slice(0, 100))
    .setValue(`pet_al_${p.name}`).setEmoji(p.emoji)
    .setDescription(RARITY_ADI(p.rarity, EN).slice(0, 100)));
  const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "🛒 Adopt a Pet" : "🛒 Pet Sahiplen")
    .setDescription(EN ? "Pick a pet from the menu below." : "Aşağıdaki menüden bir pet seç.");
  const m = await message.channel.send({ embeds: [e], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("pet_al_menu").setPlaceholder(EN ? "Pick a pet..." : "Pet seç...").addOptions(opts))] });
  const col = m.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: 60000 });
  col.on("collect", async (i) => {
    await i.deferUpdate().catch(() => {});
    if (i.isStringSelectMenu()) {
      const secilen = findPetByName(i.values[0].replace("pet_al_", ""));
      if (secilen) petSatinAl(i.client, message, secilen, EN);
    }
  });
  col.on("end", () => m.edit({ components: [] }).catch(() => {}));
}

/* ── Satış paneli (buton) ── */
async function petSatPanel(message, EN, userId) {
  const userPets = db.get(`pets_${userId}`) || [];
  if (!userPets.length) return message.reply(EN ? "You have no pets to sell." : "Satacak petin yok.");
  const opts = userPets.slice(0, 24).map((p, i) => new StringSelectMenuOptionBuilder()
    .setLabel(`${p.emoji || "🐾"} ${p.name}`.slice(0, 100)).setValue(`pet_sat_${i + 1}`)
    .setDescription(`${Number(p.price) || 0} 💸`.slice(0, 100)));
  const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "💼 Sell a Pet (±10%)" : "💼 Pet Sat (±%10)")
    .setDescription(EN
      ? "Pick a pet. The market rolls ±10%: profit or loss — 50/50, fair play!"
      : "Pet seç. Piyasa ±%10 zar atar: kâr ya da zarar — %50/%50, adil oyun!");
  const m = await message.channel.send({ embeds: [e], components: [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("pet_sat_menu").setPlaceholder(EN ? "Pick a pet to sell" : "Satılacak pet").addOptions(opts))] });
  const col = m.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: 60000 });
  col.on("collect", async (i) => {
    await i.deferUpdate().catch(() => {});
    if (i.isStringSelectMenu()) petSat(i.client, message, parseInt(i.values[0].replace("pet_sat_", "")), EN);
  });
  col.on("end", () => m.edit({ components: [] }).catch(() => {}));
}

/* ── Satın alma işlemi ── */
async function petSatinAl(client, message, secilen, EN) {
  const userId = message.author.id;
  const sonuc = satinAlCekirdek(userId, secilen);
  if (!sonuc.ok && sonuc.kod === "yok") return;
  if (!sonuc.ok && sonuc.kod === "premium") {
    const e = new EmbedBuilder().setColor("Red").setTitle(EN ? "💎 Premium required" : "💎 Premium gerekli")
      .setDescription(`${secilen.emoji} **${secilen.name}** ${EN ? "is a premium pet. Get premium from the site shop!" : "premium pet. Site mağazasından premium alabilirsin!"}`);
    return message.channel.send({ embeds: [e] });
  }
  if (!sonuc.ok) {
    const bakiye = sonuc.bakiye || 0;
    const e = new EmbedBuilder().setColor("Red").setTitle(EN ? "💸 Not enough cash" : "💸 Yetersiz bakiye")
      .setDescription(EN ? `You need **${secilen.price.toLocaleString()}**, you have **${bakiye.toLocaleString()}**.` : `Gerekli: **${secilen.price.toLocaleString()}**, elinde: **${bakiye.toLocaleString()}**.`);
    return message.channel.send({ embeds: [e] });
  }

  const e = new EmbedBuilder().setColor(RARITY_RENK[secilen.rarity] || "Gold")
    .setTitle(EN ? "🎉 Adopted!" : "🎉 Sahiplendin!")
    .setDescription(`${secilen.emoji} **${secilen.name}** ${EN ? "is now your pet!`" : "artık senin petin!"}\n💸 −${secilen.price.toLocaleString()} ${EN ? "cash" : "RiseBunny Cash"}\n\n${satisDuyuruSatir(EN)}`)
    .setFooter({ text: EN ? `Rarity: ${RARITY_ADI(secilen.rarity, EN)}` : `Nadirlik: ${RARITY_ADI(secilen.rarity, EN)}` });
  message.channel.send({ embeds: [e], components: [satisDuyuruButon(EN)] }).catch(() => {});
  ownerLog(client, new EmbedBuilder().setColor("Gold").setTitle("🐾 Pet Satışı")
    .setDescription(`**Alan:** ${message.author.tag} (\`${userId}\`)\n**Pet:** ${secilen.emoji} **${secilen.name}**\n**Fiyat:** ${secilen.price.toLocaleString()} 💸`)
    .setTimestamp()).catch(() => {});
}

/* ── Satış işlemi: ±%10 adil, embed'li ── */
async function petSat(client, message, idx, EN) {
  const userId = message.author.id;
  const sonuc = satCekirdek(userId, idx);
  if (!sonuc.ok) return message.reply(EN ? "Invalid pet number." : "Geçersiz pet numarası.");
  const { secilen, taban, geri, fark, zarar } = sonuc;

  const e = new EmbedBuilder().setColor(zarar ? "#ef4444" : "#22c55e")
    .setTitle(zarar ? (EN ? "📉 Sold at a loss..." : "📉 Zararla sattın...") : (EN ? "📈 Sold at a profit!" : "📈 Kârla sattın!"))
    .setDescription(`${secilen.emoji || "🐾"} **${secilen.name}** ${EN ? "sold." : "satıldı."}`)
    .addFields(
      { name: EN ? "Base value" : "Taban değer", value: `${taban.toLocaleString()} 💸`, inline: true },
      { name: EN ? "You got back" : "Geri aldığın", value: `${geri.toLocaleString()} 💸`, inline: true },
      { name: zarar ? (EN ? "Loss" : "Zarar") : (EN ? "Profit" : "Kâr"), value: `${zarar ? "−" : "+"}${fark.toLocaleString()} 💸`, inline: true }
    )
    .setFooter({ text: EN ? "Market odds: ±10% • 50/50" : "Piyasa oranı: ±%10 • %50/%50" });
  message.channel.send({ embeds: [e] }).catch(() => {});
}

exports.conf = { enabled: true, aliases: ['pet-al-sat'], guildOnly: false, permLevel: 0, kategori: "ekonomi" };
exports.help = { name: 'pet', description: 'Pet sistemi 2.0: butonlu sahiplenme/satış, ±%10 adil kâr-zarar.', usage: 'pet [al|sat|liste]' };
