/**
 * RiseBunny — Vape Config Paylaşım Sistemi
 *
 * Komutlar:
 *   r!config yükle              → ekli dosyayı sahibe onaya gönderir (herkes)
 *   r!config liste              → sayfalı config listesi, tek/çoklu silme (yetkili)
 *   r!config sil <id|kısa-id>   → tek config siler (yetkili)
 *
 * Onay akışı: Sahip log kanalına embed + dosya + "Kabul Et" / "Ret" butonları düşer.
 * Kabul edilenler `configler` kaydında durum="kabul" olur ve Vape istemcisi
 * /api/configs ucundan bu listeyi çeker.
 */
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder, AttachmentBuilder
} = require("discord.js");
const db = require("croxydb");
const { getLangSync, t, getLang } = require("../dil");
const { SAHIP_ID, OWNER_LOG, ownerLog } = require("../utils");

const MAX_BOYUT = 512 * 1024;          // 512 KB üst sınır
const SAYFA_BASI = 10;                  // sayfa başına 10 kullanıcı
const YETKILI_2 = "1310366324731547798";

function yetkiliMi(userId) {
  const id = String(userId || "");
  if (!id) return false;
  if (id === String(SAHIP_ID) || id === YETKILI_2) return true;
  try { const { isMod } = require("../ai/executor"); return isMod(id); } catch { return false; }
}

function tumConfigler() {
  try { const l = db.get("configler"); return Array.isArray(l) ? l : []; } catch { return []; }
}
function kaydetListe(liste) { try { db.set("configler", liste); } catch {} }
function configBul(id) { return tumConfigler().find(c => String(c.id) === String(id)) || null; }

function yeniId() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function grupla(liste) {
  const m = new Map();
  for (const c of liste) {
    const k = String(c.discordId || "?");
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(c);
  }
  return m;
}

function durumSimge(d) { return d === "kabul" ? "✅" : d === "red" ? "❌" : "⏳"; }

/* Sayfa embed'i + sayfadaki config'ler */
function listeEmbedIcin(liste, sayfa) {
  const grup = grupla(liste);
  const kullanicilar = [...grup.keys()];
  const toplamSayfa = Math.max(1, Math.ceil(kullanicilar.length / SAYFA_BASI));
  const s = Math.min(Math.max(1, sayfa), toplamSayfa);
  const dilim = kullanicilar.slice((s - 1) * SAYFA_BASI, s * SAYFA_BASI);

  const embed = new EmbedBuilder().setColor("Blurple")
    .setTitle("📦 Vape Config Listesi")
    .setFooter({ text: `Sayfa ${s}/${toplamSayfa} • Toplam ${liste.length} config • ${kullanicilar.length} kullanıcı` })
    .setTimestamp();

  if (!dilim.length) {
    embed.setDescription("Kayıtlı config yok. Kullanıcılar `config yükle` ile paylaşabilir.");
  } else {
    let n = (s - 1) * SAYFA_BASI;
    for (const uid of dilim) {
      n++;
      const cfgs = grup.get(uid);
      const ad = cfgs[0].username || "?";
      embed.addFields({
        name: `${n}. ${ad} (${uid}) — ${cfgs.length} config`,
        value: cfgs.map(c => `${durumSimge(c.durum)} \`${String(c.id).slice(-7)}\` ${String(c.ad).slice(0, 40)}`).join("\n").slice(0, 1024) || "-"
      });
    }
  }
  return { embed, s, toplamSayfa, dilim };
}

