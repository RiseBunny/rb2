const { EmbedBuilder } = require("discord.js");
const { getLangSync, t } = require("../dil");
const { checkAndGiveLevelRole } = require("../utils");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";

  const loading = await message.reply(EN ? "⏳ Checking your level and role eligibility..." : "⏳ Seviyeniz ve rol hak kontrol ediliyor...");

  const result = await checkAndGiveLevelRole(client, message.author.id);

  const e = new EmbedBuilder()
    .setColor(result.ok ? "Green" : "Red")
    .setTitle(result.ok ? (EN ? "✅ Role Check Complete" : "✅ Rol Kontrolü Tamam") : (EN ? "❌ Role Not Available" : "❌ Rol Verilemedi"))
    .setDescription(result.msg)
    .setTimestamp();

  if (result.ok) {
    const xp = Number(require("croxydb").fetch(`xp_${message.author.id}`) || 0);
    const seviye = require("../utils").xpSeviye(xp);
    e.addFields({ name: EN ? "Your Level" : "Seviyeniz", value: String(seviye), inline: true });
    if (seviye >= 25) {
      e.addFields({ name: EN ? "VIP Role" : "VIP Rolü", value: EN ? "Eligible ✅" : "Hak kazandınız ✅", inline: true });
    }
  }

  await loading.edit({ embeds: [e], content: null }).catch(() => {});
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["rol-al", "claimrole", "level-role"], permLevel: 0, kategori: "seviye" };
exports.help = { name: "rolal", description: "Seviye 25+ ise hedef sunucuda VIP rolünü alır.", usage: "rolal" };