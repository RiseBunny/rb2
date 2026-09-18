const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const { t, getLang } = require("../dil");
const { isPremium, DESTEK, PREFIX, safeSend, ownerLog, SAHIP_ID } = require("../utils");
const db = require("croxydb");

const cooldowns = new Map();

/* Ticket kategori seçenekleri. */
const TICKET_KATEGORILER = [
  { id: "destek", label: "Destek", emoji: "🛠️", description: "Genel destek ve sorular" },
  { id: "sikayet", label: "Şikayet", emoji: "⚠️", description: "Kullanıcı/yetkili şikayeti" },
  { id: "oneri", label: "Öneri", emoji: "💡", description: "Sunucu önerileri" },
  { id: "diger", label: "Diğer", emoji: "📝", description: "Diğer konular" }
];

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

  /* Sahip premium kontrolünden muaftır (test/kurulum takılmasın). */
  if (message.author.id !== SAHIP_ID && !isPremium(message.author.id)) {
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

/**
 * Ticket kategorisi seçimi için select menü oluşturur.
 */
function kategoriMenuOlustur(lang) {
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_kategori_sec")
      .setPlaceholder(t(lang, "ticket.kategoriSec"))
      .addOptions(TICKET_KATEGORILER.map(k => ({
        label: t(lang, `ticket.kategori${k.id.charAt(0).toUpperCase() + k.id.slice(1)}`),
        value: k.id,
        description: k.description,
        emoji: k.emoji
      })))
  );
  return row;
}

/* Sunucuda "🎫 Tickets" kategorisini bulur, yoksa oluşturur ve DB'ye kaydeder. */
async function ticketKategorisiniGarantiEt(guild) {
  const kayitliId = db.fetch(`ticket_kategori.${guild.id}`);
  if (kayitliId) {
    const mevcut = guild.channels.cache.get(kayitliId);
    if (mevcut && mevcut.type === ChannelType.GuildCategory) return mevcut;
  }
  const isimleBul = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && ["🎫-tickets", "🎫 tickets", "tickets", "ticketler", "biletler"].includes(c.name.toLowerCase())
  );
  if (isimleBul) {
    db.set(`ticket_kategori.${guild.id}`, isimleBul.id);
    return isimleBul;
  }
  try {
    const yeni = await guild.channels.create({ name: "🎫 Tickets", type: ChannelType.GuildCategory });
    db.set(`ticket_kategori.${guild.id}`, yeni.id);
    return yeni;
  } catch {
    return null;
  }
}

/* Administratör yetkili rol ve üyeleri toplar (etiket için). */
async function adminEtiketleriniTopla(guild) {
  const rolEtiketleri = [];
  const uyeEtiketleri = [];
  try {
    const adminRoller = guild.roles.cache.filter(r => r.id !== guild.roles.everyone.id && r.permissions.has(PermissionFlagsBits.Administrator));
    for (const rol of adminRoller.values()) rolEtiketleri.push(`<@&${rol.id}>`);
    const uyeler = await guild.members.fetch().catch(() => null);
    if (uyeler) {
      for (const u of uyeler.values()) {
        if (u.user.bot) continue;
        if (u.permissions.has(PermissionFlagsBits.Administrator)) {
          if (!uyeEtiketleri.includes(`<@${u.id}>`)) uyeEtiketleri.push(`<@${u.id}>`);
          if (uyeEtiketleri.length >= 10) break;
        }
      }
    } else {
      const sahip = await guild.fetchOwner().catch(() => null);
      if (sahip && !sahip.user.bot) uyeEtiketleri.push(`<@${sahip.id}>`);
    }
  } catch {}
  return { rolEtiketleri, uyeEtiketleri };
}

