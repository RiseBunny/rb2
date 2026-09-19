const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { t, getLang, hasLang, hasGuildLang, hasConsent, komutCoz } = require("../dil");
const { PREFIX, SAHIP_ID, bakimSebebi, ownerLog, giveCommandXp } = require("../utils");
const db = require("croxydb");
const { findClosestCommand } = require("../util/fuzzyMatch");
const { aiIsle } = require("../ai/handler");

// NOT: Komut kullanımları otomatik olarak sahip loguna DÜŞMEZ.
// Yanlış/eksik kullanımlar logu kirletmesin diye her komut SADECE
// işlemi gerçekten tamamlayınca kendi ownerLog/komutLog çağrısını yapar.

// Admin etiket karşılama spam koruması (sunucu+kullanıcı başına 60 sn)
const etiketCooldown = new Map();

module.exports = async message => {
  const client = message.client;
  if (!client || message.author?.bot) return;

  // 🤖 AI SOHBET SİSTEMİ (prefix gerektirmez, DM'de de çalışır)
  // "rise <soru>" formatında tetiklenir
  const aiCevapVerdi = await aiIsle(message, client);
  if (aiCevapVerdi) return;

  // Normal komutlar için sunucu ve üye kontrolü
  if (!message.guild || !message.member) return;

  const prefix = process.env.PREFIX || PREFIX;

  // 👑 Admin etiketleme karşılama (otomasyon kurulu sunucuda)
  // Komut ve rise mesajlarında tetiklenmez (onları kendi akışları karşılar)
  if (!message.content.startsWith(prefix) && !message.content.toLowerCase().startsWith("rise")) {
    try {
      const { otomasyonDurum } = require("../komutlar/otomasyon");
      const oto = otomasyonDurum(message.guild.id);
      if (oto && !oto.bitmis) {
        const etiketlenenler = [...(message.mentions.users?.values() || [])]
          .filter(u => !u.bot && u.id !== message.author.id && u.id !== client.user?.id)
          .slice(0, 5); // Max 5 admin
        for (const u of etiketlenenler) {
          const uye = await message.guild.members.fetch(u.id).catch(() => null);
          if (uye) {
            // Admin kontrolü: Administrator permission VEYA "Admin/Moderator" rolü
            const adminRolleri = uye.roles.cache.filter(r => 
              r.permissions.has(PermissionFlagsBits.Administrator) || 
              /admin|moderator|yönetici|mod/i.test(r.name)
            );
            if (adminRolleri.size > 0) {
              const key = `etiket_${message.guild.id}_${message.author.id}`;
              const son = etiketCooldown.get(key) || 0;
              if (Date.now() - son < 60000) break; // 60 sn spam koruması
              etiketCooldown.set(key, Date.now());
              
              const lang = await getLang(message.author.id);
              const { t } = require("../dil");
              const metin = t(lang, "otomasyon.etiketKarsilama", { kullanici: `${message.author}` });
              await message.reply({ content: metin, allowedMentions: { repliedUser: false } }).catch(() => {});
              break;
            }
          }
        }
      }
    } catch {}
  }

  if (!message.content.startsWith(prefix)) return;

  const parts = message.content.trim().split(/\s+/);
  const command = parts[0].slice(prefix.length).toLowerCase();
  const params = parts.slice(1);
  const perms = typeof client.elevation === "function" ? client.elevation(message) : 0;

  // 🚫 Komut engeli kontrolü (çevirili, 20sn sonra silinir)
  const engel = db.fetch(`engel_${message.guild.id}`);
  const isEngelleCmd = ["engelle", "block", "komutengelle", "komut-engelle"].includes(command);
  const isAdminUser = message.member.permissions.has(PermissionFlagsBits.Administrator);
  if (engel && !(isEngelleCmd && isAdminUser)) {
    const aktif = engel.kapsam === "sunucu" || (engel.kapsam === "kanal" && engel.kanalId === message.channel.id);
    if (aktif) {
      const ulang = await getLang(message.author.id);
      const kapsam = engel.kapsam === "sunucu" ? t(ulang, "engelle.engelliKapsamSunucu") : t(ulang, "engelle.engelliKapsamKanal");
      const e = new EmbedBuilder().setColor("Red")
        .setTitle(t(ulang, "engelle.engelliBaslik"))
        .setDescription(t(ulang, "engelle.engelliAciklama", { kullanici: `${message.author}`, kapsam, engelleyen: `<@${engel.engelleyen}>` }));
      const m = await message.reply({ embeds: [e], allowedMentions: { repliedUser: false } }).catch(() => null);
      setTimeout(() => { try { m?.delete().catch(() => {}); } catch {} }, 20000);
      return;
    }
  }

  // Iki dilli komut cozumleme (TR ad/alias + EN ad/alias)
  let canonical = komutCoz(client, command);

  // Fuzzy matching: yanlis yazilmis komut icin onerme
  if (!canonical) {
    const suggestion = findClosestCommand(command, client, 55);
    if (suggestion) {
      const lang = await getLang(message.author.id);
      const cmd = client.commands.get(suggestion.canonical);
      // Kullanıcının dili İngilizse komutun İngilizce adını (KOMUTLAR[canonical].en) göster
      const { KOMUTLAR } = require("../dil/komutlar");
      const displayName = lang === "en"
        ? (KOMUTLAR[suggestion.canonical]?.en || suggestion.canonical)
        : (cmd?.help?.name || suggestion.canonical);
      const suggestionMsg = lang === "en"
        ? `Command not found. Did you mean \`${displayName}\`?`
        : `Böyle bir komut yok. \`${displayName}\` mu demek istediniz?`;
      return message.reply({ content: suggestionMsg, allowedMentions: { repliedUser: false } }).catch(() => {});
    }
    return;
  }
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
    if (!hasConsent(message.author.id)) {
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

  /* Buraya takılan komut eskiden hiçbir cevap vermeden susuyordu
     (sahip bile r!presil çalıştıramıyordu). Artık sebep bildirilir. */
  if (perms < cmd.conf.permLevel) return yetkiHata(t(lang, "ortak.yetki", { yetki: "Daha yüksek yetki" }));

  try {
    await cmd.run(client, message, params, perms);
    // Komut başarıyla çalıştıysa XP ver
    if (cmd.conf.enabled !== false) {
      try { await giveCommandXp(client, message.author.id, message.guild.id); } catch {}
    }
  } catch (error) {
    console.error(`Komut ${cmd.help.name} hatası:`, error.message);
    try { await message.channel.send(t(lang, "ortak.hata")); } catch {}
    try {
      await ownerLog(client, new EmbedBuilder().setColor("Red").setTitle("Komut Hatası").setDescription(`\`${cmd.help.name}\` @ ${message.guild?.name}\n\`\`\`${String(error.message).slice(0, 900)}\`\`\``));
    } catch {}
  }
};
