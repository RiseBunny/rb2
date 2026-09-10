const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { t, getLang, hasLang, hasGuildLang, komutCoz } = require("../dil");
const { PREFIX, SAHIP_ID, bakimSebebi, ownerLog } = require("../utils");
const db = require("croxydb");

// NOT: Komut kullanımları otomatik olarak sahip loguna DÜŞMEZ.
// Yanlış/eksik kullanımlar logu kirletmesin diye her komut SADECE
// işlemi gerçekten tamamlayınca kendi ownerLog/komutLog çağrısını yapar.

module.exports = async message => {
  const client = message.client;
  if (!client || message.author?.bot) return;
  if (!message.guild || !message.member) return;

  const prefix = process.env.PREFIX || PREFIX;
  if (!message.content.startsWith(prefix)) return;

  const parts = message.content.trim().split(/\s+/);
  const command = parts[0].slice(prefix.length).toLowerCase();
  const params = parts.slice(1);
  const perms = typeof client.elevation === "function" ? client.elevation(message) : 0;

  // Iki dilli komut cozumleme (TR ad/alias + EN ad/alias)
  const canonical = komutCoz(client, command);
  if (!canonical) return;
  const cmd = client.commands.get(canonical);
  if (!cmd) return;

  // Dil secmemis kullanici veya sunucu dili secmemis sunucu sahibi (dil komutu haric)
  // SAHİP BYPASS: bot sahibi bakım/mağaza gibi acil komutları dil seçmeden çalıştırır
  const sahipBypass = message.author.id === SAHIP_ID;
  const isOwner = Boolean(message.guild && message.guild.ownerId === message.author.id);
  const userNeedsLang = !hasLang(message.author.id);
  const guildNeedsLang = isOwner && !hasGuildLang(message.guild.id);

  if (canonical !== "dil" && !sahipBypass && (userNeedsLang || guildNeedsLang)) {
    try {
      const { dilPaneli } = require("../komutlar/dil");
      return await message.reply(dilPaneli(prefix, { isOwner, userNeedsLang, guildNeedsLang })).catch(() => {});
    } catch {
      return message.reply(`🌍 Önce dilini seç / Select your language: \`${prefix}dil tr\` / \`${prefix}dil en\``).catch(() => {});
    }
  }

  // Veri işleme onayı (dil + yardım serbest, gerisi onay ister)
  if (canonical !== "dil" && canonical !== "yardım" && !sahipBypass) {
    let onayli = false;
    try { onayli = !!db.fetch(`onay_${message.author.id}`); } catch { onayli = false; }
    if (!onayli) {
      const ulang = await getLang(message.author.id);
      try {
        const { dilPaneli } = require("../komutlar/dil");
        await message.reply(dilPaneli(prefix, { isOwner, userNeedsLang: userNeedsLang || true, guildNeedsLang })).catch(() => {});
      } catch {}
      return message.reply(t(ulang, "onay.gerekli")).catch(() => {});
    }
  }

  const lang = await getLang(message.author.id);

  // Bakım modu (sahip hariç)
  if (message.author.id !== SAHIP_ID) {
    const bakim = bakimSebebi();
    if (bakim && cmd.help.name !== "bakım") {
      return message.reply(t(lang, "ortak.bakimda", { sebep: bakim })).catch(() => {});
    }
  }

  // Karaliste (dil dosyasından, inline EN yok)
  const karaliste = db.fetch(`karalist_${message.author.id}`);
  if (karaliste === "aktif" || karaliste === true) {
    const sebep = db.fetch(`sebep_${message.author.id}`) || "-";
    const e = new EmbedBuilder()
      .setColor("#36393F")
      .setTitle("⛔")
      .setDescription(t(lang, "karaliste.engellisin", { sebep }))
      .setImage("https://img.artigercek.com/uploads/1/0/7pOJ1lYcS2P0bKjoHMFpFC4xAT7bD3JnNSmjY4wJ.jpeg")
      .setThumbnail(client.user.displayAvatarURL());
    await ownerLog(client, new EmbedBuilder().setColor("Blue").setTimestamp().setFooter({ text: "RiseBunny" })
      .setDescription(`**${message.author.tag}** karalistede olup **${command}** komutunu **${message.guild.name}** sunucusunda denedi.`));
    return message.channel.send({ embeds: [e] }).catch(() => {});
  }

  if (cmd.conf.enabled === false && message.author.id !== SAHIP_ID) {
    return message.channel.send({ embeds: [new EmbedBuilder().setDescription(`**${cmd.help.name}** şu anda kapalı!`).setColor("Red")] }).catch(() => {});
  }

  const yetkiHata = (metin) => message.channel.send({ embeds: [new EmbedBuilder().setDescription(metin).setColor("Red")] }).catch(() => {});
  if (cmd.conf.permLevel === 1 && !message.member.permissions.has(PermissionFlagsBits.ManageMessages))
    return yetkiHata(t(lang, "ortak.yetki", { yetki: "Mesajları Yönet" }));
  if (cmd.conf.permLevel === 2 && !message.member.permissions.has(PermissionFlagsBits.KickMembers))
    return yetkiHata(t(lang, "ortak.yetki", { yetki: "Üyeleri At" }));
  if (cmd.conf.permLevel === 3 && !message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return yetkiHata(t(lang, "ortak.yetki", { yetki: "Üyeleri Yasakla" }));
  if (cmd.conf.permLevel === 4 && !message.member.permissions.has(PermissionFlagsBits.Administrator))
    return yetkiHata(t(lang, "ortak.yetki", { yetki: "Yönetici" }));
  if (cmd.conf.permLevel === 5 && message.author.id !== SAHIP_ID)
    return yetkiHata(t(lang, "ortak.sahipSadece"));

  if (perms < cmd.conf.permLevel) return;

  try {
    await cmd.run(client, message, params, perms);
  } catch (error) {
    console.error(`Komut ${cmd.help.name} hatası:`, error.message);
    try { await message.channel.send(t(lang, "ortak.hata")); } catch {}
    try {
      await ownerLog(client, new EmbedBuilder().setColor("Red").setTitle("Komut Hatası").setDescription(`\`${cmd.help.name}\` @ ${message.guild?.name}\n\`\`\`${String(error.message).slice(0, 900)}\`\`\``));
    } catch {}
  }
};
