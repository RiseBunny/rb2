const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const { SAHIP_ID, ownerLog } = require("../utils");

function kodUret() {
  const alfabe = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const parca = () => Array.from({ length: 4 }, () => alfabe[Math.floor(Math.random() * alfabe.length)]).join("");
  return `RB-${parca()}-${parca()}`;
}

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (message.author.id !== SAHIP_ID) return message.reply(EN ? "Owner only." : "Sadece sahip.");

  const alt = (args[0] || "").toLowerCase();

  // r!kodoluştur liste -> tüm kuponları listele
  if (alt === "liste" || alt === "list") {
    let liste = [];
    try { liste = db.get("kuponListesi") || []; } catch {}
    if (!liste.length) return message.reply(EN ? "There are no coupons yet." : "Henüz hiç kupon oluşturulmamış.");
    const satirlar = liste.map((k) => {
      const durum = k.bitis && Date.now() > k.bitis ? (EN ? "⌛ Expired" : "⌛ Süresi dolmuş")
        : k.bitis ? `⏳ ${Math.max(0, Math.ceil((k.bitis - Date.now()) / 3600000))}h` : "♾️";
      const odul = k.tip === "premium" ? `💎 ${k.premiumGun || 30} ${EN ? "days" : "gün"}`
        : k.tip === "pet" ? `${k.petEmoji || "🐾"} ${k.petAd || "?"}` : `💸 ${Number(k.miktar || 0).toLocaleString()}`;
      return `\`${k.kod}\` — ${odul} | ${k.yer || "ikisi"} | ${(k.calismalar || 0)}/${k.limit || "∞"} | ${durum}`;
    });
    const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "Coupon List" : "Kupon Listesi")
      .setDescription(satirlar.join("\n").slice(0, 3900) || "-");
    return message.channel.send({ embeds: [e] });
  }

  // r!kodoluştur sil <kod> -> kuponu sil
  if (alt === "sil" || alt === "delete") {
    const kod = (args[1] || "").toUpperCase();
    if (!kod) return message.reply(EN ? "Usage: `kodoluştur sil <code>`" : "Kullanım: `kodoluştur sil <kod>`");
    const mevcut = db.fetch(`kupon_${kod}`);
    if (mevcut === undefined || mevcut === null) return message.reply(EN ? "Coupon not found." : "Kupon bulunamadı.");
    try { db.delete(`kupon_${kod}`); } catch {}
    try { db.set("kuponListesi", (db.get("kuponListesi") || []).filter(k => k.kod !== kod)); } catch {}
    ownerLog(client, `🗑️ **Kupon silindi:** \`${kod}\` (${message.author.tag})`).catch(() => {});
    return message.reply(EN ? `Coupon \`${kod}\` deleted.` : `\`${kod}\` kuponu silindi.`);
  }

  // r!kodoluştur v2 → kalıcı RISE-V2 kuponu (site-şartlı, hesap başına tek, 250K)
  if (alt === "v2") {
    const kod = "RISE-V2";
    if (!db.fetch(`kupon_${kod}`)) {
      db.set(`kupon_${kod}`, { kod, tip: "para", miktar: 250000, bitis: 0, yer: "site", limit: 0, calismalar: 0, olusturan: message.author.id, tarih: Date.now() });
      const liste = db.get("kuponListesi") || [];
      liste.push({ kod, tip: "para", miktar: 250000, bitis: 0, yer: "site", limit: 0, calismalar: 0, olusturan: message.author.id, tarih: Date.now() });
      db.set("kuponListesi", liste);
    }
    const e = new EmbedBuilder().setColor("#00ff00").setTitle(EN ? "🎉 RISE-V2 Coupon Ready!" : "🎉 RISE-V2 Kuponu Hazır!")
      .setDescription(EN
        ? "`RISE-V2` — **250,000 cash**, permanent, one per account.\nRedeem location: **Website** (Discord login required)."
        : "`RISE-V2` — **250.000 RiseBunny Cash**, süresiz, hesap başına tek.\nKullanım yeri: **Site** (Discord girişi şart).");
    return message.channel.send({ embeds: [e] });
  }

  // Detaylı yönetim için yeni panele yönlendir
  const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "🎟️ Coupon system moved" : "🎟️ Kupon sistemi taşındı")
    .setDescription(EN
      ? "The full coupon manager is now `r!kupon` — button panel with cash/pet/premium rewards, timed/permanent, bot/website/both selection.\nQuick actions:"
      : "Kupon yönetimi artık `r!kupon` komutunda — para/pet/premium ödüllü, süreli/süresiz, bot/site/ikisi seçimli butonlu panel.\nHızlı işlemler:");
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel(EN ? "Open r!kupon panel" : "r!kupon panelini aç").setStyle(ButtonStyle.Primary).setCustomId("noop_kupon"),
    new ButtonBuilder().setLabel("RISE-V2").setStyle(ButtonStyle.Success).setCustomId("noop_v2")
  );
  const m = await message.channel.send({ embeds: [e], components: [row] });
  // noop butonları tıklanınca yönlendirme göster
  const col = m.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: 30000 });
  col.on("collect", async (i) => {
    await i.deferUpdate();
    if (i.customId === "noop_v2") message.channel.send("`r!kodoluştur v2`").catch(() => {});
    else message.channel.send("`r!kupon`").catch(() => {});
  });
  col.on("end", () => m.edit({ components: [] }).catch(() => {}));
};

exports.conf = { enabled: true, aliases: ['kuponolustur', 'kuponoluştur', 'create-coupon'], permLevel: 4, kategori: "sahip" };
exports.help = { name: 'kodoluştur', description: 'Kupon köprüsü: `v2` kalıcı kuponu oluşturur, `liste`/`sil` yönetir, panelsiz ise r!kupon a yönlendirir.', usage: 'kodoluştur [v2|liste|sil <kod>]' };
