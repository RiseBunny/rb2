const { EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { t, getLang } = require("../dil");
const { ownerLog } = require("../utils");
const db = require("croxydb");
if (!db.fetch) db.fetch = db.get;

/* ── Dil bazlı şablonlar ──────────────────────────────────────────
   lang = komutu yazan KULLANICININ dili (r!dil).
   en ise her şey İngilizce kurulur, tr ise Türkçe. */

const SABLON = {
  tr: {
    roller: [
      { key: "kurucu",    ad: "👑 Kurucu",         renk: "#FF0000", neden: "Sunucu kurulumu", yetkiler: [PermissionFlagsBits.Administrator] },
      { key: "yonetici",  ad: "⚡ Yönetici",       renk: "#FF7B00", neden: "Sunucu kurulumu", yetkiler: [PermissionFlagsBits.Administrator] },
      { key: "mod",       ad: "🛡️ Moderatör",      renk: "#0099FF", neden: "Sunucu kurulumu", yetkiler: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ManageNicknames] },
      { key: "denememod", ad: "🔰 Deneme Mod",     renk: "#00CC99", neden: "Sunucu kurulumu", yetkiler: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers] },
      { key: "kayityetki",ad: "🎫 Kayıt Yetkili",  renk: "#9B59B6", neden: "Sunucu kurulumu", yetkiler: [PermissionFlagsBits.ManageNicknames] },
      { key: "ticketyt",  ad: "🎟️ Ticket Yetkili", renk: "#E67E22", neden: "Sunucu kurulumu", yetkiler: [PermissionFlagsBits.ManageChannels] },
      { key: "premium",   ad: "💎 Premium",        renk: "#00E5FF", neden: "Sunucu kurulumu", yetkiler: [] },
      { key: "vip",       ad: "⭐ VIP",            renk: "#FFD700", neden: "Sunucu kurulumu", yetkiler: [] },
      { key: "booster",   ad: "🚀 Booster",        renk: "#FF73FA", neden: "Sunucu kurulumu", yetkiler: [] },
      { key: "bot",       ad: "🤖 Bot",            renk: "#5865F2", neden: "Sunucu kurulumu", yetkiler: [] },
      { key: "uye",       ad: "👤 Üye",            renk: "#95A5A6", neden: "Sunucu kurulumu", yetkiler: [] },
      { key: "kayitsiz",  ad: "❓ Kayıtsız",       renk: "#7F8C8D", neden: "Sunucu kurulumu", yetkiler: [] },
      { key: "susturulmus",ad: "🔇 Susturulmuş",   renk: "#2C2F33", neden: "Sunucu kurulumu", yetkiler: [] },
    ],
    kategoriler: ["📌・ÖNEMLİ", "💬・SOHBET", "📝・KAYIT", "🎫・TICKET", "📋・LOGLAR", "🔊・SES"],
    kanallar: [
      { key: "kurallar",  ad: "📜・kurallar",    tip: "yazi", kat: "📌・ÖNEMLİ", sadeceOkunur: true },
      { key: "duyuru",    ad: "📣・duyuru",      tip: "yazi", kat: "📌・ÖNEMLİ", sadeceOkunur: true },
      { key: "guncelleme",ad: "🔄・güncelleme",  tip: "yazi", kat: "📌・ÖNEMLİ", sadeceOkunur: true },
      { key: "hosgeldin", ad: "👋・hoşgeldin",   tip: "yazi", kat: "📌・ÖNEMLİ", sadeceOkunur: true },
      { key: "giriscikis",ad: "🚪・giriş-çıkış", tip: "yazi", kat: "📌・ÖNEMLİ", sadeceOkunur: true },
      { key: "sohbet",    ad: "💬・sohbet",      tip: "yazi", kat: "💬・SOHBET" },
      { key: "botkomut",  ad: "🤖・bot-komut",   tip: "yazi", kat: "💬・SOHBET" },
      { key: "medya",     ad: "📸・medya",       tip: "yazi", kat: "💬・SOHBET" },
      { key: "kayit",     ad: "📝・kayıt",       tip: "yazi", kat: "📝・KAYIT" },
      { key: "ticket",    ad: "🎫・ticket",      tip: "yazi", kat: "🎫・TICKET", sadeceOkunur: true },
      { key: "ticketlog", ad: "📋・ticket-log",  tip: "yazi", kat: "📋・LOGLAR", sadeceYetkili: true },
      { key: "modlog",    ad: "📝・mod-log",     tip: "yazi", kat: "📋・LOGLAR", sadeceYetkili: true },
      { key: "isimlog",   ad: "✏️・isim-log",    tip: "yazi", kat: "📋・LOGLAR", sadeceYetkili: true },
      { key: "cezalog",   ad: "🔨・ceza-log",    tip: "yazi", kat: "📋・LOGLAR", sadeceYetkili: true },
      { key: "genel",     ad: "🔊・Genel",       tip: "ses",  kat: "🔊・SES" },
      { key: "muzik",     ad: "🎵・Müzik",       tip: "ses",  kat: "🔊・SES" },
      { key: "afk",       ad: "💤・AFK",         tip: "ses",  kat: "🔊・SES", afk: true },
    ],
  },
  en: {
    roller: [
      { key: "kurucu",    ad: "👑 Founder",       renk: "#FF0000", neden: "Server setup", yetkiler: [PermissionFlagsBits.Administrator] },
      { key: "yonetici",  ad: "⚡ Admin",         renk: "#FF7B00", neden: "Server setup", yetkiler: [PermissionFlagsBits.Administrator] },
      { key: "mod",       ad: "🛡️ Moderator",    renk: "#0099FF", neden: "Server setup", yetkiler: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ManageNicknames] },
      { key: "denememod", ad: "🔰 Trial Mod",    renk: "#00CC99", neden: "Server setup", yetkiler: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers] },
      { key: "kayityetki",ad: "🎫 Registrar",    renk: "#9B59B6", neden: "Server setup", yetkiler: [PermissionFlagsBits.ManageNicknames] },
      { key: "ticketyt",  ad: "🎟️ Ticket Staff", renk: "#E67E22", neden: "Server setup", yetkiler: [PermissionFlagsBits.ManageChannels] },
      { key: "premium",   ad: "💎 Premium",      renk: "#00E5FF", neden: "Server setup", yetkiler: [] },
      { key: "vip",       ad: "⭐ VIP",          renk: "#FFD700", neden: "Server setup", yetkiler: [] },
      { key: "booster",   ad: "🚀 Booster",      renk: "#FF73FA", neden: "Server setup", yetkiler: [] },
      { key: "bot",       ad: "🤖 Bot",          renk: "#5865F2", neden: "Server setup", yetkiler: [] },
      { key: "uye",       ad: "👤 Member",       renk: "#95A5A6", neden: "Server setup", yetkiler: [] },
      { key: "kayitsiz",  ad: "❓ Unregistered", renk: "#7F8C8D", neden: "Server setup", yetkiler: [] },
      { key: "susturulmus",ad: "🔇 Muted",       renk: "#2C2F33", neden: "Server setup", yetkiler: [] },
    ],
    kategoriler: ["📌・IMPORTANT", "💬・CHAT", "📝・REGISTRATION", "🎫・TICKET", "📋・LOGS", "🔊・VOICE"],
    kanallar: [
      { key: "kurallar",  ad: "📜・rules",       tip: "yazi", kat: "📌・IMPORTANT", sadeceOkunur: true },
      { key: "duyuru",    ad: "📣・announcements",tip: "yazi", kat: "📌・IMPORTANT", sadeceOkunur: true },
      { key: "guncelleme",ad: "🔄・updates",     tip: "yazi", kat: "📌・IMPORTANT", sadeceOkunur: true },
      { key: "hosgeldin", ad: "👋・welcome",     tip: "yazi", kat: "📌・IMPORTANT", sadeceOkunur: true },
      { key: "giriscikis",ad: "🚪・join-leave",  tip: "yazi", kat: "📌・IMPORTANT", sadeceOkunur: true },
      { key: "sohbet",    ad: "💬・chat",        tip: "yazi", kat: "💬・CHAT" },
      { key: "botkomut",  ad: "🤖・bot-commands",tip: "yazi", kat: "💬・CHAT" },
      { key: "medya",     ad: "📸・media",       tip: "yazi", kat: "💬・CHAT" },
      { key: "kayit",     ad: "📝・register",    tip: "yazi", kat: "📝・REGISTRATION" },
      { key: "ticket",    ad: "🎫・ticket",      tip: "yazi", kat: "🎫・TICKET", sadeceOkunur: true },
      { key: "ticketlog", ad: "📋・ticket-log",  tip: "yazi", kat: "📋・LOGS", sadeceYetkili: true },
      { key: "modlog",    ad: "📝・mod-log",     tip: "yazi", kat: "📋・LOGS", sadeceYetkili: true },
      { key: "isimlog",   ad: "✏️・name-log",    tip: "yazi", kat: "📋・LOGS", sadeceYetkili: true },
      { key: "cezalog",   ad: "🔨・punishment-log", tip: "yazi", kat: "📋・LOGS", sadeceYetkili: true },
      { key: "genel",     ad: "🔊・General",     tip: "ses",  kat: "🔊・VOICE" },
      { key: "muzik",     ad: "🎵・Music",       tip: "ses",  kat: "🔊・VOICE" },
      { key: "afk",       ad: "💤・AFK",         tip: "ses",  kat: "🔊・VOICE", afk: true },
    ],
  },
};

