const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { t, getLang, KATEGORILER, KOMUTLAR, katAdi, katCoz, komutAdi, komutBilgi } = require("../dil");
const { isPremium, DESTEK, PREFIX, SAHIP_ID } = require("../utils");

// Menüde SAHİP kategorisi artık görünür — sadece kullanan kişiye sahip satırları gösterilir
const GIZLI = new Set(["yardim"]);

/** Kategorideki komutları o dilde listeler. */
function kategoriListesi(client, lang, katId) {
  const EN = lang === "en";
  const satirlar = [];

  /* SAHİP kategorisi: listeyi elle tutmak yerine gerçek komutlardan türet.
     Böylece sahip-only (permLevel 5) her komut + sözlükte "sahip" işaretli
     komutlar eksiksiz görünür. */
  if (katId === "sahip") {
    const eklenen = new Set();
    const ekle = (canonical, cmd) => {
      if (eklenen.has(canonical)) return;
      eklenen.add(canonical);
      const b = komutBilgi(lang, canonical);
      const kapali = cmd && cmd.conf && cmd.conf.enabled === false ? (EN ? " (disabled)" : " (kapalı)") : "";
      satirlar.push(`\`${PREFIX}${komutAdi(lang, canonical)}\`${kapali} — ${b.aciklama || "-"}`);
    };
    /* 1) Sahip-only komutlar (komut dosyasındaki permLevel: 5) */
    for (const [canonical, cmd] of client.commands) {
      if (cmd && cmd.conf && cmd.conf.permLevel === 5) ekle(canonical, cmd);
    }
    /* 2) Sözlükte "sahip" kategorisinde işaretli komutlar */
    for (const [canonical, bilgi] of Object.entries(KOMUTLAR)) {
      if (bilgi.kat !== "sahip") continue;
      const cmd = client.commands.get(canonical);
      if (cmd) ekle(canonical, cmd);
    }
    return satirlar;
  }

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

/** AI komutlarını öne çıkararak listeler */
function aiKomutListesi(lang) {
  const EN = lang === "en";
  const aiKomutlar = [
    { canonical: "otomasyon", label: EN ? "🤖 AI Server Training" : "🤖 Sunucuya Özel AI Eğitimi", desc: EN ? "Train AI with your server's Q&A" : "Sunucunuzun soru-cevaplarıyla AI eğitin" },
    { canonical: "cevir", label: EN ? "🌐 AI Translate" : "🌐 AI Çeviri", desc: EN ? "Translate text with AI" : "AI ile metin çevirin" },
    { canonical: "y-kayıt-sistem", label: EN ? "📝 AI Registration" : "📝 AI Kayıt Sistemi", desc: EN ? "AI-powered registration system" : "Yapay zeka destekli kayıt sistemi" },
    { canonical: "y-koruma", label: EN ? "🛡️ AI Protection" : "🛡️ AI Koruma", desc: EN ? "AI-based server protection" : "Yapay zeka tabanlı koruma" },
    { canonical: "y-otosistem", label: EN ? "⚙️ AI Auto Setup" : "⚙️ AI Otomatik Kurulum", desc: EN ? "Auto-setup AI registration" : "AI kayıt sistemini otomatik kur" }
  ];
  
  return aiKomutlar.map(k => {
    const b = komutBilgi(lang, k.canonical);
    const cmd = b ? komutAdi(lang, k.canonical) : k.canonical;
    return `**${k.label}** — \`${PREFIX}${cmd}\`\n  ${k.desc}`;
  }).join("\n\n");
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
      name: `🤖 ${EN ? "AI FEATURES — NEW!" : "AI ÖZELLİKLERİ — YENİ!"}`,
      value: aiKomutListesi(lang)
    })
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