function listeBilesenleri(liste, sayfa, lang) {
  const { embed, s, toplamSayfa, dilim } = listeEmbedIcin(liste, sayfa);
  const grup = grupla(liste);
  const sayfaCfg = [];
  dilim.forEach(uid => grup.get(uid).forEach(c => sayfaCfg.push(c)));

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cfg_sayfa_${s - 1}`).setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(s <= 1),
    new ButtonBuilder().setCustomId("cfg_sayfa_bilgi").setLabel(`${s}/${toplamSayfa}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`cfg_sayfa_${s + 1}`).setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(s >= toplamSayfa),
    new ButtonBuilder().setCustomId(`cfg_sayfasil_${s}`).setLabel(t(lang, "config.sayfaSil")).setStyle(ButtonStyle.Danger).setEmoji("🗑️"),
    new ButtonBuilder().setCustomId("cfg_silhepsi").setLabel(t(lang, "config.hepsiSil")).setStyle(ButtonStyle.Danger).setEmoji("🔥")
  );
  const comps = [row1];
  if (sayfaCfg.length) {
    const menu = new StringSelectMenuBuilder().setCustomId("cfg_sil_menu")
      .setPlaceholder(t(lang, "config.secPlaceholder")).setMinValues(1).setMaxValues(1);
    sayfaCfg.slice(0, 25).forEach(c => menu.addOptions(new StringSelectMenuOptionBuilder()
      .setLabel(`${String(c.ad).slice(0, 90)}`)
      .setDescription(`${c.username || "?"} • ${durumSimge(c.durum)} ${c.durum}`.slice(0, 100))
      .setValue(String(c.id))));
    comps.push(new ActionRowBuilder().addComponents(menu));
  }
  return { embeds: [embed], components: comps };
}

/* Sahip loguna onay mesajı gönderir. */
async function cfgOnayaGonder(client, cfg) {
  try {
    let kanal = client.channels.cache.get(OWNER_LOG);
    if (!kanal) kanal = await client.channels.fetch(OWNER_LOG).catch(() => null);
    if (!kanal) return null;
    const dosya = new AttachmentBuilder(Buffer.from(cfg.icerik, "base64"), { name: String(cfg.ad || "config.txt").slice(0, 80) });
    const embed = new EmbedBuilder().setColor("Yellow").setTitle("📦 Yeni Vape Config Paylaşımı")
      .setDescription(
        `**Kullanıcı:** <@${cfg.discordId}> (\`${cfg.discordId}\`)\n` +
        `**Dosya:** ${cfg.ad}\n**Boyut:** ${(cfg.boyut / 1024).toFixed(1)} KB\n` +
        `**Talep:** \`${cfg.id}\`${cfg.not ? `\n**Not:** ${String(cfg.not).slice(0, 300)}` : ""}\n\n` +
        "Kabul edersen config Vape istemcisinde **Configler** listesinde görünür."
      ).setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`cfg_onay_${cfg.id}`).setLabel(t("tr", "config.kabulEt")).setStyle(ButtonStyle.Success).setEmoji("✅"),
      new ButtonBuilder().setCustomId(`cfg_red_${cfg.id}`).setLabel(t("tr", "config.redEt")).setStyle(ButtonStyle.Danger).setEmoji("✖️")
    );
    return await kanal.send({ embeds: [embed], components: [row], files: [dosya] }).catch(() => null);
  } catch { return null; }
}

/* Onay log mesajını "işlendi" olarak güncelle. */
async function logMesajiIsle(client, cfg, sonuc, sebep, isleyen) {
  try {
    const chId = cfg.logChannelId || OWNER_LOG;
    const msgId = cfg.logMessageId;
    if (!msgId) return false;
    let kanal = client.channels.cache.get(chId);
    if (!kanal) kanal = await client.channels.fetch(chId).catch(() => null);
    if (!kanal) return false;
    const msg = await kanal.messages.fetch(msgId).catch(() => null);
    if (!msg) return false;
    const eski = msg.embeds?.[0];
    const e = new EmbedBuilder()
      .setColor(sonuc === "kabul" ? "Green" : "Red")
      .setTitle(sonuc === "kabul" ? "✅ Config kabul edildi" : "❌ Config reddedildi")
      .setDescription(((eski && eski.description) || `Talep: \`${cfg.id}\``).slice(0, 3500))
      .addFields(
        { name: "Sonuç", value: sonuc === "kabul" ? "Vape istemcisinde listelenecek." : `Red — sebep: ${String(sebep || "Belirtilmedi").slice(0, 200)}`, inline: false },
        { name: "İşleyen", value: String(isleyen || "?").slice(0, 60), inline: true }
      ).setTimestamp();
    await msg.edit({ embeds: [e], components: [] }).catch(() => {});
    return true;
  } catch { return false; }
}

