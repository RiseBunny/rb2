/**
 * Kurulum Handler - Sunucu kurulum süreci (State Machine)
 */

const { kurulumEmbed, basariEmbed, hataEmbed, uyariEmbed } = require("../utils/embeds");
const { butonGruplari, tekButon } = require("../utils/buttons");
const { modallar } = require("../utils/modals");

class SetupHandler {
  constructor(db, bot) {
    this.db = db;
    this.bot = bot;
  }

  /**
   * Kurulum başlat
   */
  async baslat(message) {
    const guild = message.guild;
    const user = message.author;

    // Yetki kontrolü
    if (!message.member.permissions.has("Administrator")) {
      await message.reply({ embeds: [hataEmbed("Yetki Yok", "Bu komutu sadece **Yönetici** yetkisine sahip kişiler kullanabilir.")] });
      return;
    }

    // Zaten kurulu mu kontrol et
    const guildData = this.db.getGuild(guild.id);
    if (guildData?.setup_completed) {
      await message.reply({ embeds: [uyariEmbed("Zaten Kurulu", "Bu sunucu zaten kuruldu. Yeniden kurmak için `otomasyon sıfırla` yazın.")] });
      return;
    }

    // Session oluştur
    this.db.createSetupSession(guild.id, user.id, "waiting_category", {});

    await message.reply({
      embeds: [kurulumEmbed(
        "Otomasyon Kurulumuna Hoş Geldiniz! 🎉",
        "Bu sihirbaz size **3 adımda** botu kurmanıza yardımcı olacak.\n\n**Adım 1/3:** Ticket'ların açılacağı **kategoriyi** etiketleyin.",
        [],
        1, 3
      )]
    });
  }

  /**
   * Mesaj işle (state machine)
   */
  async mesajIsle(message) {
    const session = this.db.getSetupSession(message.guild.id);
    if (!session) return false;
    if (session.user_id !== message.author.id) return false;

    const adim = session.step;
    const data = JSON.parse(session.data || "{}");

    switch (adim) {
      case "waiting_category":
        return this.kategoriAl(message, session, data);
      case "waiting_no_answer_channel":
        return this.kanalAl(message, session, data);
      case "waiting_qa_soru":
        return this.soruAl(message, session, data);
      case "waiting_qa_cevap":
        return this.cevapOnayla(message, session, data);
      default:
        return false;
    }
  }

