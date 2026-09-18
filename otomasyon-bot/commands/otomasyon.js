/**
 * Ana Otomasyon Komutu - Sunucu kurulumu ve yönetimi
 */

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { kurulumEmbed, basariEmbed, hataEmbed, bilgiEmbed, premiumEmbed } = require("../utils/embeds");
const { butonGruplari, linkButon } = require("../utils/buttons");
const config = require("../../config");

module.exports = {
  name: "otomasyon",
  description: "Otomasyon kurulum ve yönetim komutu",
  aliases: ["oto", "auto"],
  usage: "otomasyon [eğit/sıfırla/premium/yardım]",
  cooldown: 5,

  async execute(message, args, client) {
    const guild = message.guild;
    const user = message.author;
    const db = client.db;

    // Alt komut yoksa kurulum başlat
    if (!args.length) {
      const setupHandler = client.handlers.setup;
      await setupHandler.baslat(message);
      return;
    }

    const subCommand = args[0].toLowerCase();

    // ═══════════════════════════════════════════════
    // YARDIM
    // ═══════════════════════════════════════════════
    if (["yardım", "help", "y"].includes(subCommand)) {
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("🤖 Otomasyon Komutları")
        .setDescription("Topluluk destekli AI ticket sistemi")
        .addFields(
          { name: "`otomasyon`", value: "Sunucu kurulumunu başlatır (Yönetici)", inline: false },
          { name: "`otomasyon eğit <soru> | <cevap>`", value: "Manuel eğitim verisi ekler (Yönetici)", inline: false },
          { name: "`otomasyon sıfırla`", value: "Tüm verileri siler ve yeniden kurar (Yönetici)", inline: false },
          { name: "`otomasyon premium`", value: "Premium durumu ve avantajları gösterir", inline: false },
          { name: "`otomasyon premium aktif <gün>`", value: "Premium aktif et (Sadece Bot Sahibi)", inline: false },
          { name: "`otomasyon istatistik`", value: "Sunucu istatistiklerini gösterir", inline: false },
          { name: "`otomasyon dil <tr/en>`", value: "Sunucu dilini ayarlar (Yönetici)", inline: false },
          { name: "`otomasyon adminrol <@rol>`", value: "Yönetici rolünü ayarlar (Yönetici)", inline: false }
        )
        .setFooter({ text: "Otomasyon • Yardım" })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return;
    }

    // ═══════════════════════════════════════════════
    // EĞİT - Manuel eğitim verisi ekleme
    // ═══════════════════════════════════════════════
    if (["eğit", "egit", "train", "add"].includes(subCommand)) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply({ embeds: [hataEmbed("Yetki Yok", "Bu komutu sadece **Yönetici** yetkisine sahip kişiler kullanabilir.")] });
        return;
      }

      const content = args.slice(1).join(" ");
      const parts = content.split("|").map(p => p.trim());

      if (parts.length < 2) {
        await message.reply({ embeds: [hataEmbed("Eksik Parametre", "Kullanım: `otomasyon eğit <soru> | <cevap>`\nÖrn: `otomasyon eğit Şifre nasıl değiştirilir? | Profil → Güvenlik → Şifre Değiştir`")] });
        return;
      }

      const trainingHandler = client.handlers.training;
      await trainingHandler.manuelEgitim(message, parts);
      return;
    }

    // ═══════════════════════════════════════════════
    // SIFIRLA - Tüm verileri sil
    // ═══════════════════════════════════════════════
    if (["sıfırla", "sifirla", "reset"].includes(subCommand)) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply({ embeds: [hataEmbed("Yetki Yok", "Bu komutu sadece **Yönetici** yetkisine sahip kişiler kullanabilir.")] });
        return;
      }

      await message.reply({
        embeds: [hataEmbed("⚠️ Dikkat!", "Bu işlem **tüm eğitim verilerini, ticket ayarlarını ve kurulumu silecek**. Emin misiniz?")],
        components: [{
          type: 1,
          components: [
            { type: 2, style: 4, label: "✅ Evet, Sil", custom_id: `sifirla_onay_${guild.id}` },
            { type: 2, style: 2, label: "❌ Hayır, İptal", custom_id: `sifirla_iptal_${guild.id}` }
          ]
        }]
      });
      return;
    }

    // ═══════════════════════════════════════════════
    // PREMIUM
    // ═══════════════════════════════════════════════
    if (["premium", "prem", "vip"].includes(subCommand)) {
      const guildData = db.getGuild(guild.id);
      const isOwner = user.id === config.OWNER_ID;

      if (args[1] === "aktif" && isOwner) {
        const gun = parseInt(args[2]) || 30;
        const expiresAt = Date.now() + gun * 24 * 60 * 60 * 1000;
        
        db.updateGuild(guild.id, { premium_active: 1, premium_expires_at: expiresAt });
        db.addPremiumLog(guild.id, "activated", `Süre: ${gun} gün`);

        const premiumMesaj = "Bu sunucu için premium **" + gun + " gün** aktif edildi.";
        await message.reply({ embeds: [premiumEmbed("✅ Premium Aktif", premiumMesaj)] });
        return;
      }

      if (args[1] === "kapat" && isOwner) {
        db.updateGuild(guild.id, { premium_active: 0, premium_expires_at: 0 });
        db.addPremiumLog(guild.id, "deactivated", "Manuel kapatıldı");
        await message.reply({ embeds: [basariEmbed("✅ Premium Kapatıldı", "Bu sunucu için premium devre dışı bırakıldı.")] });
        return;
      }

      // Premium durumu göster
      const premiumAktif = guildData?.premium_active && guildData?.premium_expires_at > Date.now();
      const kalanGun = premiumAktif ? Math.ceil((guildData.premium_expires_at - Date.now()) / (24 * 60 * 60 * 1000)) : 0;

      const embed = new EmbedBuilder()
        .setColor(premiumAktif ? 0xFFD700 : 0x999999)
        .setTitle("💎 Premium Durumu")
        .addFields(
          { name: "Durum", value: premiumAktif ? `✅ Aktif (${kalanGun} gün kaldı)` : "❌ Pasif", inline: true },
          { name: "Avantajlar", value: "• Token limiti: 8000 (Normal: 2000)\n• Günlük mesaj hakkı: 500 (Normal: 100)\n• Öncelikli destek\n• Gelişmiş AI cevapları", inline: false }
        )
        .setFooter({ text: "Otomasyon • Premium" })
        .setTimestamp();

      if (!premiumAktif) {
        embed.addFields({ name: "Nasıl Alınır?", value: `Bot sahibi (${config.OWNER_ID}) \`otomasyon premium aktif <gün>\` ile aktif edebilir.` });
      }

      await message.reply({ embeds: [embed] });
      return;
    }

    // ═══════════════════════════════════════════════
    // İSTATİSTİK
    // ═══════════════════════════════════════════════
    if (["istatistik", "stats", "stat"].includes(subCommand)) {
      const guildData = db.getGuild(guild.id);
      const egitimSayisi = db.prepare("SELECT COUNT(*) as c FROM egitim_verisi WHERE guild_id = ?").get(guild.id)?.c || 0;
      const ticketSayisi = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE guild_id = ?").get(guild.id)?.c || 0;
      const acikTicket = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE guild_id = ? AND durum = 'acik'").get(guild.id)?.c || 0;
      const communitySayisi = db.prepare("SELECT COUNT(*) as c FROM community_answers WHERE guild_id = ? AND durum = 'cevaplandi'").get(guild.id)?.c || 0;

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle("📊 Sunucu İstatistikleri")
        .addFields(
          { name: "📚 Eğitim Verisi", value: `${egitimSayisi} soru-cevap`, inline: true },
          { name: "🎫 Toplam Ticket", value: `${ticketSayisi}`, inline: true },
          { name: "🟢 Açık Ticket", value: `${acikTicket}`, inline: true },
          { name: "🌐 Topluluk Cevapları", value: `${communitySayisi}`, inline: true },
          { name: "⚙️ Kurulum", value: guildData?.setup_completed ? "✅ Tamamlandı" : "❌ Yapılmadı", inline: true },
          { name: "💎 Premium", value: guildData?.premium_active ? "✅ Aktif" : "❌ Pasif", inline: true }
        )
        .setFooter({ text: "Otomasyon • İstatistik" })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return;
    }

    // ═══════════════════════════════════════════════
    // DİL AYARLA
    // ═══════════════════════════════════════════════
    if (["dil", "lang", "language"].includes(subCommand)) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply({ embeds: [hataEmbed("Yetki Yok", "Bu komutu sadece **Yönetici** kullanabilir.")] });
        return;
      }

      const dil = args[1]?.toLowerCase();
      if (!["tr", "en"].includes(dil)) {
        await message.reply({ embeds: [hataEmbed("Geçersiz Dil", "Desteklenen diller: `tr` (Türkçe), `en` (English)")] });
        return;
      }

      const dilAdi = dil === "tr" ? "Türkçe" : "English";
      const dilMesaj = "Sunucu dili **" + dilAdi + "** olarak ayarlandı.";
      await message.reply({ embeds: [basariEmbed("✅ Dil Ayarlandı", dilMesaj)] });
      return;
    }

    // ═══════════════════════════════════════════════
    // ADMIN ROL AYARLA
    // ═══════════════════════════════════════════════
    if (["adminrol", "adminrolu", "adminrole", "yetkilirol"].includes(subCommand)) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply({ embeds: [hataEmbed("Yetki Yok", "Bu komutu sadece **Yönetici** kullanabilir.")] });
        return;
      }

      const role = message.mentions.roles.first();
      if (!role) {
        await message.reply({ embeds: [hataEmbed("Eksik Parametre", "Lütfen bir rol etiketleyin: `otomasyon adminrol @Rol`")] });
        return;
      }

      const roleMesaj = "Yönetici rolü **" + role.name + "** olarak ayarlandı.\nBu role sahip kişiler ticket kapatabilir ve yönetebilir.";
      await message.reply({ embeds: [basariEmbed("✅ Admin Rolü Ayarlandı", roleMesaj)] });
      return;
    }

    // Bilinmeyen alt komut
    const hataMesaj = "Bilinmeyen alt komut: **" + subCommand + "**\n`otomasyon yardım` yazıp komutları görebilirsiniz.";
      await message.reply({ embeds: [hataEmbed("Bilinmeyen Komut", hataMesaj)] });
  }
};