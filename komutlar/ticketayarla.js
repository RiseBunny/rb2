const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require("discord.js");
const { t, getLang } = require("../dil");
const { ownerLog } = require("../utils");
const db = require("croxydb");

exports.run = async (client, message, args) => {
  const lang = await getLang(message.author.id);
  if (!message.guild) return;
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply(t(lang, "ortak.yoneticiGerek"));

  const sub = (args[0] || "").toLowerCase();

  if (sub === "kanal" || sub === "channel") {
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
    return;
  }

  if (sub === "kategori" || sub === "category") {
    const category = message.mentions.channels.first();
    if (!category || category.type !== ChannelType.GuildCategory) {
      return message.reply(t(lang, "ticket.kategoriYok", { prefix: "r!" }));
    }
    db.set(`ticket_kategori.${message.guild.id}`, category.id);
    await message.channel.send(t(lang, "ticket.kategoriOk", { kategori: `${category}` }));
    await ownerLog(client, new EmbedBuilder().setColor("Blue").setDescription((lang === "en" ? `🎫 Ticket category set: **${message.guild.name}** → ${category}` : `🎫 Ticket kategorisi ayarlandı: **${message.guild.name}** → ${category}`)));
    return;
  }

  if (sub === "örnek" || sub === "ornek" || sub === "example" || sub === "test") {
    const { acBilet, ticketKategorisiniGarantiEt } = require("./ticket");
    const mevcutId = db.fetch(`ass.${message.guild.id}.${message.author.id}`);
    if (mevcutId && message.guild.channels.cache.get(mevcutId))
      return message.reply((lang === "en" ? "You already have an open ticket." : "Zaten açık bir biletin var."));
    // Önce ticketayarla ile kurulmuş kategori varsa onu kullan, yoksa otomatik kur
    const oncekiId = db.fetch(`ticket_kategori.${message.guild.id}`);
    const kategori = await ticketKategorisiniGarantiEt(message.guild);
    if (!kategori) return message.reply(t(lang, "ortak.hata"));
    const otomatikKuruldu = oncekiId !== kategori.id;
    if (otomatikKuruldu) {
      await message.channel.send(t(lang, "ticket.kategoriOtomatik", { kategori: `${kategori}` })).catch(() => {});
    }
    const sebep = t(lang, "ticket.ornekSebep");
    const kanal = await acBilet(client, message.guild, message.author, sebep, lang, message.channel, kategori.id);
    if (!kanal) return message.reply(t(lang, "ortak.hata")).catch(() => {});
    await ownerLog(client, new EmbedBuilder().setColor("Blue").setDescription((lang === "en" ? `🎫 Example ticket opened: **${message.guild.name}** → ${kategori} (${message.author.tag})` : `🎫 Örnek bilet açıldı: **${message.guild.name}** → ${kategori} (${message.author.tag})`)));
    return message.reply(t(lang, "ticket.ornekAcildi", { kanal: `${kanal}`, kategori: `${kategori}` })).catch(() => {});
  }

  // Varsayılan: kanal ayarla (eski davranış)
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
