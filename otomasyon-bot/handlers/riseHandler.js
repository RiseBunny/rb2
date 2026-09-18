/**
 * Rise Handler - "otomasyon <soru>" komutu işleyici
 * Ana AI sohbet motoru
 */

const { cevapEmbed, cevapYokEmbed, bilgiEmbed } = require("../utils/embeds");
const { butonGruplari } = require("../utils/buttons");
const { DilAlgilayici, CevapGelistirici } = require("../ai");

class RiseHandler {
  constructor(db, bot) {
    this.db = db;
    this.bot = bot;
    this.dilAlgilayici = new DilAlgilayici(db);
    this.cevapGelistirici = new CevapGelistirici();
    this.cooldowns = new Map();
  }

  /**
   * Mesaj işle - ana giriş noktası
   */
  async isle(message) {
    // Bot mesajlarını yoksay
    if (message.author.bot) return false;

    // DM'de mi?
    const isDM = !message.guild;

    // Prefix kontrolü
    const prefix = "otomasyon ";
    if (!message.content.toLowerCase().startsWith(prefix)) return false;

    // Soruyu al
    const soru = message.content.slice(prefix.length).trim();
    if (!soru) {
      await message.reply({
        embeds: [bilgiEmbed("🤖 Merhaba!", "Bana bir soru sorun: `otomasyon <soru>`\nÖrn: `otomasyon şifremi nasıl değiştiririm?`")]
      });
      return true;
    }

    // Cooldown kontrolü (3 saniye)
    const cooldownKey = `${message.author.id}_${message.guild?.id || "dm"}`;
    const now = Date.now();
    const lastUsed = this.cooldowns.get(cooldownKey) || 0;
    if (now - lastUsed < 3000) {
      const kalan = Math.ceil((3000 - (now - lastUsed)) / 1000);
      await message.reply({ content: `⏳ Lütfen **${kalan} saniye** bekleyin.`, allowedMentions: { repliedUser: false } });
      return true;
    }
    this.cooldowns.set(cooldownKey, now);

    // Sunucu varsa guild data al
    let guildData = null;
    if (message.guild) {
      guildData = this.db.getGuild(message.guild.id);
    }

    // Dil algıla
    const dil = await this.dilAlgilayici.algila(message);

    // Eğer sunucu kurulu değilse
    if (message.guild && (!guildData || !guildData.setup_completed)) {
      await message.reply({
        embeds: [bilgiEmbed("⚙️ Henüz Kurulmamış", "Bu sunucuda Otomasyon henüz kurulmamış. Yönetici `otomasyon` yazarak kurabilir.")]
      });
      return true;
    }

    // Cevap ara (sunucu varsa sunucuya özel, yoksa genel)
    let sonuc = null;
    if (message.guild) {
      sonuc = await this.bot.soruEslestirici.bul(message.guild.id, soru);
    }

    // Cevap bulunduysa
    if (sonuc) {
      this.db.incrementKullanim(sonuc.id);

      const kaynakEtiketleri = {
        manual: "👤 Manuel",
        ai_approved: "🤖 AI Onaylı",
        user_feedback: "👍 Kullanıcı Onayı",
        community: "🌐 Topluluk"
      };

      await message.reply({
        embeds: [{
          color: 0x0099FF,
          title: "🔍 Cevap Bulundu",
          description: sonuc.cevap,
          fields: [
            { name: "📌 Kaynak", value: kaynakEtiketleri[sonuc.kaynak] || sonuc.kaynak, inline: true },
            { name: "🎯 Benzerlik", value: `%${Math.round(sonuc.skor * 100)}`, inline: true }
          ],
          footer: { text: dil === "en" ? "Was this helpful?" : "Bu cevap sorunuzu çözdü mü?" },
          timestamp: new Date()
        }],
        components: [{
          type: 1,
          components: [
            { type: 2, style: 3, label: dil === "en" ? "✅ Yes" : "✅ Evet, Teşekkürler", custom_id: `faydali_evet_${sonuc.id}` },
            { type: 2, style: 4, label: dil === "en" ? "❌ No" : "❌ Hayır, Çözmedi", custom_id: `faydali_hayir_${sonuc.id}` }
          ]
        }]
      });
      return true;
    }

    // Cevap yoksa
    if (message.guild) {
      // Ticket öner
      await message.reply({
        embeds: [{
          color: 0xFFAA00,
          title: "🤔 Cevap Bulunamadı",
          description: `**Sorunuz:** "${soru}"\n\nBu soruya özel bir cevabım yok. Size daha iyi yardımcı olabilmem için ticket açmamı ister misiniz?`,
          footer: { text: dil === "en" ? "Open a ticket for personalized help" : "Yetkili ekibimiz size yardımcı olacak" },
          timestamp: new Date()
        }],
        components: [{
          type: 1,
          components: [
            { type: 2, style: 1, label: "🎫 Ticket Aç", custom_id: `rise_ticket_ac_${message.id}` },
            { type: 2, style: 2, label: dil === "en" ? "❌ Cancel" : "❌ İptal", custom_id: `rise_ticket_iptal_${message.id}` }
          ]
        }]
      });
    } else {
      // DM'de - genel bilgi ver
      await message.reply({
        embeds: [{
          color: 0x0099FF,
          title: "🤖 Otomasyon",
          description: `Bu soruya cevabım yok. Destek sunucumuzda yardım alabilirsiniz: https://discord.gg/otomasyon`,
          timestamp: new Date()
        }]
      });
    }

    return true;
  }

  /**
   * Ticket aç butonu
   */
  async ticketAcButon(interaction) {
    const messageId = interaction.customId.split("_").pop();
    const soru = interaction.message.embeds[0]?.fields?.[0]?.value?.replace("**Sorunuz:** \"", "").replace("\"", "") || "Soru belirtilmemiş";

    const channel = await this.bot.ticketHandler.ac(interaction.guild, interaction.user, soru, interaction.channel);

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
        embeds: [hataEmbed("Hata", "Ticket açılamadı. Kurulum tamamlanmamış olabilir.")],
        components: []
      });
    }
  }

  /**
   * Ticket iptal butonu
   */
  async ticketIptalButon(interaction) {
    await interaction.update({
      embeds: [bilgiEmbed("İptal Edildi", "Ticket açma işlemi iptal edildi. Başka bir sorunuz olursa yazın.")],
      components: []
    });
  }

  /**
   * Buton işleyici
   */
  async butonIsle(interaction) {
    const customId = interaction.customId;

    if (customId.startsWith("rise_ticket_ac_")) {
      return this.ticketAcButon(interaction);
    } else if (customId.startsWith("rise_ticket_iptal_")) {
      return this.ticketIptalButon(interaction);
    }

    return false;
  }
}

module.exports = RiseHandler;