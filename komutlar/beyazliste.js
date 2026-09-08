const { EmbedBuilder } = require("discord.js");
const db = require("croxydb");
const { t, getLang } = require("../dil");
const { SAHIP_ID } = require("../utils");

exports.run = async (client, message, args) => {
  const lang = await getLang(message.author.id);
  if (message.author.id !== SAHIP_ID)
    return message.channel.send(t(lang, "ortak.sahipSadece"));
  const user = (args[0] || "").replace(/[<@!>]/g, "");
  if (!user) {
    const e = new EmbedBuilder().setColor("Random")
      .setDescription(lang === "en" ? "Write the ID of the user to remove from the blacklist!" : "Karalisteden kaldırmak istediğin kullanıcının ID'sini yaz!");
    return message.channel.send({ embeds: [e] });
  }
  db.delete(`karalist_${user}`);
  try { db.delete(`sebep_${user}`); } catch {}
  const embed = new EmbedBuilder().setColor("Random")
    .setDescription(lang === "en"
      ? `<@${user}> has been removed from the blacklist!`
      : `<@${user}> adlı kullanıcı başarıyla karalisteden çıkartıldı!`);
  return message.channel.send({ embeds: [embed] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["whitelist", "beyaz-liste"], permLevel: 5, kategori: "koruma" };
exports.help = { name: "beyazliste", description: "Belirtilen kullancıyı kara listeden çıkartır!", usage: "beyazliste <kullanıcı ID>" };
