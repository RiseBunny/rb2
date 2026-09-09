const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { t, getLang, KATEGORILER, KOMUTLAR, katAdi, katCoz, komutAdi, komutBilgi } = require("../dil");
const { isPremium, DESTEK, PREFIX, SAHIP_ID } = require("../utils");

// Menüde SAHİP kategorisi artık görünür — sadece kullanan kişiye sahip satırları gösterilir
const GIZLI = new Set(["yardim"]);

/** Kategorideki komutları o dilde listeler. */
function kategoriListesi(client, lang, katId) {
  const satirlar = [];
  for (const [canonical] of Object.entries(KOMUTLAR)) {
    const bilgi = KOMUTLAR[canonical];
    if (bilgi.kat !== katId) continue;
    const cmd = client.commands.get(canonical);
    if (!cmd) continue;
    const ad = komutAdi(lang, canonical);
    const b = komutBilgi(lang, canonical);
    satirlar.push(`\`${PREFIX}${ad}\` — ${b.aciklama || "-"}`);
  }
  return satirlar;
}

exports.run = async (client, message, args) => {
  const lang = await getLang(message.author.id);
  const uyelik = isPremium(message.author.id) ? "💎 Premium" : "Normal";
  const davet = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
  const EN = lang === "en";

  // r!yardım <kategori> (TR veya EN kategori adıyla)
  const alt = (args[0] || "").toLowerCase();
  if (alt) {
    const kat = katCoz(alt);
    if (kat && !GIZLI.has(kat.id)) {
      // Sahip kategorisi sadece sahip tarafından görülebilir
      if (kat.id === "sahip" && message.author.id !== SAHIP_ID) {
        return message.reply(EN ? "This category is owner-only." : "Bu kategori sadece bot sahibine açıktır.").catch(() => {});
      }
      const satirlar = kategoriListesi(client, lang, kat.id);
      const embed = new EmbedBuilder()
        .setAuthor({ name: `${kat.emoji} ${katAdi(lang, kat.id)}`, iconURL: client.user.displayAvatarURL() })
        .setColor("Random")
        .setDescription(satirlar.length ? satirlar.join("\n").slice(0, 3900) : "-")
        .setFooter({ text: `RiseBunny • ${PREFIX}${komutAdi(lang, "yardım")}` })
        .setTimestamp();
      return message.channel.send({ embeds: [embed] }).catch(() => {});
    }
    // Eski alt-yardım komutlarına geri uyumluluk (ekonomi, moderasyon...)
    const eski = client.commands.get(alt) || client.commands.get(client.aliases.get(alt));
    if (eski && (eski.conf.kategori === "Bot" || eski.conf.kategori === "bot" || eski.conf.kategori === "yardım")) {
      return eski.run(client, message, args.slice(1));
    }
  }

  const menuKategoriler = KATEGORILER.filter(k => !GIZLI.has(k.id) && (k.id !== "sahip" || message.author.id === SAHIP_ID));
  const embed = new EmbedBuilder()
    .setAuthor({ name: t(lang, "yardim.baslik"), iconURL: client.user.displayAvatarURL() })
    .setColor("Random")
    .setThumbnail(message.author.displayAvatarURL())
    .setDescription(t(lang, "yardim.aciklama", { kullanici: `${message.author}`, prefix: PREFIX, uyelik }))
    .addFields({
      name: `🚀 ${EN ? "V2.0 UPDATE — NOW LIVE!" : "V2.0 GÜNCELLEMESİ YAYINDA!"}`,
      value: EN
        ? "**• 🎁 Launch coupon `RISE-V2` — 250,000 cash** (one per account, redeem on our website after signing in with Discord)\n**• 🐾 Pet system 2.0** — button menus, fair ±10% sales\n**• 🛒 Website shop** — discounted premium & pets\n**• 🔑 Discord login** on site & forum\n**• 💾 Backup system** — `r!yedek` / `r!yedek-yükle`\n**• 👑 Owner panel** — `r!bakım`, `r!mağaza-yönet`, `r!kupon`"
        : "**• 🎁 Yayın kuponu `RISE-V2` — 250.000 RiseBunny Cash** (hesap başına tek, sitemizde Discord ile giriş yaptıktan sonra girilir)\n**• 🐾 Pet sistemi 2.0** — butonlu menüler, adil ±%10 satış\n**• 🛒 Site mağazası** — indirimli premium & pet\n**• 🔑 Discord ile giriş** — site + forum\n**• 💾 Yedek sistemi** — `r!yedek` / `r!yedek-yükle`\n**• 👑 Sahip paneli** — `r!bakım`, `r!mağaza-yönet`, `r!kupon`"
    })
    .addFields({
      name: `• ${t(lang, "yardim.kategoriler")}`,
      value: menuKategoriler.map(k => `${k.emoji} • \`${PREFIX}${katAdi(lang, k.id)}\` — ${t(lang, `kategoriler.${k.id}`)}`).join("\n").slice(0, 1020)
    })
    .addFields({ name: `💎 ${t(lang, "yardim.premiumBaslik")}`, value: t(lang, "yardim.premiumPerks") })
    .setImage("https://media.discordapp.net/attachments/1126239630203818095/1130479789757693952/standard.gif")
    .setFooter({ text: "RiseBunny V2.0", iconURL: message.author.displayAvatarURL() })
    .setTimestamp();

  const menu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("yardim_kategori")
      .setPlaceholder(EN ? "Select category..." : "Kategori seç...")
      .addOptions(menuKategoriler.map(k => ({ label: katAdi(lang, k.id).slice(0, 90), description: t(lang, `kategoriler.${k.id}`).slice(0, 90), value: k.id, emoji: k.emoji })))
  );
  const butonlar = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel("WebSite").setStyle(ButtonStyle.Link).setURL("https://risebunny.vercel.app").setEmoji("🌐"),
    new ButtonBuilder().setLabel(t(lang, "yardim.davetEt")).setStyle(ButtonStyle.Link).setURL(davet).setEmoji("📨"),
    new ButtonBuilder().setLabel(t(lang, "yardim.destekSunucu")).setStyle(ButtonStyle.Link).setURL(DESTEK).setEmoji("💬"),
    new ButtonBuilder().setLabel(EN ? "V2.0 Coupon" : "V2.0 Kuponu").setStyle(ButtonStyle.Success).setCustomId("kupon_bilgi_v2")
  );
  await message.channel.send({ embeds: [embed], components: [menu, butonlar] });
};

exports.kategoriListesi = kategoriListesi;
exports.conf = { enabled: true, guildOnly: false, aliases: ["y", "help", "h", "yardim"], permLevel: 0, kategori: "bot" };
exports.help = { name: "yardım", description: "Yardım menüsünü gösterir.", usage: "yardım [kategori]" };
