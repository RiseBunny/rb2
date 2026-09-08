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

/* Kupon ödülünü işler (bot içi kullanım). Site tarafı bot.js /api/coupon/redeem üzerinden aynı fonksiyon mantığıyla çalışır. */
function kuponOdulVer(userId, kupon) {
  if (kupon.tip === "premium") {
    const gun = Number(kupon.premiumGun) || 30;
    addPremium(userId, gun * 24 * 60 * 60 * 1000);
    return { ok: true, mesaj: `💎 **${gun} gün** premium aktif edildi!` };
  }
  if (kupon.tip === "pet") {
    const pets = db.get(`pets_${userId}`) || [];
    const pet = { name: kupon.petAd || "Tavşan", emoji: kupon.petEmoji || "🐰", rarity: "coupon", price: Number(kupon.petFiyat) || 50000 };
    pets.push(pet);
    db.set(`pets_${userId}`, pets);
    return { ok: true, mesaj: `${pet.emoji} **${pet.name}** petin hesabına eklendi!` };
  }
  const miktar = Number(kupon.miktar) || 0;
  if (miktar > 0) {
    db.add(`para_${userId}`, miktar);
    return { ok: true, mesaj: `💸 **${miktar.toLocaleString()}** RiseBunny Cash hesabına yüklendi!` };
  }
  return { ok: false, mesaj: "Geçersiz kupon ödülü." };
}

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (message.author.id !== SAHIP_ID)
    return message.reply(EN ? "Only the bot owner can manage coupons." : "Kuponları sadece bot sahibi yönetebilir.");

  const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "🎟️ Coupon Management" : "🎟️ Kupon Yönetimi")
    .setDescription(EN
      ? "Create timed or permanent coupons. Rewards: cash, pet or premium. Choose where they can be redeemed: **Bot**, **Website** (Discord login required) or **Both**."
      : "Süreli veya süresiz kuponlar oluştur. Ödüller: para, pet veya premium. Kullanım yerini seç: **Bot**, **Site** (Discord girişi şart) veya **İkisi de**.")
    .addFields(
      { name: EN ? "Active coupons" : "Aktif kuponlar", value: kuponlar().slice(0, 10).map(k => {
          const kalan = k.bitis ? Math.max(0, Math.ceil((k.bitis - Date.now()) / 3600000)) + "h" : (EN ? "∞" : "∞");
          const nerede = k.yer === "bot" ? "🤖" : k.yer === "site" ? "🌐" : "🤖+🌐";
          return `\`${k.kod}\` ${nerede} ${k.tip === "premium" ? "💎" : k.tip === "pet" ? "🐾" : "💸"} ${k.calismalar}/${k.limit || "∞"} | ${kalan}`;
        }).join("\n") || (EN ? "None yet." : "Henüz yok.") }
    )
    .setFooter({ text: EN ? "Buttons below • 3 minute panel" : "Aşağıdaki butonlar • 3 dk panel" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("kupon_yeni_para").setLabel(EN ? "💸 Cash Coupon" : "💸 Para Kuponu").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("kupon_yeni_pet").setLabel(EN ? "🐾 Pet Coupon" : "🐾 Pet Kuponu").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("kupon_yeni_premium").setLabel(EN ? "💎 Premium Coupon" : "💎 Premium Kuponu").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("kupon_liste").setLabel(EN ? "📋 List / Delete" : "📋 Liste / Sil").setStyle(ButtonStyle.Danger)
  );

  const panel = await message.channel.send({ embeds: [e], components: [row] });
  const col = panel.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: 180000 });

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
      // Yeni kupon akışı: tip seç → süre → yer
      const tip = i.customId === "kupon_yeni_premium" ? "premium" : i.customId === "kupon_yeni_pet" ? "pet" : "para";
      await i.followUp({ content: EN
        ? "⏳ **Duration**: reply `sureli <hours>` or `suresiz` (30s)."
        : "⏳ **Süre**: `sureli <saat>` veya `suresiz` yaz (30 sn).", ephemeral: true }).catch(() => {});
      const f = (m) => m.author.id === message.author.id && (/^sureli\s+\d+$/i.test(m.content.trim()) || /^suresiz$/i.test(m.content.trim()));
      const top = await message.channel.awaitMessages({ filter: f, max: 1, time: 30000 }).catch(() => null);
      const m1 = top?.first?.();
      if (!m1) return message.channel.send(EN ? "⏳ Cancelled (timeout)." : "⏳ İptal (süre doldu).").catch(() => {});
      try { await m1.delete(); } catch {}
      const sureli = /^sureli/i.test(m1.content.trim());
      const bitis = sureli ? Date.now() + parseInt(m1.content.trim().split(/\s+/)[1], 10) * 3600000 : 0;

      await message.channel.send(EN
        ? "🌐 **Where?** reply `bot`, `site` (Discord login required on website) or `ikisi` (30s)."
        : "🌐 **Nerede?** `bot`, `site` (sitede Discord girişi şart) veya `ikisi` yaz (30 sn).").catch(() => {});
      const f2 = (m) => m.author.id === message.author.id && /^(bot|site|ikisi|both)$/i.test(m.content.trim());
      const top2 = await message.channel.awaitMessages({ filter: f2, max: 1, time: 30000 }).catch(() => null);
      const m2 = top2?.first?.();
      if (!m2) return message.channel.send(EN ? "⏳ Cancelled (timeout)." : "⏳ İptal (süre doldu).").catch(() => {});
      try { await m2.delete(); } catch {}
      const yer = /^site$/i.test(m2.content.trim()) ? "site" : /^bot$/i.test(m2.content.trim()) ? "bot" : "ikisi";

      // Tip bazlı detay
      let detay = { tip, bitis, yer, limit: 0, calismalar: 0 };
      if (tip === "premium") {
        await message.channel.send(EN ? "💎 **Premium days?** (30s)" : "💎 **Premium gün sayısı?** (30 sn)").catch(() => {});
        const top3 = await message.channel.awaitMessages({ filter: (m) => m.author.id === message.author.id && /^\d+$/.test(m.content.trim()), max: 1, time: 30000 }).catch(() => null);
        const m3 = top3?.first?.();
        if (!m3) return message.channel.send(EN ? "⏳ Cancelled." : "⏳ İptal.").catch(() => {});
        const gun = Math.min(Math.max(parseInt(m3.content.trim(), 10) || 30, 1), 365);
        try { await m3.delete(); } catch {}
        detay.premiumGun = gun;
        detay.miktar = 0;
      } else if (tip === "pet") {
        await message.channel.send(EN ? "🐾 **Pet?** reply `<name> <emoji> <price>` (30s)" : "🐾 **Pet?** `<isim> <emoji> <fiyat>` yaz (30 sn)").catch(() => {});
        const top3 = await message.channel.awaitMessages({ filter: (m) => m.author.id === message.author.id && /\S+\s+\S+\s+\d+/.test(m.content.trim()), max: 1, time: 30000 }).catch(() => null);
        const m3 = top3?.first?.();
        if (!m3) return message.channel.send(EN ? "⏳ Cancelled." : "⏳ İptal.").catch(() => {});
        const p = m3.content.trim().split(/\s+/);
        detay.petAd = p[0]; detay.petEmoji = p[1]; detay.petFiyat = Math.max(0, parseInt(p[2], 10) || 50000);
        detay.miktar = 0;
        try { await m3.delete(); } catch {}
      } else {
        await message.channel.send(EN ? "💸 **Amount?** (30s)" : "💸 **Miktar?** (30 sn)").catch(() => {});
        const top3 = await message.channel.awaitMessages({ filter: (m) => m.author.id === message.author.id && /^\d+$/.test(m.content.trim()), max: 1, time: 30000 }).catch(() => null);
        const m3 = top3?.first?.();
        if (!m3) return message.channel.send(EN ? "⏳ Cancelled." : "⏳ İptal.").catch(() => {});
        detay.miktar = Math.min(Math.max(parseInt(m3.content.trim(), 10) || 200000, 1), 1000000000);
        try { await m3.delete(); } catch {}
      }

      await message.channel.send(EN ? "♾️ **Usage limit?** (0 = unlimited, 30s)" : "♾️ **Kullanım limiti?** (0 = sınırsız, 30 sn)").catch(() => {});
      const top4 = await message.channel.awaitMessages({ filter: (m) => m.author.id === message.author.id && /^\d+$/.test(m.content.trim()), max: 1, time: 30000 }).catch(() => null);
      const m4 = top4?.first?.();
      if (!m4) return message.channel.send(EN ? "⏳ Cancelled." : "⏳ İptal.").catch(() => {});
      detay.limit = Math.max(0, parseInt(m4.content.trim(), 10) || 0);
      try { await m4.delete(); } catch {}

      // Kayıt
      const kod = kodUret();
      const kayit = { kod, olusturan: message.author.id, tarih: Date.now(), ...detay };
      db.set(`kupon_${kod}`, kayit);
      const liste = kuponlar(); liste.push(kayit); db.set("kuponListesi", liste);

      const ke = new EmbedBuilder().setColor("#00ff00").setTitle(EN ? "✅ Coupon Created" : "✅ Kupon Oluşturuldu")
        .setDescription(`\`${kod}\`\n${tip === "premium" ? `💎 ${detay.premiumGun} gün premium` : tip === "pet" ? `${detay.petEmoji} ${detay.petAd}` : `💸 ${detay.miktar.toLocaleString()}`}\n${sureli ? `⏳ ${(EN ? "expires in " : "geçerlilik: ") + Math.ceil((bitis - Date.now()) / 3600000) + "h"}` : "♾️ " + (EN ? "permanent" : "süresiz")} | 🌐 ${yer} | ${detay.limit || "∞"} ${EN ? "uses" : "kullanım"}`);
      await message.channel.send({ embeds: [ke] }).catch(() => {});
      ownerLog(client, new EmbedBuilder().setColor("Gold").setTitle("🎟️ Kupon Oluşturuldu")
        .setDescription(`**Kod:** \`${kod}\`\n**Sahip:** ${message.author.tag}\n**Ödül:** ${tip}\n**Yer:** ${yer}`).setTimestamp()).catch(() => {});
    } catch (err) {
      try { i.followUp({ content: "⚠️ " + err.message, ephemeral: true }); } catch {}
    }
  });
  col.on("end", () => { panel.edit({ components: [] }).catch(() => {}); });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["kupon-yonet", "kuponpanel", "coupon-manage"], permLevel: 4, kategori: "sahip" };
exports.help = { name: "kupon", description: "Butonlu kupon yönetimi (sahip): para/pet/premium, süreli/süresiz, bot/site.", usage: "kupon" };
