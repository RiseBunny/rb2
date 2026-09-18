/**
 * Modal Şablonları
 * Tutarlı modal formları için merkezi oluşturucular
 */

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

function modalOlustur(customId, title, inputs) {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title);

  for (const input of inputs) {
    const row = new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(input.id)
        .setLabel(input.label)
        .setStyle(input.style || TextInputStyle.Short)
        .setPlaceholder(input.placeholder || null)
        .setRequired(input.required !== false)
        .setValue(input.value || null)
        .setMinLength(input.minLength || 0)
        .setMaxLength(input.maxLength || (input.style === TextInputStyle.Paragraph ? 4000 : 200))
    );
    modal.addComponents(row);
  }

  return modal;
}

// Önceden tanımlı modallar
const modallar = {
  // AI cevap düzenleme modalı
  aiCevapDuzenle: (sessionId, mevcutCevap = "") => modalOlustur(
    `ai_duzenle_${sessionId}`,
    "🤖 AI Cevabı Düzenle",
    [
      {
        id: "ai_cevap",
        label: "Düzenlenmiş Cevap",
        style: TextInputStyle.Paragraph,
        placeholder: "Buraya düzenlenmiş cevabı yazın...",
        value: mevcutCevap,
        required: true,
        maxLength: 4000
      }
    ]
  ),

  // Topluluk cevap verme modalı
  toplulukCevapVer: (communityId) => modalOlustur(
    `community_cevap_${communityId}`,
    "💬 Topluluk Cevabı Ver",
    [
      {
        id: "community_cevap",
        label: "Cevabınız",
        style: TextInputStyle.Paragraph,
        placeholder: "Buraya cevabı yazın...",
        required: true,
        maxLength: 4000
      }
    ]
  ),

  // Kurulum soru ekleme modalı
  kurulumSoru: (guildId) => modalOlustur(
    `kurulum_soru_${guildId}`,
    "📝 Soru Ekle",
    [
      {
        id: "kurulum_soru",
        label: "Soru",
        style: TextInputStyle.Short,
        placeholder: "Örn: Şifremi nasıl değiştiririm?",
        required: true,
        maxLength: 200
      }
    ]
  ),

  // Kurulum cevap ekleme modalı
  kurulumCevap: (guildId) => modalOlustur(
    `kurulum_cevap_${guildId}`,
    "📝 Cevap Ekle",
    [
      {
        id: "kurulum_cevap",
        label: "Cevap",
        style: TextInputStyle.Paragraph,
        placeholder: "Buraya cevabı yazın...",
        required: true,
        maxLength: 4000
      }
    ]
  ),

  // Ticket cevap verme modalı
  ticketCevap: (ticketId) => modalOlustur(
    `ticket_cevap_${ticketId}`,
    "🎫 Ticket Cevabı",
    [
      {
        id: "ticket_cevap",
        label: "Cevabınız",
        style: TextInputStyle.Paragraph,
        placeholder: "Kullanıcıya gönderilecek cevabı yazın...",
        required: true,
        maxLength: 4000
      }
    ]
  ),

  // Sunucu dil ayarı modalı
  dilAyari: (guildId) => modalOlustur(
    `dil_ayari_${guildId}`,
    "🌍 Sunucu Dili Ayarla",
    [
      {
        id: "dil_kodu",
        label: "Dil Kodu (tr/en)",
        style: TextInputStyle.Short,
        placeholder: "tr veya en",
        value: "tr",
        required: true,
        maxLength: 2
      }
    ]
  ),

  // Admin rol ayarı modalı
  adminRolAyari: (guildId) => modalOlustur(
    `admin_rol_${guildId}`,
    "🛡️ Admin Rolü Ayarla",
    [
      {
        id: "admin_rol_id",
        label: "Rol ID",
        style: TextInputStyle.Short,
        placeholder: "Rol ID'sini yapıştırın",
        required: true,
        maxLength: 20
      }
    ]
  ),

  // Premium aktivasyon modalı (sahip için)
  premiumAktivasyon: (guildId) => modalOlustur(
    `premium_aktivasyon_${guildId}`,
    "💎 Premium Aktivasyon",
    [
      {
        id: "premium_gun",
        label: "Süre (Gün)",
        style: TextInputStyle.Short,
        placeholder: "30",
        value: "30",
        required: true,
        maxLength: 4
      }
    ]
  )
};

function inputOlustur(id, label, style = TextInputStyle.Short, options = {}) {
  return new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setPlaceholder(options.placeholder || null)
    .setRequired(options.required !== false)
    .setValue(options.value || null)
    .setMinLength(options.minLength || 0)
    .setMaxLength(options.maxLength || (style === TextInputStyle.Paragraph ? 4000 : 200));
}

module.exports = {
  modalOlustur,
  modallar,
  inputOlustur,
  TextInputStyle
};