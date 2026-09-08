const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('croxydb');
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
    return message.reply(t(lang, "sistem.sunucuYonet"));

  const alt = (args[0] || "").toLowerCase();
  const key = `isimlog_${message.guild.id}`;

  if (alt === "kapat" || alt === "off") {
    try { db.delete(key); } catch {}
    return message.reply(EN ? "Nickname log disabled." : "İsim değiştirme günlüğü kapatıldı.");
  }

  const kanal = message.mentions.channels.first();
  if (!kanal) {
    const mevcut = db.fetch(key);
    return message.reply(EN
      ? (mevcut ? `Nickname log channel: <#${mevcut}>` : "Usage: `nickname-log #channel` (or `nickname-log off`).")
      : (mevcut ? `İsim log kanalı: <#${mevcut}>` : "Kullanım: `isim-log #kanal` (veya `isim-log kapat`)."));
  }

  db.set(key, kanal.id);
  return message.reply(EN ? `Nickname log channel set to ${kanal}.` : `İsim log kanalı ${kanal} olarak ayarlandı.`);
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["isimlog", "nickname-log", "nicklog"], permLevel: 0, kategori: "moderasyon" };
exports.help = { name: "isim-log", description: "Kullanıcıların isim değişikliklerini loglar.", usage: "isim-log #kanal | kapat" };
