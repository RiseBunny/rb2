/**
 * Interaction Create Event - Buton, Modal, Select Menu işleyici
 */

const { hataEmbed, basariEmbed } = require("../utils/embeds");

module.exports = async (interaction, client) => {
  try {
    // Buton etkileşimi
    if (interaction.isButton()) {
      await butonIsle(interaction, client);
      return;
    }

    // Modal gönderimi
    if (interaction.isModalSubmit()) {
      await modalIsle(interaction, client);
      return;
    }

    // Select menu
    if (interaction.isStringSelectMenu()) {
      await selectMenuIsle(interaction, client);
      return;
    }

  } catch (error) {
    console.error("[InteractionCreate Hatası]:", error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [hataEmbed("Hata", "İşlem sırasında bir hata oluştu.")], ephemeral: true }).catch(() => {});
    }
  }
};

/**
 * Buton işleyici
 */
async function butonIsle(interaction, client) {
  const customId = interaction.customId;

  // ═══════════════════════════════════════════════
  // SETUP BUTONLARI
  // ═══════════════════════════════════════════════
  if (customId.startsWith("setup_")) {
    return client.handlers.setup.onayIsle(interaction);
  }
  if (customId.startsWith("kurulum_")) {
    return client.handlers.setup.devamButonIsle(interaction);
  }

  // ═══════════════════════════════════════════════
  // TRAINING BUTONLARI
  // ═══════════════════════════════════════════════
  if (customId.startsWith("training_")) {
    return client.handlers.training.butonIsle(interaction);
  }
  if (customId.startsWith("faydali_")) {
    return client.handlers.training.faydaliIsle(interaction);
  }

  // ═══════════════════════════════════════════════
  // TICKET BUTONLARI
  // ═══════════════════════════════════════════════
  if (customId.startsWith("ticket_")) {
    return client.handlers.ticket.butonIsle(interaction);
  }

  // ═══════════════════════════════════════════════
  // COMMUNITY BUTONLARI
  // ═══════════════════════════════════════════════
  if (customId.startsWith("community_")) {
    return client.handlers.community.butonIsle(interaction);
  }

  // ═══════════════════════════════════════════════
  // RISE HANDLER BUTONLARI
  // ═══════════════════════════════════════════════
  if (customId.startsWith("rise_")) {
    return client.handlers.rise.butonIsle(interaction);
  }

  // ═══════════════════════════════════════════════
  // SIFIRLA ONAY
  // ═══════════════════════════════════════════════
  if (customId.startsWith("sifirla_onay_")) {
    const guildId = customId.split("_")[2];
    if (interaction.guild.id !== guildId) return;
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ Yetkiniz yok.", ephemeral: true });
    }

    // Tüm verileri sil
    client.db.prepare("DELETE FROM egitim_verisi WHERE guild_id = ?").run(guildId);
    client.db.prepare("DELETE FROM tickets WHERE guild_id = ?").run(guildId);
    client.db.prepare("DELETE FROM community_answers WHERE guild_id = ?").run(guildId);
    client.db.prepare("DELETE FROM setup_sessions WHERE guild_id = ?").run(guildId);
    client.db.prepare("DELETE FROM ai_training_sessions WHERE guild_id = ?").run(guildId);
    client.db.updateGuild(guildId, { 
      setup_completed: 0, 
      ticket_category_id: null, 
      no_answer_channel_id: null,
      admin_role_id: null,
      language: "tr"
    });

    await interaction.update({
      embeds: [basariEmbed("✅ Sıfırlandı", "Tüm veriler silindi. Yeniden kurulum için `otomasyon` yazın.")],
      components: []
    });
    return;
  }
  if (customId.startsWith("sifirla_iptal_")) {
    await interaction.update({
      embeds: [basariEmbed("İptal Edildi", "Sıfırlama işlemi iptal edildi.")],
      components: []
    });
    return;
  }

  // ═══════════════════════════════════════════════
  // DİL SEÇİM
  // ═══════════════════════════════════════════════
  if (customId.startsWith("dil_")) {
    const parts = customId.split("_");
    const dil = parts[1];
    const guildId = parts[2];
    
    if (interaction.guild.id !== guildId) return;
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply({ content: "❌ Yetkiniz yok.", ephemeral: true });
    }

    if (!["tr", "en"].includes(dil)) return;
    
    client.db.updateGuild(guildId, { language: dil });
    const dilAdi2 = dil === "tr" ? "Türkçe" : "English";
    const dilMesaj2 = "Sunucu dili **" + dilAdi2 + "** olarak ayarlandı.";
    await interaction.update({
      embeds: [basariEmbed("✅ Dil Ayarlandı", dilMesaj2)],
      components: []
    });
    return;
  }

  // ═══════════════════════════════════════════════
  // ADMIN TICKET BUTONLARI
  // ═══════════════════════════════════════════════
  if (customId.startsWith("admin_ticket_ac_")) {
    const messageId = customId.split("_").pop();
    const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (!message) return interaction.reply({ content: "❌ Mesaj bulunamadı.", ephemeral: true });

    const soru = message.embeds[0]?.fields?.[0]?.value?.replace("**Sorunuz:** \"", "").replace("\"", "") || "Soru belirtilmemiş";
    const channel = await client.handlers.ticket.ac(interaction.guild, interaction.user, soru, interaction.channel);

    if (channel) {
      await interaction.update({
        embeds: [{
          color: 0x00FF00,
          title: "🎫 Ticket Açıldı",
          description: `Ticket kanalı: <#${channel.id}>\nYetkili ekibimiz en kısa sürede yanıtlayacak.`,
          timestamp: new Date()
        }],
        components: []
      });
    } else {
      await interaction.update({
        embeds: [hataEmbed("Hata", "Ticket açılamadı.")],
        components: []
      });
    }
    return;
  }
  if (customId.startsWith("admin_ticket_iptal_")) {
    await interaction.update({
      embeds: [basariEmbed("İptal Edildi", "Ticket açma işlemi iptal edildi.")],
      components: []
    });
    return;
  }
}

/**
 * Modal işleyici
 */
async function modalIsle(interaction, client) {
  const customId = interaction.customId;

  // AI cevap düzenleme
  if (customId.startsWith("ai_duzenle_")) {
    return client.handlers.setup.modalDuzenleIsle(interaction);
  }

  // Topluluk cevap verme
  if (customId.startsWith("community_cevap_")) {
    return client.handlers.community.modalCevapIsle(interaction);
  }

  // Ticket cevap verme
  if (customId.startsWith("ticket_cevap_")) {
    return client.handlers.ticket.modalCevapIsle(interaction);
  }
}

/**
 * Select Menu işleyici
 */
async function selectMenuIsle(interaction, client) {
  // Gelecekte select menu eklenecekse buraya
}