async function acBilet(client, guild, user, sebep, lang, bilgiKanal, kategoriId = null) {
  const temiz = sebep.toLowerCase().replace(/[^a-z0-9ğüşöçıİ-]/gi, "-").slice(0, 20) || "destek";
  const no = Math.floor(1000 + Math.random() * 9000);
  const isim = `ticket-${temiz}-${no}`;

  // Kategori: verilen ID -> kayitli ID -> otomatik "🎫 Tickets" oluştur
  let parent = null;
  if (kategoriId) {
    const aday = guild.channels.cache.get(kategoriId);
    if (aday && aday.type === ChannelType.GuildCategory) parent = aday;
  }
  if (!parent) parent = await ticketKategorisiniGarantiEt(guild);

  // Kanal izinleri: everyone kapali, açan + admin roller + bot açık
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
  ];
  try {
    for (const rol of guild.roles.cache.values()) {
      if (rol.id !== guild.roles.everyone.id && rol.permissions.has(PermissionFlagsBits.Administrator)) {
        overwrites.push({ id: rol.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      }
    }
    if (guild.members.me) overwrites.push({ id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  } catch {}

  let kanal;
  try {
    kanal = await guild.channels.create({
      name: isim,
      type: ChannelType.GuildText,
      parent: parent || undefined,
      permissionOverwrites: overwrites
    });
  } catch {
    if (bilgiKanal) safeSend(bilgiKanal, t(lang, "ortak.hata"));
    return null;
  }

  db.set(`ass.${guild.id}.${user.id}`, kanal.id);
  db.set(`ticket.${guild.id}.${kanal.id}`, { sebep, acan: user.id, tarih: Date.now(), kategori: kategoriId || (parent?.id || null) });

  const kategoriAdi = parent ? parent.name : (lang === "en" ? "No Category" : "Kategorisiz");
  const e = new EmbedBuilder()
    .setColor("#ee7621")
    .setTitle(t(lang, "ticket.amacBaslik"))
    .setDescription((lang === "en" ? `**Reason:** ${sebep}\n**Category:** ${kategoriAdi}\n\n${t(lang, "ticket.hosgeldin")}` : `**Sebep:** ${sebep}\n**Kategori:** ${kategoriAdi}\n\n${t(lang, "ticket.hosgeldin")}`))
    .setFooter({ text: (lang === "en" ? "RiseBunny • Use the button to close" : "RiseBunny • Kapatmak için butonu kullan") });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_kapat_${kanal.id}`).setLabel(lang === "en" ? "Close 🔒" : "Kapat 🔒").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ticket_sil_${kanal.id}`).setLabel(lang === "en" ? "Delete ⛔" : "Sil ⛔").setStyle(ButtonStyle.Secondary)
  );
  const { rolEtiketleri, uyeEtiketleri } = await adminEtiketleriniTopla(guild);
  const etiketSatiri = [`${user}`, ...rolEtiketleri, ...uyeEtiketleri].join(" ").slice(0, 1900);
  await safeSend(kanal, { content: etiketSatiri, embeds: [e], components: [row] });
  if (bilgiKanal) safeSend(bilgiKanal, (lang === "en" ? `Your ticket is open: ${kanal}` : `Biletin açıldı: ${kanal}`));
  await ownerLog(client, new EmbedBuilder().setColor("Orange").setDescription((lang === "en" ? `🎫 Ticket opened: **${guild.name}** | ${user.tag} | Reason: ${sebep} | Category: ${kategoriAdi}` : `🎫 Bilet açıldı: **${guild.name}** | ${user.tag} | Sebep: ${sebep} | Kategori: ${kategoriAdi}`)));
  return kanal;
}

exports.acBilet = acBilet;
exports.TICKET_KATEGORILER = TICKET_KATEGORILER;

exports.conf = { enabled: true, guildOnly: true, aliases: ["bilet", "destek"], permLevel: 0, kategori: "ticket" };
exports.help = { name: "ticket", description: "Ticket / destek bileti açar.", usage: "ticket <sebep> | ticket panel | ticket kanal #kanal" };
