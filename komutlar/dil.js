const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require("discord.js");
const { diller, GECERLI, setLang, setGuildLang, getGuildLang, getLang, t } = require("../dil");

function dilSecenekleri() {
  return GECERLI.map(k => ({ label: diller[k].isim, value: k, description: `Bot dilini ${diller[k].isim} yap` }));
}

exports.run = async (client, message, args) => {
  const secim = (args[0] || "").toLowerCase();

  // Hizli: r!dil tr / r!dil en (kullanici dili)
  if (secim && GECERLI.includes(secim)) {
    setLang(message.author.id, secim);
    return message.reply(t(secim, "ortak.dilOk"));
  }

  // Hizli: r!dil sunucu tr / r!dil server en (sunucu dili, yetkili)
  if (secim === "sunucu" || secim === "server") {
    if (!message.guild) return;
    const isOwner = message.guild.ownerId === message.author.id;
    if (!isOwner && !message.member?.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.reply(t(await getLang(message.author.id), "ortak.sunucuDilGerek"));
    const ssecim = (args[1] || "").toLowerCase();
    if (!GECERLI.includes(ssecim)) return message.reply(t("tr", "ortak.dilSec") + ` (${GECERLI.join("/")})`);
    const gid = message.guild.id;
    setGuildLang(gid, ssecim);
    const dilAdi = ssecim === "en" ? "English" : "Türkçe";
    return message.reply(t(ssecim, "ortak.sunucuDilOk", { dil: dilAdi }));
  }

  if (secim) return message.reply(t("tr", "ortak.dilSec") + ` (${GECERLI.join("/")})`);

  // Menulu: ustte kullanici dili, altta sunucu dili
  const langAd = GECERLI.map(k => "`" + k + "` (" + diller[k].isim + ")").join(", ");
  const sl = message.guild ? getGuildLang(message.guild.id) : "tr";
  const slAd = sl === "en" ? "English" : "Türkçe";
  const rowKullanici = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId("dil_sec").setPlaceholder("Dil seç / Select language").addOptions(dilSecenekleri())
  );
  const rowSunucu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId("sdil_sec").setPlaceholder("Sunucu Dili / Server Language").addOptions(dilSecenekleri())
  );
  const embed = new EmbedBuilder()
    .setColor("#36393F")
    .setTitle("🌍 Dil / Language")
    .setDescription(
      `**👤 Dil / Your language**\nMevcut diller / Available: ${langAd}\nKullanım / Usage: \`r!dil tr\`\n\n` +
      `**🏠 ${t(sl, "ortak.sunucuDilBaslik")} / Server Language**\n` +
      `Mevcut / Current: **${slAd}**\nKullanım / Usage: \`r!dil sunucu tr\` (Sunucuyu Yönet yetkisi gerekir / Manage Server required)`
    );
  await message.reply({ embeds: [embed], components: [rowKullanici, rowSunucu] });
};

/** Dil secmemis kullaniciya gonderilen panel (message.js ilk-komut akisi kullanir). */
function dilPaneli(PREFIX, options = {}) {
  const { ActionRowBuilder: ARB, StringSelectMenuBuilder: SSMB, EmbedBuilder: EB } = require("discord.js");
  const isOwner = typeof options === "boolean" ? options : Boolean(options?.isOwner);
  const guildNeedsLang = options && typeof options === "object" && options.guildNeedsLang !== undefined
    ? Boolean(options.guildNeedsLang)
    : isOwner;
  const userNeedsLang = options && typeof options === "object" && options.userNeedsLang !== undefined
    ? Boolean(options.userNeedsLang)
    : true;

  const components = [];

  if (userNeedsLang) {
    components.push(
      new ARB().addComponents(
        new SSMB().setCustomId("dil_sec").setPlaceholder("👤 Dil seç / Select language").addOptions(dilSecenekleri())
      )
    );
  }

  if (isOwner && guildNeedsLang) {
    components.push(
      new ARB().addComponents(
        new SSMB().setCustomId("sdil_sec").setPlaceholder("🏠 Sunucu Dili Seç / Select Server Language").addOptions(dilSecenekleri())
      )
    );
  }

  const embed = new EB()
    .setColor("#36393F")
    .setTitle("🌍 Dil Seçimi / Language Selection");

  if (isOwner && guildNeedsLang && userNeedsLang) {
    embed.setDescription(
      `**👤 Kişisel Dil / Personal Language**\n` +
      `Önce kendi dilini seçmelisin / You must select your personal language first.\n` +
      `Kullanım / Usage: \`${PREFIX}dil tr\` | \`${PREFIX}dil en\`\n\n` +
      `**👑 Sunucu Sahibi / Server Owner**\n` +
      `Sunucu sahibi olduğun için sunucu varsayılan dilini de aşağıdaki menüden seçebilirsin!\n` +
      `Since you are the server owner, you can also select the server's default language below!\n` +
      `Kullanım / Usage: \`${PREFIX}dil sunucu tr\` | \`${PREFIX}dil sunucu en\``
    );
  } else if (isOwner && guildNeedsLang) {
    embed.setDescription(
      `**👑 Sunucu Sahibi / Server Owner**\n` +
      `Bu sunucu için henüz sunucu dili ayarlanmamış. Lütfen sunucunun varsayılan dilini seçin!\n` +
      `No server language has been set for this guild yet. Please select the server's default language below!\n` +
      `Kullanım / Usage: \`${PREFIX}dil sunucu tr\` | \`${PREFIX}dil sunucu en\``
    );
  } else {
    embed.setDescription(
      `Önce dilini seçmelisin / You must select your language first.\n` +
      `Kullanım / Usage: \`${PREFIX}dil tr\` veya \`or\` \`${PREFIX}dil en\``
    );
  }

  // Alt satır: dokümantasyon linkleri + onay butonları
  const { ButtonBuilder: BB, ButtonStyle: BS } = require("discord.js");
  components.push(
    new ARB().addComponents(
      new BB().setLabel("📄 Docs").setStyle(BS.Link).setURL("https://risebunny.vercel.app/docs.html"),
      new BB().setLabel("🔒 Privacy").setStyle(BS.Link).setURL("https://risebunny.vercel.app/privacy.html"),
      new BB().setLabel("📜 Terms").setStyle(BS.Link).setURL("https://risebunny.vercel.app/terms.html")
    )
  );
  components.push(
    new ARB().addComponents(
      new BB().setCustomId("onay_evet").setLabel("✅ Kaydet ve Kabul Et / Accept").setStyle(BS.Success),
      new BB().setCustomId("onay_hayir").setLabel("❌ Onaylamıyorum / Decline").setStyle(BS.Danger)
    )
  );

  return { embeds: [embed], components };
}

exports.dilPaneli = dilPaneli;

exports.conf = { enabled: true, guildOnly: false, aliases: ["language", "lang", "lisan"], permLevel: 0, kategori: "bot" };
exports.help = { name: "dil", description: "Bot dilini ayarlar.", usage: "dil <tr/en>" };
