const { EmbedBuilder } = require("discord.js");
const { removePremium, isPremium, ownerLog, SAHIP_ID } = require("../utils");
const { t, getLang } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = await getLang(message.author.id);
  if (message.author.id !== SAHIP_ID) return message.reply(t(lang, "ortak.sahipSadece"));

  const hedef = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0].replace(/[<@!>]/g, "")).catch(() => null) : null);
  if (!hedef) return message.reply((lang === "en" ? "Mention a user or enter an ID!" : "Bir kullanıcı etiketleyin veya ID girin!"));

  if (!isPremium(hedef.id)) return message.reply(t(lang, "premium.degil"));
  removePremium(hedef.id);
  await message.reply(t(lang, "premium.silindi"));
  await ownerLog(client, new EmbedBuilder().setColor("Red").setDescription((lang === "en" ? `💎 Premium removed: **${hedef.tag}** (${hedef.id}) | By: ${message.author.tag}` : `💎 Premium silindi: **${hedef.tag}** (${hedef.id}) | Silen: ${message.author.tag}`)));
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["premiumsill", "deactivatepremium", "presil", "premiumsil"], permLevel: 5, kategori: "premium" };
exports.help = { name: "premium-sil", description: "Belirtilen kullanıcının premiumunu siler (sahip).", usage: "premium-sil <@kullanıcı/ID>" };