function metin(lang, tr, en) {
  return lang === "en" ? en : tr;
}

exports.run = async (client, message) => {
  // Kullanıcının dili her şeyi belirler (roller + kanallar + mesajlar)
  const lang = await getLang(message.author.id);
  const S = SABLON[lang === "en" ? "en" : "tr"];
  if (!message.guild) return;

  if (message.author.id !== message.guild.ownerId && !message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply(metin(lang, "Üzgünüm ama bu komutu sadece sunucu sahibi kullanabilir!", "Sorry, only the server owner can use this command!"));

  const me = message.guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles) || !me.permissions.has(PermissionFlagsBits.ManageChannels))
    return message.reply(metin(lang,
      "❌ Kurulum için bota **Rolleri Yönet** ve **Kanalları Yönet** yetkisi vermelisin! (Rolümü en üste al)",
      "❌ I need **Manage Roles** and **Manage Channels** permissions to set up! (Move my role to the top)"));

  const sor = new EmbedBuilder()
    .setColor("#3f007f")
    .setTitle(metin(lang, "🏗️ Sunucu Kurulsun mu?", "🏗️ Set Up The Server?"))
    .setDescription(metin(lang,
      `⚠️ **DİKKAT: Mevcut TÜM roller ve kanallar SİLİNİP sıfırdan kurulacak!** (komutun yazıldığı kanal + botun kendi rolleri hariç)\n\n**${S.roller.length} rol** + **${S.kategoriler.length} kategori** + **${S.kanallar.length} kanal** kurulacak.\nYetkiler ve kanal izinleri otomatik ayarlanacak, bot sistemleri (kayıt/ticket/log) DB'ye bağlanacak.\n\nDevam edilsin mi?`,
      `⚠️ **WARNING: ALL existing roles and channels will be DELETED and rebuilt!** (except this channel + the bot's own roles)\n\n**${S.roller.length} roles** + **${S.kategoriler.length} categories** + **${S.kanallar.length} channels** will be created.\nRole permissions and channel overwrites will be set automatically, bot systems (register/ticket/log) will be linked to the DB.\n\nContinue?`))
    .setFooter({ text: metin(lang, 'Onaylıyorsan "evet" yaz (30 sn)', 'Type "yes" to confirm (30 sec)') });
  await message.channel.send({ embeds: [sor] });

  let collected;
  try {
    collected = await message.channel.awaitMessages({
      filter: (r) => r.author.id === message.author.id && ["evet", "yes"].includes(r.content.toLowerCase()),
      max: 1, time: 30000, errors: ["time"],
    });
  } catch {
    return message.reply(metin(lang, "Süre doldu, işlem iptal.", "Time is up, operation cancelled."));
  }
  if (!collected || collected.size === 0) return;

  const sebep = lang === "en" ? "Server setup (rebuild)" : "Sunucu kurulumu (sıfırdan)";
  const durumMsg = await message.channel.send(metin(lang, "🧹 Eski roller ve kanallar siliniyor...", "🧹 Deleting old roles and channels..."));

  /* ── 0. TEMİZLİK: eski her şeyi sil, yenisi kurulsun ── */
  const silinen = { rol: 0, kanal: 0 };
  const komutKanalId = message.channel.id;
  // Kanallar (komutun yazıldığı kanal hariç — durum güncellemesi için gerekli)
  for (const ch of [...message.guild.channels.cache.values()]) {
    if (ch.id === komutKanalId) continue;
    try { await ch.delete(sebep); silinen.kanal++; } catch {}
  }
  // Roller (everyone + yönetilen + bottan yüksek + botun kendi rolleri hariç)
  const botEnYuksek = me.roles.highest;
  for (const rol of [...message.guild.roles.cache.values()]) {
    if (rol.id === message.guild.id) continue; // @everyone
    if (rol.managed) continue;                 // bot/entegrasyon rolleri
    if (rol.position >= botEnYuksek.position) continue; // erişilemez
    if (me.roles.cache.has(rol.id)) continue;  // botun kendi rolleri
    try { await rol.delete(sebep); silinen.rol++; } catch {}
  }

  await durumMsg.edit(metin(lang, "⏳ Roller oluşturuluyor...", "⏳ Creating roles...")).catch(() => {});

  /* ── 1. ROLLER (sıfırdan — isim çakışması olamaz) ── */
  const rolMap = new Map(); // key -> Role (ID hatasını önler: isimle arama YOK)
  const rolSonuc = { basarili: [], basarisiz: [] };
  for (const r of S.roller) {
    try {
      const rol = await message.guild.roles.create({
        name: r.ad, color: r.renk, permissions: r.yetkiler, reason: r.neden, mentionable: false,
      });
      rolMap.set(r.key, rol);
      rolSonuc.basarili.push({ key: r.key, ad: rol.name, id: rol.id });
    } catch {
      rolSonuc.basarisiz.push(r.ad);
    }
  }

  await durumMsg.edit(metin(lang, "⏳ Kanallar oluşturuluyor...", "⏳ Creating channels...")).catch(() => {});

  /* ── 2. KANAL İZİNLERİ (ID üzerinden — isimle arama yok) ── */
  const herkes = message.guild.roles.everyone;
  const yoneticiRol = rolMap.get("yonetici") || null;
  const modRol = rolMap.get("mod") || null;
  const susturulmus = rolMap.get("susturulmus") || null;

  const kanalMap = new Map(); // key -> Channel
  const katMap = new Map();   // kategori adı -> id
  const kanalSonuc = { basarili: [], basarisiz: [] };

  function overwrites(k, tip) {
    const yetki = [];
    if (tip === "yazi") {
      if (k.sadeceYetkili) {
        // Sadece Yönetici + Moderatör görür/yazar
        yetki.push({ id: herkes.id, deny: [PermissionFlagsBits.ViewChannel] });
        if (yoneticiRol) yetki.push({ id: yoneticiRol.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
        if (modRol) yetki.push({ id: modRol.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
      } else if (k.sadeceOkunur) {
        // Herkes görür, kimse yazamaz (sadece Yönetici yazar)
        yetki.push({ id: herkes.id, deny: [PermissionFlagsBits.SendMessages], allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] });
        if (yoneticiRol) yetki.push({ id: yoneticiRol.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
        if (modRol) yetki.push({ id: modRol.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] });
      }
      // Susturulmuş hiçbir yazı kanalında yazamaz
      if (susturulmus) yetki.push({ id: susturulmus.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.SendMessagesInThreads] });
    } else {
      // Sesli
      if (k.afk) yetki.push({ id: herkes.id, deny: [PermissionFlagsBits.Speak] });
      if (susturulmus) yetki.push({ id: susturulmus.id, deny: [PermissionFlagsBits.Speak, PermissionFlagsBits.Connect] });
    }
    return yetki;
  }

  // Önce kategoriler (temizlikten sonra — her zaman sıfırdan)
  for (const katAd of S.kategoriler) {
    try {
      const kat = await message.guild.channels.create({ name: katAd, type: ChannelType.GuildCategory, reason: sebep });
      katMap.set(katAd, kat.id);
    } catch {}
  }

  // Sonra kanallar
  for (const k of S.kanallar) {
    try {
      const tip = k.tip === "ses" ? ChannelType.GuildVoice : ChannelType.GuildText;
      const ch = await message.guild.channels.create({
        name: k.ad,
        type: tip,
        parent: katMap.get(k.kat) || null,
        permissionOverwrites: overwrites(k, k.tip),
        reason: lang === "en" ? "Server setup" : "Sunucu kurulumu",
      });
      kanalMap.set(k.key, ch);
      kanalSonuc.basarili.push({ key: k.key, ad: ch.name, id: ch.id });
    } catch {
      kanalSonuc.basarisiz.push(k.ad);
    }
  }

  /* ── 3. OTOMATİK ENTEGRASYON (DB'ye kaydet + ticket paneli gönder) ── */
  const gid = message.guild.id;
  const entegrasyon = [];
  const al = (key) => kanalMap.get(key);
  const rolAl = (key) => rolMap.get(key);
  try {
    const hosgeldin = al("hosgeldin");
    const kayitKanal = al("kayit");
    const ticketKanal = al("ticket");
    const ticketKat = [...message.guild.channels.cache.values()].find(c => c.type === ChannelType.GuildCategory && /ticket/i.test(c.name));
    const modlog = al("modlog");
    const isimlog = al("isimlog");
    const kayitsizRol = rolAl("kayitsiz");
    const kayitYetkili = rolAl("kayityetki");
    const uyeRol = rolAl("uye");

    if (hosgeldin) {
      db.set(`gçkanal_${gid}`, hosgeldin.id);
      db.set(`kayıthg_${gid}`, hosgeldin.id);
      entegrasyon.push(`👋 ${hosgeldin.name} → welcome`);
    }
    if (kayitKanal) {
      db.set(`kayıtkanal_${gid}`, kayitKanal.id);   // klasik kayıt (k-erkek/k-kız)
      db.set(`kayıt-kanal.${gid}`, kayitKanal.id);  // AI kayıt (y-otosistem)
      entegrasyon.push(`📝 ${kayitKanal.name} → register`);
    }
    if (kayitsizRol) {
      db.set(`kayıt-kayıtsız.${gid}`, kayitsizRol.id); // AI oto-kayıt
      db.set(`alınacakrol_${gid}`, kayitsizRol.id);    // klasik kayıt alınacak rol
      db.set(`otoRL_${gid}`, kayitsizRol.id);          // otorol rolü
      if (hosgeldin) db.set(`otoRK_${gid}`, hosgeldin.id);
      entegrasyon.push(`❓ ${kayitsizRol.name} → unregistered/autorole`);
    }
    if (kayitYetkili) {
      db.set(`kayıtçırol_${gid}`, kayitYetkili.id);
      entegrasyon.push(`🎫 ${kayitYetkili.name} → registrar`);
    }
    if (uyeRol) entegrasyon.push(`👤 ${uyeRol.name} OK`);
    if (modlog) {
      db.set(`log_${gid}`, modlog.id); // modLogGonder() burayı okur
      entegrasyon.push(`📝 ${modlog.name} → mod-log`);
    }
    if (isimlog) {
      db.set(`isimlog_${gid}`, isimlog.id);
      entegrasyon.push(`✏️ ${isimlog.name} → name-log`);
    }
    const cezalog = al("cezalog");
    if (cezalog) entegrasyon.push(`🔨 ${cezalog.name} OK`);

    if (ticketKanal) {
      db.set(`kanal.${gid}`, ticketKanal.id);
      if (ticketKat) db.set(`ticket_kategori.${gid}`, ticketKat.id);
      entegrasyon.push(`🎫 ${ticketKanal.name} → ticket`);
      // Ticket panelini kanala gönder
      try {
        const panel = new EmbedBuilder()
          .setColor("#ee7621")
          .setTitle(t(lang, "ticketPanel.baslik"))
          .setDescription(t(lang, "ticketPanel.aciklama"))
          .setFooter({ text: "RiseBunny" });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("ticket_ac").setLabel(t(lang, "ticketPanel.buton")).setStyle(ButtonStyle.Primary).setEmoji("🎫")
        );
        await ticketKanal.send({ embeds: [panel], components: [row] });
      } catch {}
    }
  } catch {}

  /* ── 4. SONUÇ ── */
  const sonuc = new EmbedBuilder()
    .setColor("Green")
    .setTitle(metin(lang, "✅ Sunucu Kuruldu!", "✅ Server Set Up!"))
    .setDescription(metin(lang,
      `**🧹 Silinen:** ${silinen.rol} rol, ${silinen.kanal} kanal\n` +
      `**Roller:** ${rolSonuc.basarili.length}/${S.roller.length} ✅${rolSonuc.basarisiz.length ? `\n❌ Başarısız: ${rolSonuc.basarisiz.join(", ")}` : ""}\n` +
      `**Kanallar:** ${kanalSonuc.basarili.length}/${S.kanallar.length} ✅${kanalSonuc.basarisiz.length ? `\n❌ Başarısız: ${kanalSonuc.basarisiz.join(", ")}` : ""}\n\n` +
      `**🔗 Otomatik bağlantılar:**\n${entegrasyon.length ? entegrasyon.map(e => `• ${e}`).join("\n") : "—"}\n\n` +
      `🔒 Sadece-okunur kanallar: herkes görür, sadece Yönetici yazar.\n👁️ Log kanalları: sadece Yönetici + Moderatör görür.\n💤 AFK: herkes girer, kimse konuşamaz.\n🔇 Susturulmuş: hiçbir kanalda yazamaz/konuşamaz.`,
      `**🧹 Deleted:** ${silinen.rol} roles, ${silinen.kanal} channels\n` +
      `**Roles:** ${rolSonuc.basarili.length}/${S.roller.length} ✅${rolSonuc.basarisiz.length ? `\n❌ Failed: ${rolSonuc.basarisiz.join(", ")}` : ""}\n` +
      `**Channels:** ${kanalSonuc.basarili.length}/${S.kanallar.length} ✅${kanalSonuc.basarisiz.length ? `\n❌ Failed: ${kanalSonuc.basarisiz.join(", ")}` : ""}\n\n` +
      `**🔗 Auto-linked:**\n${entegrasyon.length ? entegrasyon.map(e => `• ${e}`).join("\n") : "—"}\n\n` +
      `🔒 Read-only channels: everyone reads, only Admins write.\n👁️ Log channels: only Admins + Moderators can see.\n💤 AFK: everyone joins, nobody speaks.\n🔇 Muted: cannot write/speak anywhere.`))
    .setFooter({ text: `RiseBunny • ${lang === "en" ? "Language: EN" : "Dil: TR"}` })
    .setTimestamp();

  await durumMsg.edit({ content: null, embeds: [sonuc] }).catch(() => message.channel.send({ embeds: [sonuc] }));
  await ownerLog(client, new EmbedBuilder().setColor("Green")
    .setDescription(`🏗️ ${lang === "en" ? "Server set up" : "Sunucu kuruldu"}: **${message.guild.name}** (${gid}) | ${message.author.tag} | ${lang} | 🎭 ${rolSonuc.basarili.length} rol, 📁 ${kanalSonuc.basarili.length} kanal`));
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["sunucu-kur", "setup", "setup-server"], permLevel: 3, kategori: "moderasyon" };
exports.help = { name: "sunucukur", description: "Sunucuyu kurar (kategori + kanallar).", usage: "sunucukur" };
