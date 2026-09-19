const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const { SAHIP_ID, ownerLog } = require("../utils");

const YETKILILER = [SAHIP_ID, "1310366324731547798"];

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (!YETKILILER.includes(message.author.id))
    return message.reply(EN ? "Only authorized staff can use this." : "Bunu sadece yetkililer kullanabilir.").catch(() => {});
  if (!message.guild) return message.reply(EN ? "Guild only." : "Sadece sunucuda.");

  // Hedefler: etiket + ham ID (çoklu)
  const hedefler = new Set();
  message.mentions.members.forEach(m => { if (!m.user.bot) hedefler.add(m.id); });
  for (const a of args) {
    const id = String(a).replace(/[<@!>]/g, "");
    if (/^\d{15,25}$/.test(id)) hedefler.add(id);
  }
  if (!hedefler.size)
    return message.reply(EN ? "Mention users or type IDs: `siterol @a @b`" : "Kullanıcı etiketle ya da ID yaz: `siterol @a @b` (çoklu olur).");

  // Verilebilir roller: kurucu hariç, yönetilebilirler
  const ben = message.guild.members.me;
  const roller = message.guild.roles.cache
    .filter(r => r.id !== message.guild.id && !r.managed && r.name.toLowerCase() !== "kurucu" && !r.name.toLowerCase().includes("kurucu"))
    .filter(r => !ben || r.position < ben.roles.highest.position)
    .sort((a, b) => b.position - a.position)
    .first(24);
  if (!roller.length) return message.reply(EN ? "No assignable roles." : "Verilebilir rol yok (botun rolünün altında rol olmalı).");

  const e = new EmbedBuilder().setColor("Gold")
    .setTitle(EN ? "🎭 Site Rolü Ver" : "🎭 Site Rolü Ver")
    .setDescription(`${[...hedefler].map(id => `<@${id}>`).join(" ")}\n\n${EN ? "Pick the role to assign (kurucu excluded):" : "Verilecek rolü seç (kurucu hariç):"}`);
  const opts = roller.map(r => new StringSelectMenuOptionBuilder()
    .setLabel(`@${r.name}`.slice(0, 100)).setValue(r.id)
    .setDescription(`${r.members.size} ${EN ? "members" : "üye"}`.slice(0, 100)));
  const m = await message.channel.send({ embeds: [e], components: [new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId("siterol_sec").setPlaceholder(EN ? "Pick a role..." : "Rol seç...").addOptions(opts)
  )] });
  const col = m.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: 60000 });
  col.on("collect", async (i) => {
    try {
      await i.deferUpdate().catch(() => {});
      const rol = message.guild.roles.cache.get(i.values[0]);
      if (!rol) return;
      const ok = [], hata = [];
      for (const uid of hedefler) {
        try {
          const uye = await message.guild.members.fetch(uid).catch(() => null);
          if (!uye) { hata.push(uid); continue; }
          await uye.roles.add(rol).catch(() => { throw new Error("x"); });
          ok.push(uid);
          // DM (embed)
          try {
            const u = await client.users.fetch(uid).catch(() => null);
            if (u) await u.send({ embeds: [new EmbedBuilder().setColor("Gold")
              .setTitle(EN ? "🎭 New Role!" : "🎭 Yeni Rolün Var!")
              .setDescription(EN ? `You got **@${rol.name}** on **${message.guild.name}**!` : `**${message.guild.name}** sunucusunda **@${rol.name}** rolünü aldın!`)
              .setTimestamp()] }).catch(() => {});
          } catch {}
        } catch { hata.push(uid); }
      }
      const ozet = new EmbedBuilder().setColor(ok.length ? "Gold" : "Red")
        .setTitle(EN ? "🎭 Roles Assigned" : "🎭 Roller Verildi")
        .setDescription(`**@${rol.name}**\n✅ ${ok.length ? ok.map(id => `<@${id}>`).join(" ") : "—"}${hata.length ? `\n❌ ${hata.map(id => `\`${id}\``).join(" ")}` : ""}`);
      await m.edit({ embeds: [ozet], components: [] }).catch(() => {});
      ownerLog(client, new EmbedBuilder().setColor("Gold").setTitle("🎭 Site Rolü")
        .setDescription(`**Veren:** ${message.author.tag}\n**Rol:** @${rol.name}\n**Alanlar:** ${ok.map(id => `<@${id}>`).join(" ") || "—"}${hata.length ? `\n**Hata:** ${hata.join(", ")}` : ""}\n**Sunucu:** ${message.guild.name}`)
        .setTimestamp()).catch(() => {});
    } catch {}
  });
  col.on("end", () => m.edit({ components: [] }).catch(() => {}));
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["site-rol", "siterole"], permLevel: 0, kategori: "genel" };
exports.help = { name: "siterol", description: "Site/forum rolünü seçip kullanıcılara verir (kurucu hariç, yetkililer).", usage: "siterol @kullanıcı [ID...]" };
