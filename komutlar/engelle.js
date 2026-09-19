const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");
const db = require("croxydb");
const { getLangSync, t } = require("../dil");
const { isPremium, SAHIP_ID } = require("../utils");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  if (!message.guild) return;

  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply(t(lang, "ortak.yoneticiGerek")).catch(() => {});

  // 💎 Premium kontrol (sahip muaf) — çeviri: ortak.premiumGerek
  if (message.author.id !== SAHIP_ID && !isPremium(message.author.id)) {
    const e = new EmbedBuilder().setColor("Gold")
      .setTitle(t(lang, "engelle.baslik"))
      .setDescription(t(lang, "ortak.premiumGerek"));
    return message.reply({ embeds: [e] }).catch(() => {});
  }

  const sub = (args[0] || "").toLowerCase();
  const key = `engel_${message.guild.id}`;

  if (sub === "kapat" || sub === "off") {
    try { db.delete(key); } catch {}
    try { require("../utils").ownerLog(client, `🚫 **Engel kapatıldı:** **${message.guild.name}** (${message.guild.id}) — ${message.author.tag}`).catch(() => {}); } catch {}
    return message.reply(t(lang, "engelle.kapatildi")).catch(() => {});
  }

  if (sub === "durum" || sub === "status") {
    const cur = db.fetch(key);
    if (!cur) return message.reply(t(lang, "engelle.durumYok")).catch(() => {});
    const kapsam = cur.kapsam === "sunucu"
      ? t(lang, "engelle.kapsamSunucu")
      : t(lang, "engelle.kapsamKanal", { kanal: `<#${cur.kanalId}>` });
    return message.reply(t(lang, "engelle.durumVar", { kapsam, engelleyen: `<@${cur.engelleyen}>` })).catch(() => {});
  }

  // Varsayılan: kapsam sor (butonlar - komutu kullananın dilinde, çevirili)
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`engel_sunucu_${message.guild.id}`).setLabel(t(lang, "engelle.butonSunucu")).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`engel_kanal_${message.guild.id}_${message.channel.id}`).setLabel(t(lang, "engelle.butonKanal")).setStyle(ButtonStyle.Primary)
  );
  const e = new EmbedBuilder().setColor("Orange")
    .setTitle(t(lang, "engelle.baslik"))
    .setDescription(t(lang, "engelle.kapsamSor"))
    .setFooter({ text: t(lang, "engelle.altBilgi") });
  return message.reply({ embeds: [e], components: [row] }).catch(() => {});
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["block", "komutengelle", "komut-engelle"], permLevel: 4, kategori: "moderasyon" };
exports.help = { name: "engelle", description: "Komutları sunucuda veya kanalda engeller (Premium).", usage: "engelle | engelle kapat | engelle durum" };
