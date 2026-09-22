const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { getLangSync } = require("../dil");
const { SAHIP_ID, ownerLog, siteRolVer } = require("../utils");

const YETKILILER = [SAHIP_ID, "1310366324731547798"];
// Sitedeki (Firestore users.role) roller — Discord rolleri DEĞİL
const SITE_ROLLER = [
  { id: "member",    emoji: "🐰", tr: "Üye",        en: "Member" },
  { id: "vip",       emoji: "⭐", tr: "VIP",        en: "VIP" },
  { id: "developer", emoji: "💻", tr: "Geliştirici", en: "Developer" },
  { id: "moderator", emoji: "🛡️", tr: "Moderatör",   en: "Moderator" },
  // kurucu bilerek listede YOK (verilemez)
];

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (!YETKILILER.includes(message.author.id))
    return message.reply(EN ? "Only authorized staff can use this." : "Bunu sadece yetkililer kullanabilir.").catch(() => {});

  // Hedefler: etiket + ham ID (çoklu)
  const hedefler = new Set();
  (message.mentions.members || new Map()).forEach(m => { if (!m.user.bot) hedefler.add(m.id); });
  (message.mentions.users || new Map()).forEach(u => { if (!u.bot) hedefler.add(u.id); });
  for (const a of args) {
    const id = String(a).replace(/[<@!>]/g, "");
    if (/^\d{15,25}$/.test(id)) hedefler.add(id);
  }
  if (!hedefler.size)
    return message.reply(EN ? "Mention users or type IDs: `siterol @a @b`" : "Kullanıcı etiketle ya da ID yaz: `siterol @a @b` (çoklu olur).");

  const e = new EmbedBuilder().setColor("Gold")
    .setTitle(EN ? "🌐 Site Role" : "🌐 Site Rolü Ver")
    .setDescription(`${[...hedefler].map(id => `<@${id}>`).join(" ")}\n\n${EN ? "Pick the WEBSITE role (forum role, not Discord):" : "Verilecek SİTE rolünü seç (forum rolü — Discord rolü değil):"}`);
  const opts = SITE_ROLLER.map(r => new StringSelectMenuOptionBuilder()
    .setLabel(`${r.emoji} ${EN ? r.en : r.tr}`.slice(0, 100)).setValue(r.id)
    .setDescription(`site: ${r.id}`.slice(0, 100)));
  const m = await message.channel.send({ embeds: [e], components: [new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId("siterol_sec").setPlaceholder(EN ? "Pick a site role..." : "Site rolü seç...").addOptions(opts)
  )] });
  const col = m.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: 60000 });
  col.on("collect", async (i) => {
    try {
      await i.deferUpdate().catch(() => {});
      const rol = i.values[0];
      const ok = [], hata = [], yok = [];
      for (const uid of hedefler) {
        const r = await siteRolVer(uid, rol);
        if (r.ok) {
          ok.push(uid);
          try {
            const u = await client.users.fetch(uid).catch(() => null);
            if (u) await u.send({ embeds: [new EmbedBuilder().setColor("Gold")
              .setTitle(EN ? "🌐 New Site Role!" : "🌐 Yeni Site Rolün Var!")
              .setDescription(EN ? `Your forum role is now **${rol}**!` : `Forum rolün artık **${rol}**!`)
              .setTimestamp()] }).catch(() => {});
          } catch {}
        } else if (r.neden === "hesap-yok") yok.push(uid);
        else hata.push(uid);
      }
      const ozet = new EmbedBuilder().setColor(ok.length ? "Gold" : "Red")
        .setTitle(EN ? "🌐 Site Roles Assigned" : "🌐 Site Rolleri Verildi")
        .setDescription(`**${rol}**\n✅ ${ok.length ? ok.map(id => `<@${id}>`).join(" ") : "—"}` +
          (yok.length ? `\n\n⚠️ ${EN ? "No site account (login with Discord first)" : "Site hesabı yok (önce Discord ile giriş yapmalı)"}: ${yok.map(id => `<@${id}>`).join(" ")}` : "") +
          (hata.length ? `\n❌ ${hata.map(id => `\`${id}\``).join(" ")}` : ""));
      await m.edit({ embeds: [ozet], components: [] }).catch(() => {});
      ownerLog(client, new EmbedBuilder().setColor("Gold").setTitle("🌐 Site Rolü")
        .setDescription(`**Veren:** ${message.author.tag}\n**Site rolü:** ${rol}\n**Alanlar:** ${ok.map(id => `<@${id}>`).join(" ") || "—"}${yok.length ? `\n**Hesap yok:** ${yok.join(", ")}` : ""}${hata.length ? `\n**Hata:** ${hata.join(", ")}` : ""}`)
        .setTimestamp()).catch(() => {});
    } catch {}
  });
  col.on("end", () => m.edit({ components: [] }).catch(() => {}));
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["site-rol", "siterole"], permLevel: 0, kategori: "genel" };
exports.help = { name: "siterol", description: "Site/forum rolünü kullanıcılara verir (member/vip/developer/moderator).", usage: "siterol @kullanıcı [ID...]" };
