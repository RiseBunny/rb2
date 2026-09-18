const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { t, getLang } = require("../dil");
const { ownerLog } = require("../utils");
const db = require("croxydb");

exports.run = async (client, message) => {
  const lang = await getLang(message.author.id);
  if (!message.guild) return;
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply(t(lang, "ortak.yoneticiGerek"));
  const channel = message.mentions.channels.first();
  if (!channel || !channel.isTextBased()) return message.reply(t(lang, "ticket.kanalYok", { prefix: "r!" }));
  db.set(`kanal.${message.guild.id}`, channel.id);
  /* Etiketlenen kanala butonlu ticket panelini hemen gönder. */
  const panel = new EmbedBuilder()
    .setColor("#ee7621")
    .setTitle(t(lang, "ticketPanel.baslik"))
    .setDescription(t(lang, "ticketPanel.aciklama"))
    .setFooter({ text: "RiseBunny" });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket_ac").setLabel(t(lang, "ticketPanel.buton")).setStyle(ButtonStyle.Primary).setEmoji("🎫")
  );
  try {
    await channel.send({ embeds: [panel], components: [row] });
  } catch {
    return message.reply(t(lang, "ortak.hata"));
  }
  await message.channel.send(t(lang, "ticket.kanalOk", { kanal: `${channel}` }));
  await ownerLog(client, new EmbedBuilder().setColor("Blue").setDescription((lang === "en" ? `🎫 Ticket channel set: **${message.guild.name}** → ${channel}` : `🎫 Ticket kanalı ayarlandı: **${message.guild.name}** → ${channel}`)));
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["ticket-kanal-ayarla", "ticketkanalayarla", "ticket-kanal"], permLevel: 0, kategori: "ticket" };
exports.help = { name: "ticketayarla", description: "Ticket panelinin gönderileceği kanalı ayarlar.", usage: "ticketayarla #kanal" };
