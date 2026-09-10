const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getLangSync } = require("../dil");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const e = new EmbedBuilder().setColor("#5865F2")
    .setTitle(EN ? "🗂️ RiseBunny — Data & Commands" : "🗂️ RiseBunny — Veri ve Komutlar")
    .setDescription(EN
      ? "**What we store (bot):** Discord ID, display name, language, consent date, wallet/bank/IBAN, XP/level, pets, premium status, vote timestamps, reminders you set, coupon redemptions, XP cooldowns.\n**What we store (site/forum):** Discord profile (via login), forum username/role, threads, replies, reports, notifications, contact messages, deletion requests.\n**Why:** economy, levels, moderation, shop, leaderboards, support.\n**Delete everything:** site → Account section → *“Tüm verilerimin silinmesini talep et”*, or ask an admin. Details on the docs page:"
      : "**Neler saklanır (bot):** Discord ID, görünen ad, dil, onay tarihi, cüzdan/banka/IBAN, XP/seviye, petler, premium durumu, oy zamanları, kurduğun hatırlatıcılar, kullanılan kuponlar, XP bekleme süreleri.\n**Neler saklanır (site/forum):** Discord profili (giriş ile), forum adı/rolü, konular, yanıtlar, reportlar, bildirimler, iletişim mesajları, silme talepleri.\n**Neden:** ekonomi, seviye, moderasyon, mağaza, sıralamalar, destek.\n**Hepsini sil:** site → Hesabım bölümü → *“Tüm verilerimin silinmesini talep et”* ya da yetkiliye yaz. Detaylar döküman sayfasında:")
    .addFields(
      { name: EN ? "📌 Main commands" : "📌 Ana komutlar", value: "`r!yardım` • `r!param` • `r!seviye` • `r!market` • `r!pet` • `r!hatırlat` • `r!kuponkullan` • `r!dil`" },
      { name: EN ? "🔑 Your rights" : "🔑 Hakların", value: EN ? "View, correct and delete your data anytime (GDPR/KVKK)." : "Verilerini istediğin zaman görme, düzeltme ve silme hakkın var (KVKK/GDPR)." }
    )
    .setFooter({ text: "RiseBunny • Transparency" });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel("📄 Docs").setStyle(ButtonStyle.Link).setURL("https://risebunny.vercel.app/docs.html"),
    new ButtonBuilder().setLabel("🔒 Privacy").setStyle(ButtonStyle.Link).setURL("https://risebunny.vercel.app/privacy.html"),
    new ButtonBuilder().setLabel("📜 Terms").setStyle(ButtonStyle.Link).setURL("https://risebunny.vercel.app/terms.html")
  );
  return message.channel.send({ embeds: [e], components: [row] }).catch(() => {});
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["bilgi-sistemi", "verilerim", "mydata", "datasystem"], permLevel: 0, kategori: "genel" };
exports.help = { name: "bilgisistemi", description: "Toplanan veriler, komutlar ve silme bilgisi.", usage: "bilgisistemi" };