function cfgKullaniciDM(client, discordId, baslik, metin) {
  try {
    client.users.fetch(String(discordId).replace(/\D/g, "")).then(u => {
      if (!u) return;
      u.send({ embeds: [new EmbedBuilder().setColor("Blurple").setTitle(String(baslik).slice(0, 256)).setDescription(String(metin).slice(0, 4000)).setTimestamp().setFooter({ text: "RiseBunny • Config" })] }).catch(() => {});
    }).catch(() => {});
  } catch {}
}

/* ---------------- Komut ---------------- */
exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const sub = (args[0] || "").toLowerCase();

  if (sub === "liste" || sub === "list" || sub === "show") {
    if (!yetkiliMi(message.author.id)) return message.reply(t(lang, "ortak.yetkiYok")).catch(() => {});
    const liste = tumConfigler();
    return message.reply(listeBilesenleri(liste, 1, lang)).catch(() => {});
  }

  if (sub === "sil" || sub === "delete") {
    if (!yetkiliMi(message.author.id)) return message.reply(t(lang, "ortak.yetkiYok")).catch(() => {});
    const hedef = String(args[1] || "").trim();
    if (!hedef) return message.reply(t(lang, "config.silKullanim")).catch(() => {});
    const liste = tumConfigler();
    const cfg = liste.find(c => String(c.id) === hedef) || liste.find(c => String(c.id).endsWith(hedef));
    if (!cfg) return message.reply(t(lang, "config.bulunamadi")).catch(() => {});
    kaydetListe(liste.filter(c => c !== cfg));
    try { await ownerLog(client, `🗑️ **Config silindi:** \`${cfg.ad}\` — <@${cfg.discordId}> (${message.author.tag})`); } catch {}
    return message.reply(t(lang, "config.silindi", { ad: cfg.ad })).catch(() => {});
  }

  // yükle (varsayılan)
  if (sub && sub !== "yükle" && sub !== "yukle" && sub !== "upload" && sub !== "ekle") {
    return message.reply(t(lang, "config.kullanim")).catch(() => {});
  }

  const att = message.attachments.first();
  if (!att) return message.reply(t(lang, "config.dosyaGerek")).catch(() => {});

  const ad = String(att.name || "config.txt");
  if (att.size > MAX_BOYUT) return message.reply(t(lang, "config.cokBuyuk", { mb: (MAX_BOYUT / 1024 / 1024).toFixed(1) })).catch(() => {});

  let icerik;
  try {
    const res = await fetch(att.url);
    if (!res.ok) throw new Error("indirilemedi");
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BOYUT) return message.reply(t(lang, "config.cokBuyuk", { mb: (MAX_BOYUT / 1024 / 1024).toFixed(1) })).catch(() => {});
    icerik = buf.toString("base64");
  } catch {
    return message.reply(t(lang, "config.hata")).catch(() => {});
  }

  const cfg = {
    id: yeniId(),
    discordId: message.author.id,
    username: message.author.username || "?",
    ad,
    boyut: att.size,
    icerik,
    durum: "bekliyor",
    sebep: "",
    at: Date.now(),
    onaylayan: "",
    logChannelId: OWNER_LOG,
    logMessageId: ""
  };

  const gonderilen = await cfgOnayaGonder(client, cfg);
  if (gonderilen) { cfg.logChannelId = gonderilen.channel.id; cfg.logMessageId = gonderilen.id; }

  const liste = tumConfigler();
  liste.push(cfg);
  kaydetListe(liste);

  const bekleyen = message.reply(t(lang, "config.yuklendi", { ad })).catch(() => {});
  if (!gonderilen) {
    const e = new EmbedBuilder().setColor("Red").setTitle("📦 Config Onayı (log yok)")
      .setDescription(`**Kullanıcı:** <@${cfg.discordId}> (\`${cfg.discordId}\`)\n**Dosya:** ${ad}\n**Talep:** \`${cfg.id}\``);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`cfg_onay_${cfg.id}`).setLabel(t("tr", "config.kabulEt")).setStyle(ButtonStyle.Success).setEmoji("✅"),
      new ButtonBuilder().setCustomId(`cfg_red_${cfg.id}`).setLabel(t("tr", "config.redEt")).setStyle(ButtonStyle.Danger).setEmoji("✖️")
    );
    await ownerLog(client, { embeds: [e], components: [row] });
  }
  return bekleyen;
};