  /**
   * Adım 1: Kategori al
   */
  async kategoriAl(message, session, data) {
    const kategoriMatch = message.content.match(/<#(\d+)>/);
    if (!kategoriMatch) {
      await message.reply({ embeds: [hataEmbed("Geçersiz Kategori", "Lütfen bir kategori etiketleyin. Örnek: `#destek`")] });
      return true;
    }

    const kategoriId = kategoriMatch[1];
    const kategori = message.guild.channels.cache.get(kategoriId);

    if (!kategori || kategori.type !== 4) { // 4 = GUILD_CATEGORY
      await message.reply({ embeds: [hataEmbed("Geçersiz Kategori", "Etiketlenen bir **kategori** olmalıdır (kanal değil).")] });
      return true;
    }

    data.ticket_category_id = kategoriId;

    this.db.updateSetupSession(message.guild.id, {
      step: "waiting_no_answer_channel",
      data: JSON.stringify(data)
    });

    await message.reply({
      embeds: [kurulumEmbed(
        "✅ Kategori Kaydedildi",
        `Ticket kategorisi: **${kategori.name}**\n\n**Adım 2/3:** "Cevabı olmayan sorular" kanalını etiketleyin.\nÖrnek: \`#cevapsiz-sorular\``,
        [],
        2, 3
      )]
    });
    return true;
  }

  /**
   * Adım 2: No-answer kanalı al
   */
  async kanalAl(message, session, data) {
    const kanalMatch = message.content.match(/<#(\d+)>/);
    if (!kanalMatch) {
      await message.reply({ embeds: [hataEmbed("Geçersiz Kanal", "Lütfen bir metin kanalı etiketleyin.")] });
      return true;
    }

    const kanalId = kanalMatch[1];
    const kanal = message.guild.channels.cache.get(kanalId);

    if (!kanal || kanal.type !== 0) { // 0 = GUILD_TEXT
      await message.reply({ embeds: [hataEmbed("Geçersiz Kanal", "Etiketlenen bir **metin kanalı** olmalıdır.")] });
      return true;
    }

    data.no_answer_channel_id = kanalId;

    // Guild'e kaydet
    this.db.updateGuild(message.guild.id, {
      ticket_category_id: data.ticket_category_id,
      no_answer_channel_id: kanalId,
      setup_completed: 0 // Henüz QA eklenmedi
    });

    this.db.updateSetupSession(message.guild.id, {
      step: "waiting_qa_soru",
      data: JSON.stringify(data)
    });

    await message.reply({
      embeds: [kurulumEmbed(
        "✅ Kanal Kaydedildi",
        `Cevapsız sorular kanalı: **${kanal.name}**\n\n**Adım 3/3:** Sık sorulan soruları ekleyelim.\n\n**İlk soruyu yazın** (veya **atla** yazın):`,
        [],
        3, 3
      )]
    });
    return true;
  }

  /**
   * Adım 3a: Soru al
   */
  async soruAl(message, session, data) {
    if (message.content.toLowerCase() === "atla") {
      return this.bitir(message, session);
    }

    if (message.content.length > 500) {
      await message.reply({ embeds: [hataEmbed("Çok Uzun", "Soru en fazla 500 karakter olabilir.")] });
      return true;
    }

    data.current_soru = message.content;

    this.db.updateSetupSession(message.guild.id, {
      step: "waiting_qa_cevap",
      data: JSON.stringify(data)
    });

    await message.reply({
      embeds: [kurulumEmbed(
        "📝 Soru Kaydedildi",
        `**Soru:** ${message.content}\n\nŞimdi bu soruya verilecek **cevabı yazın**:`,
        [],
        3, 3
      )]
    });
    return true;
  }

  /**
   * Adım 3b: Cevap al ve AI onayı iste
   */
  async cevapOnayla(message, session, data) {
    const hamCevap = message.content;
    const soru = data.current_soru;

    if (hamCevap.length > 4000) {
      await message.reply({ embeds: [hataEmbed("Çok Uzun", "Cevap en fazla 4000 karakter olabilir.")] });
      return true;
    }

    // AI ile geliştir
    const { CevapGelistirici } = require("../ai");
    const ai = new CevapGelistirici();
    const gelistirilmisCevap = ai.gelistir(hamCevap, soru, "tr");

    // Training session oluştur
    const trainingId = this.db.createTrainingSession(message.guild.id, message.author.id, soru);
    this.db.updateTrainingSession(trainingId, {
      asama: "onay_bekleniyor",
      ham_cevap: hamCevap,
      ai_cevap: gelistirilmisCevap
    });

    // Onay mesajı gönder
    const onayMesaji = await message.reply({
      embeds: [{
        color: 0x9933FF,
        title: "🤖 AI Cevabı Geliştirdi",
        description: "**Orijinal cevabınız:**\n```\n" + hamCevap + "\n```\n\n**AI'nın önerdiği versiyon:**\n" + gelistirilmisCevap,
        footer: { text: "Bu cevabı onaylıyor musunuz?" },
        timestamp: new Date()
      }],
      components: [{
        type: 1,
        components: [
          { type: 2, style: 3, label: "✅ Onayla", custom_id: `setup_approve_${trainingId}` },
          { type: 2, style: 4, label: "❌ Reddet (Orijinali Kaydet)", custom_id: `setup_reject_${trainingId}` },
          { type: 2, style: 1, label: "✏️ Kendim Düzenleyeyim", custom_id: `setup_edit_${trainingId}` }
        ]
      }]
    });

    data.current_ham_cevap = hamCevap;
    data.current_ai_cevap = gelistirilmisCevap;
    data.current_training_id = trainingId;
    data.current_onay_mesaji_id = onayMesaji.id;

    this.db.updateSetupSession(message.guild.id, {
      step: "waiting_approval",
      data: JSON.stringify(data)
    });

    return true;
  }

  /**
   * Onay butonu işle
   */
  async onayIsle(interaction) {
    const customId = interaction.customId;
    const parts = customId.split("_");
    const action = parts[1]; // approve, reject, edit
    const trainingId = parseInt(parts[2]);

    const training = this.db.getTrainingSession(trainingId);
    if (!training) {
      await interaction.reply({ content: "❌ Oturum bulunamadı.", ephemeral: true });
      return;
    }

    if (training.user_id !== interaction.user.id) {
      await interaction.reply({ content: "❌ Bu işlemi sadece kurulumu başlatan kişi yapabilir.", ephemeral: true });
      return;
    }

    const session = this.db.getSetupSession(interaction.guild.id);
    if (!session) {
      await interaction.reply({ content: "❌ Kurulum oturumu bulunamadı.", ephemeral: true });
      return;
    }

    const data = JSON.parse(session.data || "{}");

    if (action === "approve") {
      // AI cevabını kaydet
      this.db.addEgitimVerisi(
        interaction.guild.id,
        training.soru,
        training.ai_cevap,
        interaction.user.id,
        "ai_approved",
        interaction.user.id
      );

      this.db.updateTrainingSession(trainingId, { asama: "tamamlandi" });

      const cevapOnizleme = training.ai_cevap.slice(0, 500);
      const aciklama = "Soru ve AI cevabı veritabanına kaydedildi.\n\n**Soru:** " + training.soru + "\n**Cevap:** " + cevapOnizleme;
      await interaction.update({
        embeds: [basariEmbed("✅ Onaylandı", aciklama)],
        components: []
      });

      // Devam/bitir butonları
      const devamMesaji = await interaction.followUp({
        embeds: [kurulumEmbed(
          "✅ Kaydedildi!",
          "Başka bir soru-cevap çifti eklemek ister misiniz?",
          [],
          3, 3
        )],
        components: [butonGruplari.kurulumDevam(interaction.guild.id)]
      });

      data.current_devam_mesaji_id = devamMesaji.id;
      this.db.updateSetupSession(interaction.guild.id, { data: JSON.stringify(data) });

    } else if (action === "reject") {
      // Orijinal cevabı kaydet
      this.db.addEgitimVerisi(
        interaction.guild.id,
        training.soru,
        training.ham_cevap,
        interaction.user.id,
        "manual",
        interaction.user.id
      );

      this.db.updateTrainingSession(trainingId, { asama: "tamamlandi" });

      const hamOnizleme = training.ham_cevap.slice(0, 500);
      const aciklama2 = "Orijinal cevabınız olduğu gibi kaydedildi.\n\n**Soru:** " + training.soru + "\n**Cevap:** " + hamOnizleme;
      await interaction.update({
        embeds: [basariEmbed("✅ Kaydedildi (Orijinal)", aciklama2)],
        components: []
      });

      const devamMesaji = await interaction.followUp({
        embeds: [kurulumEmbed(
          "✅ Kaydedildi!",
          "Başka bir soru-cevap çifti eklemek ister misiniz?",
          [],
          3, 3
        )],
        components: [butonGruplari.kurulumDevam(interaction.guild.id)]
      });

      data.current_devam_mesaji_id = devamMesaji.id;
      this.db.updateSetupSession(interaction.guild.id, { data: JSON.stringify(data) });

    } else if (action === "edit") {
      // Modal aç
      this.db.updateTrainingSession(trainingId, { asama: "duzenleme" });
      await interaction.showModal(modallar.aiCevapDuzenle(trainingId, training.ai_cevap));
    }
  }

  /**
   * Modal düzenleme işle
   */
  async modalDuzenleIsle(interaction) {
    const customId = interaction.customId; // ai_duzenle_<trainingId>
    const trainingId = parseInt(customId.split("_")[2]);

    const training = this.db.getTrainingSession(trainingId);
    if (!training || training.user_id !== interaction.user.id) {
      await interaction.reply({ content: "❌ Yetkisiz.", ephemeral: true });
      return;
    }

    const yeniCevap = interaction.fields.getTextInputValue("ai_cevap");
    this.db.updateTrainingSession(trainingId, { ai_cevap: yeniCevap, asama: "onay_bekleniyor" });

    await interaction.update({
      embeds: [{
        color: 0x9933FF,
        title: "🤖 AI Cevabı Güncellendi",
        description: "**Yeni cevap:**\n" + yeniCevap,
        footer: { text: "Bu haliyle onaylıyor musunuz?" },
        timestamp: new Date()
      }],
      components: [{
        type: 1,
        components: [
          { type: 2, style: 3, label: "✅ Onayla", custom_id: `setup_approve_${trainingId}` },
          { type: 2, style: 4, label: "❌ Reddet", custom_id: `setup_reject_${trainingId}` }
        ]
      }]
    });
  }

  /**
   * Kurulum devam/bitir butonları
   */
  async devamButonIsle(interaction) {
    const customId = interaction.customId;
    const session = this.db.getSetupSession(interaction.guild.id);

    if (!session || session.user_id !== interaction.user.id) {
      await interaction.reply({ content: "❌ Yetkisiz.", ephemeral: true });
      return;
    }

    if (customId.includes("yeni_soru")) {
      this.db.updateSetupSession(interaction.guild.id, {
        step: "waiting_qa_soru",
        data: JSON.stringify({})
      });

      await interaction.update({
        embeds: [kurulumEmbed(
          "📝 Yeni Soru",
          "Soruyu yazın:",
          [],
          3, 3
        )],
        components: []
      });

    } else if (customId.includes("bitir")) {
      await this.bitir(interaction);
    }
  }

  /**
   * Kurulum bitir
   */
  async bitir(messageOrInteraction) {
    const guild = messageOrInteraction.guild;
    const user = messageOrInteraction.user || messageOrInteraction.author;

    this.db.deleteSetupSession(guild.id);
    this.db.updateGuild(guild.id, { setup_completed: 1 });

    const embed = basariEmbed(
      "🎉 Kurulum Tamamlandı!",
      "Otomasyon başarıyla kuruldu!\n\n**Artık kullanıcılar:**\n" +
      "• `otomasyon <soru>` yazarak soru sorabilir\n" +
      "• Yetkilileri etiketleyerek ticket açabilir\n" +
      "• Cevapsız sorular belirlenen kanala gidecek"
    );

    if (messageOrInteraction.reply) {
      await messageOrInteraction.reply({ embeds: [embed] });
    } else {
      await messageOrInteraction.update({ embeds: [embed], components: [] });
    }

    // Sahip log
    this.sahipLog(guild, user, "Kurulum tamamlandı");
  }

  /**
   * Sahip log gönder
   */
  async sahipLog(guild, user, action) {
    try {
      const config = require("../../config");
      const logChannel = this.bot.channels.cache.get(config.OWNER_LOG_CHANNEL);
      if (logChannel) {
        await logChannel.send({
          embeds: [{
            color: 0x00FF00,
            title: "📋 Otomasyon Log",
            description: `**Sunucu:** ${guild.name} (${guild.id})\n**İşlem:** ${action}\n**Yapan:** ${user.tag} (${user.id})`,
            timestamp: new Date()
          }]
        });
      }
    } catch (e) {}
  }
}

module.exports = SetupHandler;