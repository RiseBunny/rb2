/**
 * Eğitim Handler - Yetkili eğitim akışı (AI cevap onayı, topluluk cevapları)
 */

const { basariEmbed, hataEmbed, bilgiEmbed } = require("../utils/embeds");
const { butonGruplari } = require("../utils/buttons");
const { CevapGelistirici, DilAlgilayici } = require("../ai");

class TrainingHandler {
  constructor(db, bot) {
    this.db = db;
    this.bot = bot;
    this.ai = new CevapGelistirici();
    this.dilAlgilayici = new DilAlgilayici(db);
  }

  /**
   * Yetkili manuel eğitim başlat: "otomasyon eğit <soru> | <cevap>"
   */
  async manuelEgitim(message, args) {
    if (!message.member.permissions.has("Administrator")) {
      await message.reply({ embeds: [hataEmbed("Yetki Yok", "Sadece yöneticiler eğitim verisi ekleyebilir.")] });
      return;
    }

    const content = args.join(" ");
    const parts = content.split("|").map(p => p.trim());

    if (parts.length < 2) {
      await message.reply({ embeds: [hataEmbed("Eksik Parametre", "Kullanım: `otomasyon eğit <soru> | <cevap>`")] });
      return;
    }

    const soru = parts[0];
    const cevap = parts.slice(1).join("|").trim();

    if (soru.length > 500 || cevap.length > 4000) {
      await message.reply({ embeds: [hataEmbed("Çok Uzun", "Soru max 500, cevap max 4000 karakter olabilir.")] });
      return;
    }

    // AI ile geliştir
    const gelistirilmisCevap = this.ai.gelistir(cevap, soru, "tr");

    // Training session oluştur
    const trainingId = this.db.createTrainingSession(message.guild.id, message.author.id, soru);
    this.db.updateTrainingSession(trainingId, {
      asama: "onay_bekleniyor",
      ham_cevap: cevap,
      ai_cevap: gelistirilmisCevap
    });

    // Onay iste
    await message.reply({
      embeds: [{
        color: 0x9933FF,
        title: "🤖 AI Cevabı Geliştirdi",
        description: "**Orijinal cevabınız:**\n```\n" + cevap + "\n```\n\n**AI'nın önerdiği versiyon:**\n" + gelistirilmisCevap,
        footer: { text: "Bu cevabı onaylıyor musunuz?" },
        timestamp: new Date()
      }],
      components: [{
        type: 1,
        components: [
          { type: 2, style: 3, label: "✅ Onayla (AI)", custom_id: `training_approve_ai_${trainingId}` },
          { type: 2, style: 1, label: "✅ Onayla (Orijinal)", custom_id: `training_approve_original_${trainingId}` },
          { type: 2, style: 4, label: "❌ İptal", custom_id: `training_cancel_${trainingId}` }
        ]
      }]
    });
  }

  /**
   * Eğitim butonları işle
   */
  async butonIsle(interaction) {
    const customId = interaction.customId;

    if (customId.startsWith("training_approve_ai_")) {
      return this.onayla(interaction, customId, true);
    } else if (customId.startsWith("training_approve_original_")) {
      return this.onayla(interaction, customId, false);
    } else if (customId.startsWith("training_cancel_")) {
      return this.iptal(interaction, customId);
    } else if (customId.startsWith("faydali_evet_")) {
      return this.faydaliIsle(interaction, customId, true);
    } else if (customId.startsWith("faydali_hayir_")) {
      return this.faydaliIsle(interaction, customId, false);
    }

    return false;
  }

  async onayla(interaction, customId, useAI) {
    const trainingId = parseInt(customId.split("_").pop());
    const training = this.db.getTrainingSession(trainingId);

    if (!training) {
      await interaction.reply({ content: "❌ Oturum bulunamadı.", ephemeral: true });
      return;
    }

    if (training.user_id !== interaction.user.id) {
      await interaction.reply({ content: "❌ Bu işlemi sadece başlatan kişi yapabilir.", ephemeral: true });
      return;
    }

    const cevap = useAI ? training.ai_cevap : training.ham_cevap;
    const kaynak = useAI ? "ai_approved" : "manual";

    this.db.addEgitimVerisi(
      interaction.guild.id,
      training.soru,
      cevap,
      interaction.user.id,
      kaynak,
      interaction.user.id
    );

    this.db.updateTrainingSession(trainingId, { asama: "tamamlandi" });

    await interaction.update({
      embeds: [basariEmbed(
        useAI ? "✅ AI Cevabı Kaydedildi" : "✅ Orijinal Cevap Kaydedildi",
        `**Soru:** ${training.soru}\n**Cevap:** ${cevap.slice(0, 1000)}`
      )],
      components: []
    });
  }

