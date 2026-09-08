const { EmbedBuilder } = require("discord.js");
const db = require("croxydb");
const { t, getLang } = require("../dil");
const { SAHIP_ID, komutLog } = require("../utils");

exports.run = async (client, message, args) => {
  const lang = await getLang(message.author.id);
  if (message.author.id !== SAHIP_ID)
    return message.channel.send(t(lang, "ortak.sahipSadece"));
  const user = (args[0] || "").replace(/[<@!>]/g, "");
  const sebep = args.slice(1).join(" ");
  if (!user) {
    const e = new EmbedBuilder().setColor("Random")
      .setDescription(lang === "en" ? "Write the ID of the user to blacklist!" : "Karalisteye almak istediğin kullanıcının ID'sini yaz!");
    return message.channel.send({ embeds: [e] });
  }
  if (!sebep) {
    const e = new EmbedBuilder().setColor("Random")
      .setDescription(lang === "en" ? "Please specify a reason for the blacklist!" : "Lütfen karalisteye almak için bir sebep belirtin!");
    return message.channel.send({ embeds: [e] });
  }
  db.set(`karalist_${user}`, "aktif");
  db.set(`sebep_${user}`, sebep);
  const embed = new EmbedBuilder().setColor("Random")
    .setDescription(lang === "en"
      ? `<@${user}> has been blacklisted for: **${sebep}**!`
      : `<@${user}> adlı kullanıcı başarıyla **${sebep}** sebebiyle karalisteye alındı!`);
  await message.channel.send({ embeds: [embed] });
  await komutLog(client, message, "karaliste");
  try {
    const hedef = await client.users.fetch(user).catch(() => null);
    if (hedef) {
      const dm = new EmbedBuilder().setColor("Red").setFooter({ text: "RiseBunny" }).setTimestamp()
        .setDescription(t(lang, "karaliste.engellisin", { sebep }));
      await hedef.send({ embeds: [dm] }).catch(() => {});
    }
  } catch {}
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["blacklist", "kara-liste"], permLevel: 5, kategori: "koruma" };
exports.help = { name: "karaliste", description: "Belirtilen kullancıyı kara listeye alır!", usage: "karaliste <kullanıcı ID>" };
