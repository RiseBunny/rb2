const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getLangSync } = require("../dil");
const { isPremium, DESTEK } = require("../utils");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const aktif = isPremium(message.author.id);

  const e = new EmbedBuilder()
    .setColor("Gold")
    .setTitle("💎 Premium Panel")
    .setDescription(EN
      ? `**Premium membership:** ${aktif ? "✅ Active" : "❌ Inactive"}\n\n**Premium perks:**`
      : `**Premium üyelik:** ${aktif ? "✅ Aktif" : "❌ Pasif"}\n\n**Premium ayrıcalıkları:**`)
    .addFields(
      { name: "💰", value: EN ? "**+50% bonus** on work, daily streak and jobs" : "Çalışma, günlük zincir ve mesleklerde **%50 bonus**", inline: true },
      { name: "🏦", value: EN ? "**Double bank interest** (4% instead of 2%)" : "**Çift banka faizi** (%2 yerine %4)", inline: true },
      { name: "🎁", value: EN ? "**Premium daily bonus** (`daily-bonus`)" : "**Premium günlük bonus** (`günlük-bonus`)", inline: true },
      { name: "🐾", value: EN ? "Buy **premium pets** (Lion, Tiger)" : "**Premium petler** satın al (Aslan, Kaplan)", inline: true },
      { name: "🛡️", value: EN ? "**Premium protection** (`protection`)" : "**Premium koruma** (`koruma`)", inline: true },
      { name: "⭐", value: EN ? "**Priority** in support tickets" : "Destek biletlerinde **öncelik**", inline: true }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel(EN ? "Buy Premium" : "Premium Al").setStyle(ButtonStyle.Link).setURL(DESTEK)
  );
  await message.channel.send({ embeds: [e], components: [row] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["premium-panel", "premiumpanel", "premium-ayricaliklar"], permLevel: 0, kategori: "premium" };
exports.help = { name: "premium-panel", description: "Premium ayrıcalıklarını gösterir.", usage: "premium-panel" };
