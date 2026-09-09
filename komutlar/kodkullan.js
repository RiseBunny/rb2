const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const couponCode = (args[0] || "").toUpperCase();

  if (!couponCode) {
    return message.reply(EN ? 'Please enter a coupon code.' : 'Lütfen bir kupon kodu girin.');
  }

  let kupon = db.fetch(`kupon_${couponCode}`);
  // Eski format (saf sayı) geri uyumluluk
  if (typeof kupon === "number") kupon = { kod: couponCode, tip: "para", miktar: kupon, bitis: 0, yer: "ikisi", limit: 0, calismalar: 0 };
  if (!kupon || typeof kupon !== "object") {
    return message.reply(EN ? 'The coupon code entered is invalid.' : 'Girilen kupon kodu geçersiz.');
  }
  // Eski tek-kullanımlık işaret
  if (db.fetch(`usedCoupons.${couponCode}`)) {
    return message.reply(EN ? 'This coupon has already been used.' : 'Bu kupon daha önce kullanılmış.');
  }

  // Süre kontrolü
  if (kupon.bitis && Date.now() > kupon.bitis) {
    return message.reply(EN ? 'This coupon has expired.' : 'Bu kuponun süresi dolmuş.');
  }
  // Kullanım limiti
  if (kupon.limit && (kupon.calismalar || 0) >= kupon.limit) {
    return message.reply(EN ? 'This coupon has reached its usage limit.' : 'Bu kupon kullanım limitine ulaşmış.');
  }
  // Hesap başına tek kullanım
  if (db.fetch(`kupon_kullandi_${couponCode}_${message.author.id}`)) {
    return message.reply(EN ? 'You already used this coupon.' : 'Bu kuponu zaten kullandın.');
  }
  // Yer kontrolü: site-şartlı kuponlar botta kullanılamaz
  if (kupon.yer === "site") {
    const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "🌐 Website Coupon" : "🌐 Site Kuponu")
      .setDescription(EN
        ? `This coupon can only be redeemed **on our website**.\nSign in with Discord at risebunny.vercel.app → use it in the "Account & Shop" section.`
        : `Bu kupon **sadece sitemizde** kullanılabilir.\nrisebunny.vercel.app adresinde Discord ile giriş yap → "Hesabım & Mağaza" bölümünde kuponu gir.`);
    return message.reply({ embeds: [e] }).catch(() => {});
  }

  const odulMetin = kupon.tip === "premium"
    ? `💎 ${(EN ? "Premium: " : "Premium: ") + kupon.premiumGun + (EN ? " days" : " gün")}`
    : kupon.tip === "pet"
      ? `${kupon.petEmoji || "🐾"} ${kupon.petAd}`
      : `💸 **${(Number(kupon.miktar) || 0).toLocaleString()}** RiseBunny Cash`;

  const e = new EmbedBuilder()
    .setColor("Gold")
    .setTitle(EN ? "Redeem Coupon" : "Kupon Kullan")
    .setDescription(EN
      ? `Coupon \`${couponCode}\` → ${odulMetin}\nConfirm to continue.`
      : `\`${couponCode}\` kuponu → ${odulMetin}\nDevam etmek için onayla.`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`kupon_evet_${couponCode}_${message.author.id}`).setLabel(EN ? "Confirm" : "Onayla").setStyle(ButtonStyle.Success).setEmoji("✅"),
    new ButtonBuilder().setCustomId("kupon_hayir").setLabel(EN ? "Cancel" : "İptal").setStyle(ButtonStyle.Danger).setEmoji("✖️")
  );
  await message.reply({ embeds: [e], components: [row] });
};

exports.conf = { enabled: true, aliases: ['kuponkullan', 'redeem-coupon', 'redeem'], permLevel: 0, kategori: "ekonomi" };
exports.help = { name: 'kuponkullan', description: 'Kupon kodu ile ödül al (para/pet/premium).', usage: 'kuponkullan <kod>' };
