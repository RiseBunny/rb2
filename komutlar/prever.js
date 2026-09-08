const { EmbedBuilder } = require("discord.js");
const { addPremium, ownerLog, SAHIP_ID } = require("../utils");
const { t, getLang } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = await getLang(message.author.id);
  if (message.author.id !== SAHIP_ID) return message.reply(t(lang, "ortak.sahipSadece"));

  const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
  if (!target) return message.reply(t(lang, "premium.etiketle"));

  // Sure: r!premium-ver @kisi 30 (gun, varsayilan 30)
  const gun = Math.min(Math.max(parseInt(args[1]) || 30, 1), 365);
  addPremium(target.id, gun * 24 * 60 * 60 * 1000);

  await message.reply(t(lang, "premium.verildi", { kullanici: target.tag }) + (lang === "en" ? ` (${gun} days)` : ` (${gun} gün)`));
  await ownerLog(client, new EmbedBuilder().setColor("Gold").setDescription((lang === "en" ? `💎 Premium given: **${target.tag}** (${target.id}) | By: ${message.author.tag} | Duration: ${gun} days` : `💎 Premium verildi: **${target.tag}** (${target.id}) | Veren: ${message.author.tag} | Süre: ${gun} gün`)));
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["prever", "verpremium", "premiumver"], permLevel: 4, kategori: "premium" };
exports.help = { name: "premium-ver", description: "Belirtilen kullanıcıya premium verir (sahip).", usage: "premium-ver <@kullanıcı> [gün]" };
