/**
 * Ticket Handler - Ticket yönetimi (açma, kapatma, cevap verme)
 */

const { ticketEmbed, basariEmbed, hataEmbed, bilgiEmbed } = require("../utils/embeds");
const { butonGruplari } = require("../utils/buttons");
const { modallar } = require("../utils/modals");
const { CevapGelistirici } = require("../ai");

class TicketHandler {
  constructor(db, bot) {
    this.db = db;
    this.bot = bot;
    this.ai = new CevapGelistirici();
  }

  /**
   * Ticket aç (kullanıcı veya admin talep ettiğinde)
   */
  async ac(guild, kullanici, soru, channel = null) {
    const guildData = this.db.getGuild(guild.id);
    if (!guildData?.setup_completed) return null;
    if (!guildData.ticket_category_id) return null;

    const category = guild.channels.cache.get(guildData.ticket_category_id);
    if (!category || category.type !== 4) return null;

    // Kullanıcının zaten açık ticket'ı var mı?
    const acikTicketlar = this.db.getOpenTickets(guild.id);
    const mevcut = acikTicketlar.find(t => t.kullanici_id === kullanici.id);
    if (mevcut) {
      const mevcutChannel = guild.channels.cache.get(mevcut.channel_id);
      if (mevcutChannel) return mevcutChannel;
    }

    // Ticket kanalı oluştur
    const ticketName = `ticket-${kullanici.username}-${Date.now().toString(36)}`;
    
    const ticketChannel = await guild.channels.create({
      name: ticketName,
      type: 0, // GUILD_TEXT
      parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: ["ViewChannel"] },
        { id: kullanici.id, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"] },
        { id: this.bot.user.id, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory", "ManageChannels"] }
      ],
      topic: `Ticket: ${soru.slice(0, 100)} | Kullanıcı: ${kullanici.id}`
    });

    // Admin rolü varsa ekle
    if (guildData.admin_role_id) {
      const adminRole = guild.roles.cache.get(guildData.admin_role_id);
      if (adminRole) {
        await ticketChannel.permissionOverwrites.edit(adminRole.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      }
    }

    // DB'ye kaydet
    const ticketId = this.db.createTicket(guild.id, ticketChannel.id, kullanici.id, soru);

    // Ticket embed'i gönder
    await ticketChannel.send({
      embeds: [{
        color: 0x00FFFF,
        title: `🎫 Ticket #${ticketId}`,
        description: `**Soran:** <@${kullanici.id}> (${kullanici.tag})\n**Soru:** ${soru}`,
        fields: [
          { name: "🕐 Açılış", value: new Date().toLocaleString("tr-TR"), inline: true },
          { name: "📊 Durum", value: "🟢 Açık", inline: true }
        ],
        footer: { text: "Otomasyon Ticket Sistemi" },
        timestamp: new Date()
      }],
      components: [butonGruplari.ticketKapat(ticketChannel.id)]
    });

    // Kullanıcıya DM at (eğer kanalda değilse)
    if (channel && channel.id !== ticketChannel.id) {
      try {
        await kullanici.send({
          embeds: [{
            color: 0x00FFFF,
            title: "🎫 Ticket Açıldı",
            description: `**Sunucu:** ${guild.name}\n**Ticket:** <#${ticketChannel.id}>\n**Sorunuz:** ${soru}`,
            footer: { text: "Yetkili ekibimiz en kısa sürede yanıtlayacak." },
            timestamp: new Date()
          }]
        }).catch(() => {});
      } catch (e) {}
    }

    // No-answer kanalına bildirim gönder
    if (guildData.no_answer_channel_id) {
      const noAnswerChannel = guild.channels.cache.get(guildData.no_answer_channel_id);
      if (noAnswerChannel) {
        const msg = await noAnswerChannel.send({
          embeds: [{
            color: 0xFFAA00,
            title: "❓ Yeni Cevapsız Soru",
            description: `**Soran:** <@${kullanici.id}> (${kullanici.tag})\n**Soru:** ${soru}\n**Ticket:** <#${ticketChannel.id}>`,
            footer: { text: "Yetkililer cevap verebilir" },
            timestamp: new Date()
          }],
          components: [butonGruplari.toplulukCevap(ticketId)]
        });

        this.db.createCommunityAnswer(guild.id, msg.id, soru, kullanici.id);
      }
    }

    return ticketChannel;
  }

  /**
   * Ticket kapat
   */
  async kapat(channel, kapatan) {
    const ticket = this.db.getTicketByChannel(channel.id);
    if (!ticket) return false;

    if (ticket.durum !== "acik") return false;

    // Yetki kontrolü
    const guild = channel.guild;
    const member = await guild.members.fetch(kapatan.id).catch(() => null);
    if (!member) return false;

    const guildData = this.db.getGuild(guild.id);
    const isAdmin = member.permissions.has("Administrator") ||
      (guildData?.admin_role_id && member.roles.cache.has(guildData.admin_role_id)) ||
      ticket.kullanici_id === kapatan.id;

    if (!isAdmin) return false;

    // Cevap modalı aç (eğer cevaplanmamışsa)
    if (ticket.durum === "acik") {
      await kapatan.send({
        embeds: [{
          color: 0x0099FF,
          title: "🎫 Ticket Kapatma",
          description: `Ticket kapatılıyor: <#${channel.id}>\n\nKullanıcıya cevap vermek ister misiniz?`,
          timestamp: new Date()
        }],
        components: [{
          type: 1,
          components: [
            { type: 2, style: 1, label: "✏️ Cevap Yaz ve Kapat", custom_id: `ticket_cevap_kapat_${channel.id}` },
            { type: 2, style: 4, label: "🔒 Sadece Kapat", custom_id: `ticket_sadece_kapat_${channel.id}` }
          ]
        }]
      }).catch(() => {});
    }

    return true;
  }

  /**
   * Ticket cevap ver ve kapat
   */
  async cevapVeKapat(interaction) {
    const channelId = interaction.customId.split("_").pop();
    const channel = interaction.channel;
    const ticket = this.db.getTicketByChannel(channelId);

    if (!ticket) {
      await interaction.reply({ content: "❌ Ticket bulunamadı.", ephemeral: true });
      return;
    }

    // Modal aç
    await interaction.showModal(modallar.ticketCevap(channelId));
  }

  /**
   * Ticket sadece kapat
   */
  async sadeceKapat(interaction) {
    const channelId = interaction.customId.split("_").pop();
    const channel = interaction.channel;
    const ticket = this.db.getTicketByChannel(channelId);

    if (!ticket) {
      await interaction.reply({ content: "❌ Ticket bulunamadı.", ephemeral: true });
      return;
    }

    this.db.closeTicket(channelId, interaction.user.id, null);

    await interaction.update({
      embeds: [basariEmbed("🔒 Ticket Kapatıldı", "Ticket cevapsız kapatıldı.")],
      components: []
    });

    // Kanalı sil (5 saniye sonra)
    setTimeout(() => {
      channel.delete("Ticket kapatıldı").catch(() => {});
    }, 5000);
  }

  /**
   * Modal cevap işle
   */
  async modalCevapIsle(interaction) {
    const channelId = interaction.customId.split("_").pop();
    const channel = interaction.channel;
    const ticket = this.db.getTicketByChannel(channelId);

    if (!ticket) {
      await interaction.reply({ content: "❌ Ticket bulunamadı.", ephemeral: true });
      return;
    }

    const cevap = interaction.fields.getTextInputValue("ticket_cevap");

    // Kullanıcıya DM at
    try {
      const kullanici = await this.bot.users.fetch(ticket.kullanici_id);
      await kullanici.send({
        embeds: [{
          color: 0x00FF00,
          title: "🎫 Ticket Cevaplandı",
          description: `**Sunucu:** ${interaction.guild.name}\n**Sorunuz:** ${ticket.soru}\n\n**Cevap:**\n${cevap}`,
          footer: { text: "Sorunuz çözüldü mü?" },
          timestamp: new Date()
        }],
        components: [{
          type: 1,
          components: [
            { type: 2, style: 3, label: "✅ Çözüldü", custom_id: `ticket_cozuldu_${channelId}` },
            { type: 2, style: 4, label: "❌ Çözülmedi", custom_id: `ticket_cozulmedi_${channelId}` }
          ]
        }]
      }).catch(() => {});
    } catch (e) {}

    // DB güncelle
    this.db.closeTicket(channelId, interaction.user.id, cevap);

    const cevapOnizleme = cevap.slice(0, 1000);
    const aciklama3 = "Cevap kullanıcıya DM olarak gönderildi ve ticket kapatıldı.\n\n**Cevap:** " + cevapOnizleme;
    await interaction.update({
      embeds: [basariEmbed("✅ Cevap Gönderildi", aciklama3)],
      components: []
    });

    // No-answer kanalındaki mesajı güncelle
    this.noAnswerGuncelle(interaction.guild, ticket.id, "cevaplandi");

    // Kanalı sil (10 saniye sonra)
    setTimeout(() => {
      channel.delete("Ticket cevaplandı").catch(() => {});
    }, 10000);
  }

  /**
   * Kullanıcı "Çözüldü" butonu
   */
  async cozulduIsle(interaction) {
    const channelId = interaction.customId.split("_").pop();
    
    await interaction.update({
      embeds: [basariEmbed("🎉 Harika!", "Sorununuz çözüldüğü için mutluyuz! Başka sorunuz olursa tekrar ticket açabilirsiniz.")],
      components: []
    });
  }

  /**
   * Kullanıcı "Çözülmedi" butonu
   */
  async cozulmediIsle(interaction) {
    const channelId = interaction.customId.split("_").pop();
    
    await interaction.update({
      embeds: [{
        color: 0xFFAA00,
        title: "😔 Anlaşıldı",
        description: "Sorununuz henüz çözülmedi. Ticket'ı yeniden açmamı ister misiniz?",
        timestamp: new Date()
      }],
      components: [{
        type: 1,
        components: [
          { type: 2, style: 1, label: "🔄 Yeniden Aç", custom_id: `ticket_yeniden_ac_${channelId}` },
          { type: 2, style: 2, label: "❌ İptal", custom_id: `ticket_iptal_${channelId}` }
        ]
      }]
    });
  }

  /**
   * No-answer kanalındaki embed'i güncelle
   */
  async noAnswerGuncelle(guild, ticketId, durum) {
    const guildData = this.db.getGuild(guild.id);
    if (!guildData?.no_answer_channel_id) return;

    const channel = guild.channels.cache.get(guildData.no_answer_channel_id);
    if (!channel) return;

    // Community answer kaydını bul
    // Bu basit bir implementasyon, gerçekte message_id ile eşleşmeli
  }

  /**
   * Buton işleyicileri
   */
  async butonIsle(interaction) {
    const customId = interaction.customId;

    if (customId.startsWith("ticket_kapat_")) {
      return this.kapat(interaction.channel, interaction.user);
    } else if (customId.startsWith("ticket_cevap_kapat_")) {
      return this.cevapVeKapat(interaction);
    } else if (customId.startsWith("ticket_sadece_kapat_")) {
      return this.sadeceKapat(interaction);
    } else if (customId.startsWith("ticket_cozuldu_")) {
      return this.cozulduIsle(interaction);
    } else if (customId.startsWith("ticket_cozulmedi_")) {
      return this.cozulmediIsle(interaction);
    } else if (customId.startsWith("ticket_yeniden_ac_")) {
      return this.yenidenAc(interaction);
    }

    return false;
  }

  async yenidenAc(interaction) {
    const channelId = interaction.customId.split("_").pop();
    const ticket = this.db.getTicketByChannel(channelId);
    if (!ticket) return;

    this.db.updateTicketStatus(channelId, "acik");

    await interaction.update({
      embeds: [bilgiEmbed("🔄 Ticket Yeniden Açıldı", "Yetkili ekibi tekrar ilgilenecek.")],
      components: [butonGruplari.ticketKapat(channelId)]
    });
  }
}

module.exports = TicketHandler;