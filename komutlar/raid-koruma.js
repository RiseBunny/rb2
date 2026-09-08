const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('croxydb');
const { getLangSync, t } = require("../dil");
const { PREFIX } = require("../utils");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const prefix = process.env.PREFIX || PREFIX;
  const isOwner = Boolean(message.guild && message.guild.ownerId === message.author.id);

  if (!isOwner && !message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply(t(lang, "sistem.yonetici"));

  const alt = (args[0] || "").toLowerCase();
  const key = `raidkoruma_${message.guild.id}`;

  // Aç komutu: r!raid aç [eşik] [@rol]
  if (alt === "aç" || alt === "ac" || alt === "on" || alt === "aktif" || alt === "enable") {
    const esikArg = args.slice(1).find(a => /^\d+$/.test(a));
    const esik = esikArg ? Math.max(2, parseInt(esikArg)) : 5;
    const rol = message.mentions.roles.first() || (args.slice(1).find(a => message.guild.roles.cache.has(a)) ? message.guild.roles.cache.get(args.slice(1).find(a => message.guild.roles.cache.has(a))) : null);

    db.set(key, { durum: "açık", esik, rol: rol ? rol.id : null });
    const replyText = rol
      ? t(lang, "raid.acildiRol", { esik, rol: `<@&${rol.id}>` })
      : t(lang, "raid.acildi", { esik });
    return message.reply(replyText);
  }

  // Kapat komutu: r!raid kapat / kapa
  if (alt === "kapat" || alt === "kapa" || alt === "off" || alt === "deaktif" || alt === "disable") {
    try { db.delete(key); } catch {}
    return message.reply(t(lang, "raid.kapatildi"));
  }

  // Durum veya argümansız çağrım: Durum embedi + Aç / Kapat butonları
  const ayar = db.fetch(key);
  const acik = Boolean(ayar && ayar.durum === "açık");

  const embed = new EmbedBuilder()
    .setColor(acik ? "Green" : "Red")
    .setTitle(t(lang, "raid.embedBaslik"))
    .setDescription(acik
      ? t(lang, "raid.durumAcik", { esik: ayar.esik || 5, rol: ayar.rol ? `<@&${ayar.rol}>` : t(lang, "raid.rolYok"), prefix })
      : t(lang, "raid.durumKapali", { prefix }))
    .setFooter({ text: `RiseBunny • ${prefix}raid` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("raid_btn_ac")
      .setLabel(t(lang, "raid.butonAc"))
      .setStyle(ButtonStyle.Success)
      .setEmoji("🛡️")
      .setDisabled(acik),
    new ButtonBuilder()
      .setCustomId("raid_btn_kapat")
      .setLabel(t(lang, "raid.butonKapat"))
      .setStyle(ButtonStyle.Danger)
      .setEmoji("❌")
      .setDisabled(!acik)
  );

  return message.reply({ embeds: [embed], components: [row] });
};

exports.conf = {
  enabled: true,
  guildOnly: true,
  aliases: ["raid", "raidkoruma", "raid-protection", "antiraid"],
  permLevel: 0,
  kategori: "koruma"
};

exports.help = {
  name: "raid-koruma",
  description: "Kısa sürede çok katılım olursa otomatik doğrulama ve koruma yapar.",
  usage: "raid aç [eşik] [@rol] | raid kapat | raid"
};
