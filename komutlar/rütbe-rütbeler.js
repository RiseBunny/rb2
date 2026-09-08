const { EmbedBuilder } = require("discord.js");
const db = require("croxydb");
const { getLangSync, t } = require("../dil");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  if (!message.guild) return;
  const data = db.fetch(`rewards_${message.guild.id}`) || [];
  const list = [...data].sort((x, y) => (y.targetInvite || 0) - (x.targetInvite || 0));
  if (list.length === 0) {
    const yok = new EmbedBuilder()
      .setAuthor({ name: (lang === "en" ? "No Rank Set" : "Hiç Bir Rank Ayarlanmamış") })
      .setDescription((lang === "en" ? "To set: r!invite-role @role <invite-count>" : "Ayarlamak için: r!rütbe-ekle @rol <davet-sayısı>"));
    return message.channel.send({ embeds: [yok] });
  }
  const satirlar = list.slice(0, 10).map((item, index) => "`" + (index + 1) + ".` <@&" + item.Id + ">: `" + item.Invite + " Davet`").join("\n");
  const embed = new EmbedBuilder().addFields({ name: (lang === "en" ? "Ranks" : "Rütbeler"), value: satirlar.slice(0, 1000) });
  return message.channel.send({ embeds: [embed] });
};
exports.conf = { enabled: true, guildOnly: true, aliases: [], permLevel: 0, kategori: "davet" };
exports.help = { name: "rütbeler", description: "Davet rütbelerini listeler.", usage: "rütbeler" };
