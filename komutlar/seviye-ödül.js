const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('croxydb');
const { getLangSync, t } = require("../dil");
const { SEVIYE_ODULLERI } = require("../utils");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const alt = (args[0] || "").toLowerCase();

  // r!seviye-ödül -> tüm ödülleri listele
  if (!alt || alt === "liste" || alt === "list") {
    const paraSatirlari = Object.entries(SEVIYE_ODULLERI)
      .sort((a, b) => a[0] - b[0])
      .map(([s, odul]) => `${EN ? "Level" : "Seviye"} **${s}** → ${Number(odul).toLocaleString()} 💸`);
    const rolKayitlari = db.get(`seviyeRoller_${message.guild.id}`) || {};
    const rolSatirlari = Object.entries(rolKayitlari)
      .sort((a, b) => a[0] - b[0])
      .map(([s, rolId]) => `${EN ? "Level" : "Seviye"} **${s}** → <@&${rolId}>`);
    const e = new EmbedBuilder()
      .setColor("Gold")
      .setTitle(EN ? "🏆 Level Rewards" : "🏆 Seviye Ödülleri")
      .addFields(
        { name: EN ? "💰 Money rewards" : "💰 Para ödülleri", value: paraSatirlari.join("\n") || "-" },
        { name: EN ? "🎖️ Role rewards" : "🎖️ Rol ödülleri", value: rolSatirlari.join("\n") || "-" }
      );
    return message.channel.send({ embeds: [e] });
  }

  // r!seviye-ödül rol <seviye> @rol -> seviyeye rol ödülü tanımla
  if (alt === "rol" || alt === "role") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply(t(lang, "sistem.yonetici"));
    const seviye = parseInt(args[1]);
    if (isNaN(seviye) || seviye < 1) return message.reply(EN ? "Enter a valid level." : "Geçerli bir seviye girin.");
    const rol = message.mentions.roles.first();
    if (!rol) return message.reply(t(lang, "sistem.rolBelirt"));
    const kayitlar = db.get(`seviyeRoller_${message.guild.id}`) || {};
    kayitlar[seviye] = rol.id;
    db.set(`seviyeRoller_${message.guild.id}`, kayitlar);
    return message.reply(EN ? `Level ${seviye} role reward set to ${rol}.` : `Seviye ${seviye} rol ödülü ${rol} olarak ayarlandı.`);
  }

  // r!seviye-ödül sil <seviye> -> rol ödülünü kaldır
  if (alt === "sil" || alt === "delete") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply(t(lang, "sistem.yonetici"));
    const seviye = parseInt(args[1]);
    if (isNaN(seviye)) return message.reply(EN ? "Enter a valid level." : "Geçerli bir seviye girin.");
    const kayitlar = db.get(`seviyeRoller_${message.guild.id}`) || {};
    if (kayitlar[seviye]) { delete kayitlar[seviye]; db.set(`seviyeRoller_${message.guild.id}`, kayitlar); }
    return message.reply(EN ? `Level ${seviye} role reward removed.` : `Seviye ${seviye} rol ödülü kaldırıldı.`);
  }

  return message.reply(EN ? "Usage: `level-reward [list] | role <level> @role | delete <level>`" : "Kullanım: `seviye-ödül [liste] | rol <seviye> @rol | sil <seviye>`");
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["seviyeodul", "level-reward", "seviye-odul"], permLevel: 0, kategori: "seviye" };
exports.help = { name: "seviye-ödül", description: "Seviye ödüllerini listeler ve rol ödülü tanımlar.", usage: "seviye-ödül [liste|rol <seviye> @rol|sil <seviye>]" };
