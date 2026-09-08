const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const ms = require("ms");
const { t, getLang } = require("../dil");
const { komutLog, timedDelete } = require("../utils");

exports.run = async (client, message, args) => {
  const lang = await getLang(message.author.id);
  const hata = async (mesaj) => {
    const embed = new EmbedBuilder()
      .setTitle((lang === "en" ? "Oops.. Error!" : "Olamaz.. Hata!"))
      .setColor("#00ff00")
      .setDescription(mesaj)
      .setFooter({ text: `${client.user.username} | ${lang === "en" ? "Mute System" : "Mute Sistemi"}`, iconURL: client.user.displayAvatarURL() });
    const m = await message.channel.send({ embeds: [embed] }).catch(() => null);
    if (m) timedDelete(m, 11000);
  };

  if (!message.guild) return;
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
    return hata(t(lang, "ortak.yetki", { yetki: "Üyeleri Sustur" }));

  const uye = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
  const sureStr = args[1];
  let sebep = args.slice(2).join(" ") || (lang === "en" ? "No reason given!" : "Bir neden girilmedi!");

  if (!uye || uye.user.bot) return hata(t(lang, "moderasyon.muteOrnek"));
  if (!sureStr) return hata(t(lang, "moderasyon.muteSure"));
  const sure = ms(sureStr.replace("saat", "h").replace("dakika", "m").replace("saniye", "s"));
  if (!sure || sure < 5000 || sure > 28 * 24 * 3600 * 1000) return hata(lang === "en" ? "Duration must be 5 seconds - 28 days. E.g. `10m`, `1h`, `1d`" : "Süre 5 saniye - 28 gün arasında olmalı. Örn: `10m`, `1h`, `1d`");

  const sahipId = process.env.SAHIP_ID || "985126554306773063";
  if (uye.id === sahipId) return message.reply(t(lang, "moderasyon.muteSahip"));
  if (!uye.moderatable) return hata(lang === "en" ? "I cannot mute this user (role order)." : "Bu kullanıcıyı susturamıyorum (rol sıralaması).");

  try {
    await uye.timeout(sure, `${message.author.tag}: ${sebep}`.slice(0, 490));
  } catch {
    return hata(lang === "en" ? "Mute failed." : "Mute işlemi başarısız.");
  }
  const embed = new EmbedBuilder()
    .setColor("Green")
    .setDescription((lang === "en" ? `🔇 ${uye} muted for **${ms(sure, { long: true })}**.\n**Reason:** ${sebep}` : `🔇 ${uye} **${ms(sure, { long: true })}** süreyle susturuldu.\n**Sebep:** ${sebep}`));
  await message.channel.send({ embeds: [embed] });
  await komutLog(client, message, "mute");
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["sustur", "timeout"], permLevel: 0, kategori: "moderasyon" };
exports.help = { name: "mute", description: "Kullanıcıyı süreli susturur (timeout).", usage: "mute @kullanıcı 10m [sebep]" };
