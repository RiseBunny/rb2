/**
 * RiseBunny — Site iletişim formu cevap akışı
 *
 * Site formundan gelen mesaj sahip loguna "Cevapla" butonu ile düşer.
 * Yetkili (sahip / 2. yetkili / mod) butona basar, modal açar, yanıtı yazar;
 * yanıt kullanıcıya DM olarak gider ve log mesajı "DM gönderildi / hata" ile güncellenir.
 */
const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("croxydb");
const { getLangSync, getLang } = require("../dil");
const { SAHIP_ID, OWNER_LOG, ownerLog } = require("../utils");

const YETKILI_2 = "1310366324731547798";

function yetkiliMi(userId) {
  const id = String(userId || "");
  if (!id) return false;
  if (id === String(SAHIP_ID) || id === YETKILI_2) return true;
  try { const { isMod } = require("../ai/executor"); return isMod(id); } catch { return false; }
}

function metin(lang, tr, en) { return lang === "en" ? en : tr; }

/* İletişim kaydını oluşturur (bot.js /api/contact çağırır). */
function iletisimKaydet(kayit) {
  const id = "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rec = {
    id,
    discordId: String(kayit.discordId || "").replace(/\D/g, "").slice(0, 25),
    username: String(kayit.username || "").slice(0, 60),
    subject: String(kayit.subject || "").slice(0, 120),
    message: String(kayit.message || "").slice(0, 2000),
    lang: kayit.lang === "en" ? "en" : "tr",
    durum: "bekliyor",
    cevaplayan: "",
    logChannelId: OWNER_LOG,
    logMessageId: "",
    at: Date.now()
  };
  try { db.set(`iletisim_${id}`, rec); } catch {}
  return rec;
}

function iletisimGuncelle(rec) { try { db.set(`iletisim_${rec.id}`, rec); } catch {} }

exports.iletisimKaydet = iletisimKaydet;
exports.iletisimGuncelle = iletisimGuncelle;

exports.iletisimEmbed = function (rec) {
  return new EmbedBuilder().setColor("Blue").setTitle("✉️ Site İletişim Formu")
    .addFields(
      { name: "Discord", value: rec.discordId ? `<@${rec.discordId}> (\`${rec.discordId}\`)` : (rec.username || "-"), inline: true },
      { name: "Konu", value: String(rec.subject || "-").slice(0, 200), inline: true },
      { name: "Mesaj", value: String(rec.message || "-").slice(0, 1000), inline: false },
      { name: "Durum", value: "⏳ Bekliyor — yetkililer aşağıdan cevaplayabilir", inline: false }
    ).setTimestamp();
};

exports.iletisimButon = function (rec, lang) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`iletisim_cevapla_${rec.id}`)
      .setLabel(metin(lang, "Cevapla", "Reply"))
      .setStyle(ButtonStyle.Primary)
      .setEmoji("↩️")
  );
  return row;
};

async function logMesajiniGuncelle(client, rec, durumMetni, renk) {
  try {
    const chId = rec.logChannelId || OWNER_LOG;
    let kanal = client.channels.cache.get(chId);
    if (!kanal) kanal = await client.channels.fetch(chId).catch(() => null);
    if (!kanal || !rec.logMessageId) return false;
    const msg = await kanal.messages.fetch(rec.logMessageId).catch(() => null);
    if (!msg) return false;
    const eski = msg.embeds?.[0];
    const e = new EmbedBuilder()
      .setColor(renk)
      .setTitle((eski && eski.title) || "✉️ Site İletişim Formu")
      .setDescription(((eski && eski.description) || "").slice(0, 3500) || null)
      .addFields(
        { name: "Kullanıcı", value: rec.discordId ? `<@${rec.discordId}> (\`${rec.discordId}\`)` : (rec.username || "-"), inline: true },
        { name: "Konu", value: String(rec.subject || "-").slice(0, 200), inline: true },
        { name: "Mesaj", value: String(rec.message || "-").slice(0, 1000), inline: false },
        { name: "Durum", value: durumMetni.slice(0, 1000), inline: false }
      ).setTimestamp();
    await msg.edit({ embeds: [e], components: [] }).catch(() => {});
    return true;
  } catch { return false; }
}

