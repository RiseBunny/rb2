const Discord = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const U = require("../utils");

function durum() {
  const bot = db.fetch("8182bakımaç81") || null;
  const site = db.fetch("site_bakim") || null;
  return { bot, site: site && site.acik ? site : null };
}

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (message.author.id !== U.SAHIP_ID)
    return message.channel.send({ content: EN ? ' Only **my owner** can set maintenance mode.' : ' Sadece **sahibim** bakım modu ayarlayabilir.' });

  const sebep = args.slice(0).join(' ') || (EN ? 'Scheduled maintenance.' : 'Planlı bakım.');
  const st = durum();

  const embed = new Discord.EmbedBuilder().setColor("Gold")
    .setTitle(EN ? "🔧 Maintenance Panel" : "🔧 Bakım Paneli")
    .setDescription(
      `🤖 **Bot:** ${st.bot ? `🟥 ${(EN ? "ON" : "AÇIK")} — ${st.bot}` : `🟩 ${(EN ? "OFF" : "KAPALI")}`}\n` +
      `🌐 **Site:** ${st.site ? `🟥 ${(EN ? "ON" : "AÇIK")} — ${st.site.sebep}` : `🟩 ${(EN ? "OFF" : "KAPALI")}`}\n\n` +
      (EN ? "_Reason for opening: `r!bakım <reason>`_" : "_Açma sebebi: `r!bakım <sebep>`_"));

  const row = new Discord.ActionRowBuilder().addComponents(
    new Discord.ButtonBuilder().setCustomId("bakim_bot").setLabel(st.bot ? (EN ? "Close Bot" : "Botu Kapatma (Kapat)") : (EN ? "Open Bot" : "Botu Bakıma Al")).setStyle(st.bot ? Discord.ButtonStyle.Success : Discord.ButtonStyle.Danger).setEmoji("🤖"),
    new Discord.ButtonBuilder().setCustomId("bakim_site").setLabel(st.site ? (EN ? "Close Site" : "Siteyi Aç") : (EN ? "Open Site" : "Siteyi Bakıma Al")).setStyle(st.site ? Discord.ButtonStyle.Success : Discord.ButtonStyle.Danger).setEmoji("🌐")
  );

  const panel = await message.channel.send({ embeds: [embed], components: [row] });
  const col = panel.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 120000
  });

  col.on("collect", async (i) => {
    try {
      const s = durum();
      if (i.customId === "bakim_bot") {
        if (s.bot) { db.delete("8182bakımaç81"); await i.reply({ content: EN ? "✅ Bot maintenance closed." : "✅ Bot bakımı kapatıldı.", ephemeral: true }).catch(() => {}); }
        else { db.set("8182bakımaç81", sebep); await i.reply({ content: (EN ? "🔧 Bot maintenance ON: **" : "🔧 Bot bakıma alındı: **") + sebep + "**", ephemeral: true }).catch(() => {}); }
      } else if (i.customId === "bakim_site") {
        if (s.site) { db.delete("site_bakim"); await i.reply({ content: EN ? "✅ Site maintenance closed." : "✅ Site bakımı kapatıldı.", ephemeral: true }).catch(() => {}); }
        else { db.set("site_bakim", { acik: true, sebep, at: Date.now() }); await i.reply({ content: (EN ? "🔧 Site maintenance ON: **" : "🔧 Site bakıma alındı: **") + sebep + "**", ephemeral: true }).catch(() => {}); }
      }
      const n = durum();
      const e2 = new Discord.EmbedBuilder().setColor("Gold")
        .setTitle(EN ? "🔧 Maintenance Panel" : "🔧 Bakım Paneli")
        .setDescription(
          `🤖 **Bot:** ${n.bot ? `🟥 ${(EN ? "ON" : "AÇIK")} — ${n.bot}` : `🟩 ${(EN ? "OFF" : "KAPALI")}`}\n` +
          `🌐 **Site:** ${n.site ? `🟥 ${(EN ? "ON" : "AÇIK")} — ${n.site.sebep}` : `🟩 ${(EN ? "OFF" : "KAPALI")}`}`);
      const r2 = new Discord.ActionRowBuilder().addComponents(
        new Discord.ButtonBuilder().setCustomId("bakim_bot").setLabel(n.bot ? (EN ? "Close Bot" : "Bot Bakımını Kapat") : (EN ? "Open Bot" : "Botu Bakıma Al")).setStyle(n.bot ? Discord.ButtonStyle.Success : Discord.ButtonStyle.Danger).setEmoji("🤖"),
        new Discord.ButtonBuilder().setCustomId("bakim_site").setLabel(n.site ? (EN ? "Close Site" : "Siteyi Aç") : (EN ? "Open Site" : "Siteyi Bakıma Al")).setStyle(n.site ? Discord.ButtonStyle.Success : Discord.ButtonStyle.Danger).setEmoji("🌐")
      );
      await i.message.edit({ embeds: [e2], components: [r2] }).catch(() => {});
    } catch {}
  });
  col.on("end", async () => {
    await panel.edit({ components: [] }).catch(() => {});
  });
};

exports.conf = { enabled: true, guildOnly: false, aliases: [], permLevel: 4, kategori: "sahip" };
exports.help = { name: 'bakım', description: 'Bakım paneli: bot + site (sahip).', usage: 'bakım [sebep]' };
