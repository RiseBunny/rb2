const { EmbedBuilder } = require("discord.js");
const { isPremium, premiumKalan } = require("../utils");
const { t, getLang } = require("../dil");

exports.run = async (client, message) => {
  const lang = await getLang(message.author.id);
  const aktif = isPremium(message.author.id);
  const kalan = aktif ? (premiumKalan(message.author.id) || "?") : "-";
  const durum = aktif ? t(lang, "premium.aktifDurum") : t(lang, "premium.pasifDurum");
  const e = new EmbedBuilder()
    .setColor(aktif ? "Gold" : "Grey")
    .setTitle("💎 Premium Durum")
    .setDescription(t(lang, "premium.durum", { durum, kalan }))
    .addFields({ name: (lang === "en" ? "Support" : "Destek"), value: (lang === "en" ? "[Support Server](https://dsc.gg/risebunny)" : "[Destek Sunucusu](https://dsc.gg/risebunny)") });
  await message.reply({ embeds: [e] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["premiumdurum", "vipdurum", "prem-durum"], permLevel: 0, kategori: "premium" };
exports.help = { name: "premium", description: "Premium durumunu gösterir.", usage: "premium" };
