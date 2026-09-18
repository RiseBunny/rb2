/**
 * Buton Şablonları
 * Tutarlı buton stilleri için merkezi buton oluşturucular
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function butonOlustur(butonlar) {
  const row = new ActionRowBuilder();
  for (const btn of butonlar) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(btn.id)
        .setLabel(btn.label)
        .setStyle(btn.style || ButtonStyle.Primary)
        .setEmoji(btn.emoji || null)
        .setDisabled(btn.disabled || false)
    );
  }
  return row;
}

// Önceden tanımlı buton grupları
const butonGruplari = {
  // Onay/Red butonları
  onayRed: (prefix, guildId) => butonOlustur([
    { id: `${prefix}_onay_${guildId}`, label: "✅ Onayla", style: ButtonStyle.Success },
    { id: `${prefix}_red_${guildId}`, label: "❌ Reddet", style: ButtonStyle.Danger }
  ]),

  // Evet/Hayır butonları
  evetHayir: (prefix, guildId) => butonOlustur([
    { id: `${prefix}_evet_${guildId}`, label: "✅ Evet", style: ButtonStyle.Success },
    { id: `${prefix}_hayir_${guildId}`, label: "❌ Hayır", style: ButtonStyle.Danger }
  ]),

  // Ticket aç/Kapat butonları
  ticketAcKapat: (guildId) => butonOlustur([
    { id: `ticket_ac_${guildId}`, label: "🎫 Ticket Aç", style: ButtonStyle.Primary },
    { id: `ticket_iptal_${guildId}`, label: "❌ İptal", style: ButtonStyle.Secondary }
  ]),

  // Ticket kapat butonu
  ticketKapat: (channelId) => butonOlustur([
    { id: `ticket_kapat_${channelId}`, label: "🔒 Ticket'ı Kapat", style: ButtonStyle.Danger }
  ]),

  // Cevap faydalı mı butonları
  faydaliMi: (egitimId) => butonOlustur([
    { id: `faydali_evet_${egitimId}`, label: "✅ Evet, Teşekkürler", style: ButtonStyle.Success },
    { id: `faydali_hayir_${egitimId}`, label: "❌ Hayır, Çözmedi", style: ButtonStyle.Danger }
  ]),

  // Kurulum atla/bitir butonları
  kurulumDevam: (guildId) => butonOlustur([
    { id: `kurulum_yeni_soru_${guildId}`, label: "➕ Yeni Soru Ekle", style: ButtonStyle.Primary },
    { id: `kurulum_bitir_${guildId}`, label: "🏁 Kurulumu Bitir", style: ButtonStyle.Success }
  ]),

  // AI onay butonları
  aiOnay: (sessionId) => butonOlustur([
    { id: `ai_onay_${sessionId}`, label: "✅ Onayla", style: ButtonStyle.Success },
    { id: `ai_red_${sessionId}`, label: "❌ Reddet", style: ButtonStyle.Danger },
    { id: `ai_duzenle_${sessionId}`, label: "✏️ Düzenle", style: ButtonStyle.Primary }
  ]),

  // Topluluk cevap butonu
  toplulukCevap: (communityId) => butonOlustur([
    { id: `community_cevap_${communityId}`, label: "💬 Cevap Ver", style: ButtonStyle.Primary }
  ]),

  // Premium bilgi butonu
  premiumBilgi: (guildId) => butonOlustur([
    { id: `premium_bilgi_${guildId}`, label: "💎 Premium Hakkında", style: ButtonStyle.Primary, emoji: "💎" }
  ]),

  // Dil seçimi butonları
  dilSecim: (guildId) => butonOlustur([
    { id: `dil_tr_${guildId}`, label: "🇹🇷 Türkçe", style: ButtonStyle.Secondary },
    { id: `dil_en_${guildId}`, label: "🇺🇸 English", style: ButtonStyle.Secondary }
  ])
};

function tekButon(id, label, style = ButtonStyle.Primary, emoji = null, disabled = false) {
  return butonOlustur([{ id, label, style, emoji, disabled }]);
}

function linkButon(label, url, emoji = null) {
  const row = new ActionRowBuilder();
  row.addComponents(
    new ButtonBuilder()
      .setLabel(label)
      .setStyle(ButtonStyle.Link)
      .setURL(url)
      .setEmoji(emoji || null)
  );
  return row;
}

module.exports = {
  butonOlustur,
  butonGruplari,
  tekButon,
  linkButon,
  ButtonStyle
};