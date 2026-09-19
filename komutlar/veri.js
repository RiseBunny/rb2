const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("croxydb");
const { getLangSync, t } = require("../dil");
const { SAHIP_ID, ownerLog } = require("../utils");

/* ID'ye bağlı tüm verileri tara (sunucu ID'si veya kullanıcı ID'si) */
function verileriTara(id) {
  const all = db.all() || {};
  const sid = String(id);
  const eslesen = [];
  const kisiDesenleri = [
    `para_${sid}`, `bankapara_${sid}`, `iban_${sid}`, `xp_${sid}`, `seviye_${sid}`,
    `seviyeatlama_${sid}`, `pets_${sid}`, `premium_${sid}`, `vote_${sid}`, `dmail_${sid}`,
    `language_${sid}`, `afk_${sid}`, `onay_${sid}`, `yedek_veri_${sid}`,
    `otomasyon_${sid}`, `engel_${sid}`, `karalist_${sid}`, `sebep_${sid}`
  ];
  for (const k of Object.keys(all)) {
    if (k.startsWith(`otoegitim_${sid}_`) || k.startsWith(`otocevapsiz_${sid}_`)) { eslesen.push(k); continue; }
    if (k.startsWith("ass.") && k.split(".")[1] === sid) { eslesen.push(k); continue; }
    if (k.startsWith("ticket.") && k.split(".")[1] === sid) { eslesen.push(k); continue; }
    if (kisiDesenleri.includes(k)) { eslesen.push(k); continue; }
    if (k.startsWith("kupon_kullandi_") && k.endsWith(`_${sid}`)) { eslesen.push(k); continue; }
    if (k.startsWith("ai_qa_") && all[k]?.ekleyen === sid) { eslesen.push(k); continue; }
    if (k.startsWith("ai_pending_") && all[k]?.ogreten === sid) { eslesen.push(k); continue; }
    if ((k === "hatirlaticilar") && Array.isArray(all[k]) && all[k].some(h => h.userId === sid)) { eslesen.push(k + " (içinde)"); continue; }
  }
  return eslesen;
}

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  if (message.author.id !== SAHIP_ID)
    return message.reply(t(lang, "ortak.sahipSadece")).catch(() => {});

  const sub = (args[0] || "").toLowerCase();
  const hedef = String(args[1] || "").replace(/\D/g, "").slice(0, 25);

  if ((sub === "gör" || sub === "gor" || sub === "see" || sub === "show") && hedef) {
    const keys = verileriTara(hedef);
    const grup = {};
    for (const k of keys) {
      const base = k.split("_")[0].split(".")[0];
      grup[base] = (grup[base] || 0) + 1;
    }
    const ozet = Object.entries(grup).map(([g, n]) => `• \`${g}\`: ${n}`).join("\n") || "-";
    const liste = keys.slice(0, 30).map(k => `\`${k}\``).join("\n") || "-";
    const e = new EmbedBuilder().setColor("Blue")
      .setTitle(`🗄️ Veri Raporu: ${hedef}`)
      .setDescription(`Toplam **${keys.length}** kayıt`)
      .addFields(
        { name: "Özet", value: ozet.slice(0, 1000), inline: false },
        { name: "Kayıtlar (ilk 30)", value: liste.slice(0, 1000), inline: false }
      )
      .setFooter({ text: `Silmek için: r!veri sil ${hedef}` })
      .setTimestamp();
    return message.reply({ embeds: [e] }).catch(() => {});
  }

  if ((sub === "sil" || sub === "delete" || sub === "silme") && hedef) {
    const keys = verileriTara(hedef);
    let n = 0;
    for (const k of keys) {
      if (k.endsWith("(içinde)")) continue;
      try { db.delete(k); n++; } catch {}
    }
    // hatirlaticilar içinden temizle
    try {
      const hat = db.get("hatirlaticilar") || [];
      if (Array.isArray(hat) && hat.some(h => h.userId === hedef)) {
        db.set("hatirlaticilar", hat.filter(h => h.userId !== hedef)); n++;
      }
    } catch {}
    // ayarlar.json premiumIDs temizliği
    try {
      const ayarlar = require("../ayarlar.json");
      if (Array.isArray(ayarlar.premiumIDs) && ayarlar.premiumIDs.includes(hedef)) {
        ayarlar.premiumIDs = ayarlar.premiumIDs.filter(x => x !== hedef);
        require("fs").writeFileSync("./ayarlar.json", JSON.stringify(ayarlar, null, 2));
      }
    } catch {}
    try { ownerLog(client, `🗑️ **Veri silindi (sahip):** \`${hedef}\` — ${n} kayıt (${message.author.tag})`).catch(() => {}); } catch {}
    return message.reply(t(lang, "veri.silOk", { sayi: n, hedef })).catch(() => {});
  }

  return message.reply(t(lang, "veri.kullanim")).catch(() => {});
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["data", "veriler"], permLevel: 5, kategori: "sahip" };
exports.help = { name: "veri", description: "Sunucu/kullanıcı verilerini görür ve siler. (Sadece sahip)", usage: "veri gör <sunucuID|kullanıcıID> | veri sil <sunucuID|kullanıcıID>" };