  async iptal(interaction, customId) {
    const trainingId = parseInt(customId.split("_").pop());
    const training = this.db.getTrainingSession(trainingId);

    if (!training || training.user_id !== interaction.user.id) {
      await interaction.reply({ content: "❌ Yetkisiz.", ephemeral: true });
      return;
    }

    this.db.updateTrainingSession(trainingId, { asama: "iptal_edildi" });

    await interaction.update({
      embeds: [bilgiEmbed("İptal Edildi", "Eğitim işlemi iptal edildi.")],
      components: []
    });
  }

  /**
   * Kullanıcı "Faydalı mı?" butonları
   */
  async faydaliIsle(interaction, customId, faydali) {
    const egitimId = parseInt(customId.split("_").pop());
    const egitim = this.db.getEgitimVerisiById(egitimId);

    if (!egitim) {
      await interaction.reply({ content: "❌ Kayıt bulunamadı.", ephemeral: true });
      return;
    }

    if (faydali) {
      this.db.incrementFaydali(egitimId);
      await interaction.update({
        embeds: [basariEmbed("🎉 Teşekkürler!", "Bu cevabın faydalı olduğunu duyduğuma sevindim! Başka sorunuz olursa buradayım.")],
        components: []
      });
    } else {
      // Ticket açma seçeneği sun
      await interaction.update({
        embeds: [{
          color: 0xFFAA00,
          title: "😔 Maalesef",
          description: "Bu cevap sorununuzu çözmedi. Ticket açmamı ister misiniz?",
          timestamp: new Date()
        }],
        components: [{
          type: 1,
          components: [
            { type: 2, style: 1, label: "🎫 Ticket Aç", custom_id: `faydali_ticket_${egitimId}` },
            { type: 2, style: 2, label: "❌ İptal", custom_id: `faydali_iptal_${egitimId}` }
          ]
        }]
      });
    }
  }

  /**
   * Admin "rise <soru>" komutunu yönetici kanalda kullanıp ticket açmak istediğinde
   */
  async adminSoruYonet(message) {
    const guild = message.guild;
    const guildData = this.db.getGuild(guild.id);

    if (!guildData?.setup_completed) return false;

    // Admin rolü kontrolü
    const adminRoleId = guildData.admin_role_id;
    const isAdmin = message.member.permissions.has("Administrator") ||
      (adminRoleId && message.member.roles.cache.has(adminRoleId));

    if (!isAdmin) return false;

    // "rise" ile başlıyor mu?
    if (!message.content.toLowerCase().startsWith("otomasyon ")) return false;

    const soru = message.content.slice(10).trim(); // "otomasyon ".length = 10
    if (!soru) return false;

    // Dil algıla
    const dil = await this.dilAlgilayici.algila(message);

    // Cevap ara
    const sonuc = await this.bot.soruEslestirici.bul(guild.id, soru);

    if (sonuc) {
      // Cevap var - gönder
      this.db.incrementKullanim(sonuc.id);

      await message.reply({
        embeds: [{
          color: 0x0099FF,
          title: "🔍 Cevap Bulundu",
          description: sonuc.cevap,
          fields: [
            { name: "📌 Kaynak", value: sonuc.kaynak === "ai_approved" ? "🤖 AI Onaylı" : sonuc.kaynak, inline: true },
            { name: "🎯 Benzerlik", value: `%${Math.round(sonuc.skor * 100)}`, inline: true }
          ],
          footer: { text: "Bu cevap sorununuzu çözdü mü?" },
          timestamp: new Date()
        }],
        components: [{
          type: 1,
          components: [
            { type: 2, style: 3, label: "✅ Evet", custom_id: `faydali_evet_${sonuc.id}` },
            { type: 2, style: 4, label: "❌ Hayır", custom_id: `faydali_hayir_${sonuc.id}` }
          ]
        }]
      });
      return true;
    }

    // Cevap yok - ticket öner
    await message.reply({
      embeds: [{
        color: 0xFFAA00,
        title: "🤔 Cevap Bulunamadı",
        description: `**Sorunuz:** "${soru}"\n\nBu soruya özel bir cevabım yok. Ticket açmamı ister misiniz?`,
        timestamp: new Date()
      }],
      components: [{
        type: 1,
        components: [
          { type: 2, style: 1, label: "🎫 Ticket Aç", custom_id: `admin_ticket_ac_${message.id}` },
          { type: 2, style: 2, label: "❌ İptal", custom_id: `admin_ticket_iptal_${message.id}` }
        ]
      }]
    });
    return true;
  }
}

module.exports = TrainingHandler;