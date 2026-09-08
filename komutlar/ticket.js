const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { t, getLang } = require("../dil");
const { isPremium, DESTEK, PREFIX, safeSend, ownerLog } = require("../utils");
const db = require("croxydb");

const cooldowns = new Map();

exports.run = async (client, message, args) => {
  const lang = await getLang(message.author.id);
  if (!message.guild) return;

  const sub = (args[0] || "").toLowerCase();

  // Kurulum: r!ticketayarla ile yapilir, burada sadece bilgi ver
  if (sub === "kanal") {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.reply(t(lang, "ticket.sadeceAdmin"));
    const channel = message.mentions.channels.first();
    if (!channel) return message.reply(t(lang, "ticket.kanalYok", { prefix: PREFIX }));
    db.set(`kanal.${message.guild.id}`, channel.id);
    return message.reply(t(lang, "ticket.kanalOk", { kanal: `${channel}` }));
  }

  if (!isPremium(message.author.id)) {
    const e = new EmbedBuilder()
      .setColor("#ee7621")
      .setTitle((lang === "en" ? "Premium Feature" : "Premium Özellik"))
      .setDescription(`${t(lang, "ortak.premiumGerek")}`)
      .setImage("https://media.discordapp.net/attachments/1116091586657407076/1149387613577412608/Picsart_23-09-07_19-50-01-287.jpg")
      .setFooter({ text: (lang === "en" ? "It is a premium feature." : "Premium özelliktir.") });
    return safeSend(message.channel, { embeds: [e] });
  }

  if (sub === "gönder" || sub === "gonder" || sub === "panel") {
    const kanalId = db.fetch(`kanal.${message.guild.id}`);
    const hedef = kanalId ? message.guild.channels.cache.get(kanalId) : message.channel;
    if (!hedef || !hedef.isTextBased()) return message.reply(t(lang, "ticket.kanalYok", { prefix: PREFIX }));

    const panel = new EmbedBuilder()
      .setColor("#ee7621")
      .setTitle(t(lang, "ticketPanel.baslik"))
      .setDescription(t(lang, "ticketPanel.aciklama"))
      .setFooter({ text: "RiseBunny" });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("ticket_ac").setLabel(t(lang, "ticketPanel.buton")).setStyle(ButtonStyle.Primary).setEmoji("🎫")
    );
    await safeSend(hedef, { embeds: [panel], components: [row] });
    await ownerLog(client, new EmbedBuilder().setColor("Green").setDescription((lang === "en" ? `Ticket panel set up: **${message.guild.name}** (${message.guild.id}) - ${message.author.tag}` : `Ticket paneli kuruldu: **${message.guild.name}** (${message.guild.id}) - ${message.author.tag}`)));
    return message.reply("✅").then(m => setTimeout(() => m.delete().catch(() => {}), 3000)).catch(() => {});
  }

  // Hizli bilet: r!ticket <sebep>
  const sebep = args.join(" ").trim();
  if (!sebep) return message.reply(t(lang, "ticket.amacSor"));

  const last = cooldowns.get(message.author.id) || 0;
  if (Date.now() - last < 5000) return message.reply(t(lang, "ticket.cooldown"));

  // Ayni kullanicinin acik bileti var mi?
  const mevcutId = db.fetch(`ass.${message.guild.id}.${message.author.id}`);
  if (mevcutId && message.guild.channels.cache.get(mevcutId))
    return message.reply((lang === "en" ? "You already have an open ticket." : "Zaten açık bir biletin var."));

  cooldowns.set(message.author.id, Date.now());
  await acBilet(client, message.guild, message.author, sebep, lang, message.channel);
};

async function acBilet(client, guild, user, sebep, lang, bilgiKanal) {
  const temiz = sebep.toLowerCase().replace(/[^a-z0-9ğüşöçıİ-]/gi, "-").slice(0, 20) || "destek";
  const no = Math.floor(1000 + Math.random() * 9000);
  const isim = `ticket-${temiz}-${no}`;

  let kanal;
  try {
    kanal = await guild.channels.create({
      name: isim,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
      ]
    });
  } catch {
    if (bilgiKanal) safeSend(bilgiKanal, t(lang, "ortak.hata"));
    return null;
  }

  db.set(`ass.${guild.id}.${user.id}`, kanal.id);
  db.set(`ticket.${guild.id}.${kanal.id}`, { sebep, acan: user.id, tarih: Date.now() });

  const e = new EmbedBuilder()
    .setColor("#ee7621")
    .setTitle(t(lang, "ticket.amacBaslik"))
    .setDescription((lang === "en" ? `**Reason:** ${sebep}\n\n${t(lang, "ticket.hosgeldin")}` : `**Sebep:** ${sebep}\n\n${t(lang, "ticket.hosgeldin")}`))
    .setFooter({ text: (lang === "en" ? "RiseBunny • Use the button to close" : "RiseBunny • Kapatmak için butonu kullan") });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_kapat_${kanal.id}`).setLabel(lang === "en" ? "Close 🔒" : "Kapat 🔒").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ticket_sil_${kanal.id}`).setLabel(lang === "en" ? "Delete ⛔" : "Sil ⛔").setStyle(ButtonStyle.Secondary)
  );
  await safeSend(kanal, { content: `${user}`, embeds: [e], components: [row] });
  if (bilgiKanal) safeSend(bilgiKanal, (lang === "en" ? `Your ticket is open: ${kanal}` : `Biletin açıldı: ${kanal}`));
  await ownerLog(client, new EmbedBuilder().setColor("Orange").setDescription((lang === "en" ? `🎫 Ticket opened: **${guild.name}** | ${user.tag} | Reason: ${sebep}` : `🎫 Bilet açıldı: **${guild.name}** | ${user.tag} | Sebep: ${sebep}`)));
  return kanal;
}

exports.acBilet = acBilet;

exports.conf = { enabled: true, guildOnly: true, aliases: ["bilet", "destek"], permLevel: 0, kategori: "ticket" };
exports.help = { name: "ticket", description: "Ticket / destek bileti açar.", usage: "ticket <sebep> | ticket panel | ticket kanal #kanal" };
