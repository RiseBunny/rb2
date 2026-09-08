const { EmbedBuilder } = require("discord.js");
const ms = require("ms");
const { getLang } = require("../dil");
const { getLangSync, t } = require("../dil");

/** YENİ ÖZELLİK: r!hatırlat 10m <not> — süre dolunca etiketleyip hatırlatır. */
exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  await getLang(message.author.id);
  const sureStr = args[0];
  const not = args.slice(1).join(" ") || "Hatırlatma!";
  if (!sureStr) return message.reply((lang === "en" ? "Usage: `r!remind 10m <note>` (e.g. 30s, 10m, 2h, 1d — max 7 days)" : "Kullanım: `r!hatırlat 10m <not>` (örn: 30s, 10m, 2h, 1d — en fazla 7 gün)"));
  const sure = ms(sureStr);
  if (!sure || sure < 10000 || sure > 7 * 24 * 3600 * 1000)
    return message.reply((lang === "en" ? "Duration must be between 10 seconds and 7 days." : "Süre 10 saniye - 7 gün arasında olmalı."));
  const e = new EmbedBuilder().setColor("Blue").setTitle((lang === "en" ? "⏰ Reminder set" : "⏰ Hatırlatıcı kuruldu"))
    .setDescription((lang === "en" ? `**Time:** ${ms(sure, { long: true })}\n**Note:** ${not.slice(0, 500)}` : `**Süre:** ${ms(sure, { long: true })}\n**Not:** ${not.slice(0, 500)}`));
  await message.reply({ embeds: [e] });
  setTimeout(async () => {
    const e2 = new EmbedBuilder().setColor("Green").setTitle((lang === "en" ? "⏰ Reminder!" : "⏰ Hatırlatma!"))
      .setDescription((lang === "en" ? `${message.author}, **Note:** ${not.slice(0, 1500)}` : `${message.author}, **Not:** ${not.slice(0, 1500)}`));
    try { await message.channel.send({ content: `${message.author}`, embeds: [e2] }); } catch {}
  }, sure);
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["hatirlat", "remind", "reminder"], permLevel: 0, kategori: "kullanici" };
exports.help = { name: "hatırlat", description: "Belirtilen süre sonra hatırlatır.", usage: "hatırlat 10m <not>" };