exports.handleIletisimInteraction = async function (interaction, client) {
  const id = interaction.customId || "";
  if (!id.startsWith("iletisim_")) return false;
  const lang = await getLang(interaction.user.id);
  if (!yetkiliMi(interaction.user.id)) {
    await interaction.reply({ content: metin(lang, "Bu işlemi sadece yetkililer yapabilir.", "Only staff can do this."), ephemeral: true }).catch(() => {});
    return true;
  }

  /* Buton → modal aç */
  if (interaction.isButton() && id.startsWith("iletisim_cevapla_")) {
    const mesajId = id.slice("iletisim_cevapla_".length);
    const rec = db.get(`iletisim_${mesajId}`);
    if (!rec) { await interaction.reply({ content: metin(lang, "Mesaj bulunamadı (süresi geçmiş olabilir).", "Message not found (may have expired)."), ephemeral: true }).catch(() => {}); return true; }
    const modal = new ModalBuilder().setCustomId(`iletisim_modal_${mesajId}`)
      .setTitle(metin(lang, "İletişim Mesajını Cevapla", "Reply to Contact Message").slice(0, 45));
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("yanit").setLabel(metin(lang, "Yanıtın (kullanıcıya DM gidecek)", "Your reply (sent to user as DM)").slice(0, 45))
          .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1800)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("baslik").setLabel(metin(lang, "DM başlığı (opsiyonel)", "DM title (optional)").slice(0, 45))
          .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(200)
      )
    );
    await interaction.showModal(modal).catch(() => {});
    return true;
  }

  /* Modal → DM gönder + log güncelle */
  if (interaction.isModalSubmit() && id.startsWith("iletisim_modal_")) {
    const mesajId = id.slice("iletisim_modal_".length);
    const rec = db.get(`iletisim_${mesajId}`);
    if (!rec) { await interaction.reply({ content: metin(lang, "Kayıt bulunamadı.", "Record not found."), ephemeral: true }).catch(() => {}); return true; }
    const yanit = (interaction.fields.getTextInputValue("yanit") || "").slice(0, 1800);
    const baslik = (interaction.fields.getTextInputValue("baslik") || "").slice(0, 200)
      || metin(rec.lang, "RiseBunny Destek — Yanıtın", "RiseBunny Support — Your Reply");

    let dmOk = false, dmHata = "";
    try {
      const uid = String(rec.discordId || "").replace(/\D/g, "");
      const u = uid ? await client.users.fetch(uid).catch(() => null) : null;
      if (!u) { dmHata = "Kullanıcı bulunamadı (DM kapalı olabilir)."; }
      else {
        const e = new EmbedBuilder().setColor("Green").setTitle(String(baslik).slice(0, 256))
          .setDescription(String(yanit).slice(0, 4000))
          .addFields({ name: metin(rec.lang, "Orijinal mesajın", "Your original message"), value: String(rec.message || "-").slice(0, 500) })
          .setFooter({ text: "RiseBunny • Destek" }).setTimestamp();
        await u.send({ embeds: [e] }).then(() => { dmOk = true; }).catch(err => { dmHata = String(err?.message || "DM gönderilemedi").slice(0, 200); });
      }
    } catch (e) { dmHata = String(e?.message || "hata").slice(0, 200); }

    rec.durum = dmOk ? "cevaplandi" : "hata";
    rec.cevaplayan = interaction.user.id;
    rec.yanit = yanit;
    iletisimGuncelle(rec);

    const durumMetni = dmOk
      ? metin(lang, `✅ Başarılı — yanıt DM olarak gönderildi. (Yetkili: ${interaction.user.tag})`, `✅ Success — reply sent as DM. (Staff: ${interaction.user.tag})`)
      : metin(lang, `❌ Hata — DM gönderilemedi: ${dmHata} (Yetkili: ${interaction.user.tag})`, `❌ Error — DM could not be sent: ${dmHata} (Staff: ${interaction.user.tag})`);
    await logMesajiniGuncelle(client, rec, durumMetni, dmOk ? "Green" : "Red");
    try { await ownerLog(client, dmOk
      ? `✅ **İletişim cevaplandı:** <@${rec.discordId}> — DM gönderildi (${interaction.user.tag})`
      : `❌ **İletişim cevabı DM gönderilemedi:** <@${rec.discordId}> — ${dmHata}`); } catch {}

    await interaction.reply({ content: durumMetni, ephemeral: true }).catch(() => {});
    return true;
  }

  return false;
};
