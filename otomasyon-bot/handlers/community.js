/**
 * Community Handler - Topluluk cevapları (no_answer kanalı)
 */

const { basariEmbed, hataEmbed, bilgiEmbed } = require("../utils/embeds");
const { modallar } = require("../utils/modals");
const { CevapGelistirici } = require("../ai");

class CommunityHandler {
  constructor(db, bot) {
    this.db = db;
    this.bot = bot;
    this.ai = new CevapGelistirici();
  }

  /**
   * "Cevap Ver" butonu işle
   */
  async cevapVerButon(interaction) {
    const communityId = interaction.customId.split("_").pop();
    const community = this.db.getCommunityAnswerByMessage(interaction.message.id);

    if (!community) {
      await interaction.reply({ content: "❌ Kayıt bulunamadı.", ephemeral: true });
      return;
    }

    if (community.durum === "cevaplandi") {
      await interaction.reply({ content: "❌ Bu soru zaten cevaplandı.", ephemeral: true });
      return;
    }

    // Modal aç
    await interaction.showModal(modallar.toplulukCevapVer(communityId));
  }

  /**
   * Modal cevap işle
   */
  async modalCevapIsle(interaction) {
    const communityId = interaction.customId.split("_").pop();
    const community = this.db.getCommunityAnswerByMessage(interaction.message.id);

    if (!community) {
      await interaction.reply({ content: "❌ Kayıt bulunamadı.", ephemeral: true });
      return;
    }

    if (community.durum === "cevaplandi") {
      await interaction.reply({ content: "❌ Bu soru zaten cevaplandı.", ephemeral: true });
      return;
    }

    const cevap = interaction.fields.getTextInputValue("community_cevap");

    // Cevabı eğitim verisine ekle (kaynak: community)
    this.db.addEgitimVerisi(
      interaction.guild.id,
      community.soru,
      cevap,
      interaction.user.id,
      "community",
      null // onaylayan yok, topluluk cevabı
    );

    // Community answer güncelle
    this.db.updateCommunityAnswer(interaction.message.id, {
      cevaplayan_id: interaction.user.id,
      cevap: cevap,
      durum: "cevaplandi"
    });

    // Soran kullanıcıya DM at
    try {
      const soran = await this.bot.users.fetch(community.soran_id);
      await soran.send({
        embeds: [{
          color: 0x00FF00,
          title: "🎉 Sorunuza Cevap Geldi!",
          description: `**Sunucu:** ${interaction.guild.name}\n**Sorunuz:** ${community.soru}\n\n**Cevap:**\n${cevap}`,
          footer: { text: "Bu cevap faydalı oldu mu?" },
          timestamp: new Date()
        }],
        components: [{
          type: 1,
          components: [
            { type: 2, style: 3, label: "✅ Evet, Faydalı", custom_id: `community_faydali_evet_${community.id}` },
            { type: 2, style: 4, label: "❌ Hayır", custom_id: `community_faydali_hayir_${community.id}` }
          ]
        }]
      }).catch(() => {});
    } catch (e) {}

    // Embed'i güncelle
    await interaction.update({
      embeds: [basariEmbed(
        "✅ Cevap Gönderildi",
        `Cevabınız kullanıcıya DM olarak gönderildi ve eğitim verisine eklendi.\n\n**Cevap:** ${cevap.slice(0, 1000)}`
      )],
      components: []
    });

    // Sahip log
    this.sahipLog(interaction.guild, interaction.user, `Topluluk cevabı verdi: ${community.soru.slice(0, 50)}`);
  }

  /**
   * Kullanıcı "Faydalı mı?" butonları
   */
  async faydaliIsle(interaction) {
    const customId = interaction.customId;
    const parts = customId.split("_");
    const faydali = parts[2] === "evet";
    const communityId = parseInt(parts[3]);

    const community = this.db.getCommunityAnswerByMessage(interaction.message.id);
    if (!community || community.id !== communityId) {
      await interaction.reply({ content: "❌ Kayıt bulunamadı.", ephemeral: true });
      return;
    }

    if (faydali) {
      // Eğitim verisini bul ve faydalı sayısını artır
      const egitim = this.db.searchEgitimVerisi(interaction.guild.id, community.soru, 1);
      if (egitim.length > 0) {
        this.db.incrementFaydali(egitim[0].id);
      }

      await interaction.update({
        embeds: [basariEmbed("🎉 Teşekkürler!", "Bu cevabın faydalı olduğunu duyduğuma sevindim!")],
        components: []
      });
    } else {
      await interaction.update({
        embeds: [bilgiEmbed("😔 Anlaşıldı", "Cevap faydalı olmamış. Yetkililer bilgilendirilecek.")],
        components: []
      });

      // Yetkili log kanalına bildir
      this.yetkiliBildir(interaction.guild, community);
    }
  }

  async yetkiliBildir(guild, community) {
    const guildData = this.db.getGuild(guild.id);
    if (!guildData?.admin_role_id) return;

    const adminRole = guild.roles.cache.get(guildData.admin_role_id);
    if (!adminRole) return;

    try {
      await adminRole.send({
        embeds: [{
          color: 0xFFAA00,
          title: "⚠️ Topluluk Cevabı Faydalı Olmadı",
          description: `**Soru:** ${community.soru}\n**Cevaplayan:** <@${community.cevaplayan_id}>\n**Cevap:** ${community.cevap}`,
          footer: { text: "Yetkili müdahalesi gerekebilir" },
          timestamp: new Date()
        }]
      }).catch(() => {});
    } catch (e) {}
  }

  /**
   * Sahip log
   */
  async sahipLog(guild, user, action) {
    try {
      const config = require("../../config");
      const logChannel = this.bot.channels.cache.get(config.OWNER_LOG_CHANNEL);
      if (logChannel) {
        await logChannel.send({
          embeds: [{
            color: 0x00FFFF,
            title: "🌐 Topluluk Log",
            description: `**Sunucu:** ${guild.name} (${guild.id})\n**İşlem:** ${action}\n**Yapan:** ${user.tag} (${user.id})`,
            timestamp: new Date()
          }]
        });
      }
    } catch (e) {}
  }

  /**
   * Buton işleyici
   */
  async butonIsle(interaction) {
    const customId = interaction.customId;

    if (customId.startsWith("community_cevap_")) {
      return this.cevapVerButon(interaction);
    } else if (customId.startsWith("community_faydali_")) {
      return this.faydaliIsle(interaction);
    }

    return false;
  }
}

module.exports = CommunityHandler;