exports.handleConfigInteraction = async function (interaction, client) {
  const id = interaction.customId || "";
  const isConfig = id.startsWith("cfg_");
  if (!isConfig) return false;
  const lang = await getLang(interaction.user.id);
  const yetkili = yetkiliMi(interaction.user.id);

  /* --- Modal: ret sebebi --- */
  if (interaction.isModalSubmit() && id.startsWith("cfg_redmodal_")) {
    if (!yetkili) { await interaction.reply({ content: t(lang, "ortak.yetkiYok"), ephemeral: true }).catch(() => {}); return true; }
    const cfgId = id.slice("cfg_redmodal_".length);
    const sebep = (interaction.fields.getTextInputValue("sebep") || "").slice(0, 300) || "Belirtilmedi";
    const liste = tumConfigler();
    const cfg = liste.find(c => String(c.id) === cfgId);
    if (!cfg) { await interaction.reply({ content: t(lang, "config.bulunamadi"), ephemeral: true }).catch(() => {}); return true; }
    if (cfg.durum !== "bekliyor") { await interaction.reply({ content: t(lang, "config.zatenIslendi"), ephemeral: true }).catch(() => {}); return true; }
    cfg.durum = "red"; cfg.sebep = sebep; cfg.onaylayan = interaction.user.id;
    kaydetListe(liste);
    await logMesajiIsle(client, cfg, "red", sebep, interaction.user.tag);
    cfgKullaniciDM(client, cfg.discordId, t("tr", "config.redDMBaslik"), t("tr", "config.redDMMetin", { ad: cfg.ad, sebep }));
    try { await ownerLog(client, `❌ **Config reddedildi:** \`${cfg.ad}\` (<@${cfg.discordId}>) — ${sebep}`); } catch {}
    await interaction.reply({ content: t(lang, "config.reddedildi", { ad: cfg.ad }), ephemeral: true }).catch(() => {});
    return true;
  }

  /* --- Select: tek config sil --- */
  if (interaction.isStringSelectMenu() && id === "cfg_sil_menu") {
    if (!yetkili) { await interaction.reply({ content: t(lang, "ortak.yetkiYok"), ephemeral: true }).catch(() => {}); return true; }
    const hedef = String((interaction.values && interaction.values[0]) || "");
    const liste = tumConfigler();
    const cfg = liste.find(c => String(c.id) === hedef);
    if (!cfg) { await interaction.reply({ content: t(lang, "config.bulunamadi"), ephemeral: true }).catch(() => {}); return true; }
    kaydetListe(liste.filter(c => String(c.id) !== hedef));
    try { await ownerLog(client, `🗑️ **Config silindi (liste):** \`${cfg.ad}\` — <@${cfg.discordId}> (${interaction.user.tag})`); } catch {}
    const yeni = tumConfigler();
    return interaction.update(listeBilesenleri(yeni, 1, lang)).catch(() => {});
  }

  if (!interaction.isButton()) return false;

  /* --- Kabul / Ret --- */
  if (id.startsWith("cfg_onay_") || id.startsWith("cfg_red_")) {
    if (!yetkili) { await interaction.reply({ content: t(lang, "ortak.yetkiYok"), ephemeral: true }).catch(() => {}); return true; }
    const kabul = id.startsWith("cfg_onay_");
    const cfgId = id.slice(kabul ? "cfg_onay_".length : "cfg_red_".length);
    const liste = tumConfigler();
    const cfg = liste.find(c => String(c.id) === cfgId);
    if (!cfg) { await interaction.reply({ content: t(lang, "config.bulunamadi"), ephemeral: true }).catch(() => {}); return true; }
    if (cfg.durum !== "bekliyor") { await interaction.reply({ content: t(lang, "config.zatenIslendi"), ephemeral: true }).catch(() => {}); return true; }

    if (kabul) {
      cfg.durum = "kabul"; cfg.onaylayan = interaction.user.id;
      kaydetListe(liste);
      await logMesajiIsle(client, cfg, "kabul", "", interaction.user.tag);
      cfgKullaniciDM(client, cfg.discordId, t("tr", "config.kabulDMBaslik"), t("tr", "config.kabulDMMetin", { ad: cfg.ad }));
      try { await ownerLog(client, `✅ **Config kabul edildi:** \`${cfg.ad}\` (<@${cfg.discordId}>) — ${interaction.user.tag}`); } catch {}
      return interaction.reply({ content: t(lang, "config.kabulEdildi", { ad: cfg.ad }), ephemeral: true }).catch(() => {});
    }

    const { ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
    const modal = new ModalBuilder().setCustomId(`cfg_redmodal_${cfg.id}`).setTitle(t(lang, "config.redModalBaslik").slice(0, 45));
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("sebep").setLabel(t(lang, "config.redSebepLabel").slice(0, 45))
        .setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(300)
    ));
    return interaction.showModal(modal).catch(() => {});
  }

  /* --- Sayfalama --- */
  if (id.startsWith("cfg_sayfa_") && id !== "cfg_sayfa_bilgi") {
    if (!yetkili) { await interaction.reply({ content: t(lang, "ortak.yetkiYok"), ephemeral: true }).catch(() => {}); return true; }
    const s = parseInt(id.replace("cfg_sayfa_", ""), 10) || 1;
    return interaction.update(listeBilesenleri(tumConfigler(), s, lang)).catch(() => {});
  }

  /* --- Bu sayfayı sil --- */
  if (id.startsWith("cfg_sayfasil_")) {
    if (!yetkili) { await interaction.reply({ content: t(lang, "ortak.yetkiYok"), ephemeral: true }).catch(() => {}); return true; }
    const s = parseInt(id.replace("cfg_sayfasil_", ""), 10) || 1;
    const liste = tumConfigler();
    const { dilim } = listeEmbedIcin(liste, s);
    const silinecek = new Set(dilim.map(String));
    const kalan = liste.filter(c => !silinecek.has(String(c.discordId)));
    const n = liste.length - kalan.length;
    kaydetListe(kalan);
    try { await ownerLog(client, `🗑️ **Config — sayfa silindi:** ${n} config (${interaction.user.tag})`); } catch {}
    return interaction.update(listeBilesenleri(kalan, 1, lang)).catch(() => {});
  }

  /* --- Tümünü sil (onaylı) --- */
  if (id === "cfg_silhepsi") {
    if (!yetkili) { await interaction.reply({ content: t(lang, "ortak.yetkiYok"), ephemeral: true }).catch(() => {}); return true; }
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("cfg_silhepsi_onay").setLabel(t(lang, "config.hepsiOnay")).setStyle(ButtonStyle.Danger).setEmoji("🗑️"),
      new ButtonBuilder().setCustomId("cfg_silhepsi_iptal").setLabel(t(lang, "config.iptal")).setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ content: t(lang, "config.hepsiUyari"), components: [row], ephemeral: true }).catch(() => {});
  }
  if (id === "cfg_silhepsi_onay") {
    if (!yetkili) { await interaction.reply({ content: t(lang, "ortak.yetkiYok"), ephemeral: true }).catch(() => {}); return true; }
    const n = tumConfigler().length;
    kaydetListe([]);
    try { await ownerLog(client, `🔥 **TÜM configler silindi:** ${n} kayıt (${interaction.user.tag})`); } catch {}
    return interaction.update({ content: t(lang, "config.hepsiSilindi", { sayi: n }), embeds: [], components: [] }).catch(() => {});
  }
  if (id === "cfg_silhepsi_iptal") {
    return interaction.update({ content: t(lang, "config.iptalEdildi"), embeds: [], components: [] }).catch(() => {});
  }

  return false;
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["cfg", "vapeconfig"], permLevel: 0, kategori: "sahip" };
exports.help = {
  name: "config",
  description: "Vape config paylaşımı: yükle (onaya gider) / liste (yetkili) / sil (yetkili).",
  usage: "config yükle (dosya ekli) | config liste | config sil <id>"
};
