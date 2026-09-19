/**
 * AI Sohbet Sistemi - Ana İşleyici (croxydb + Groq fallback)
 * - "rise <metin>" tetikleyicisi
 * - Önce croxydb'de arar, yoksa Groq AI'ye sorar
 * - Groq cevabında "Öğren" butonu ekler
 * - Owner log entegrasyonu (hata, öğrenme, cevap veremezse)
 * - Cooldown sadece spam koruması için
 */

const SoruEslestirici = require("./matcher");
const { groqSor, formatEgitimVerileri, createOwnerLogError, createOwnerLogLearn, createOwnerLogNoAnswer, OWNER_ID } = require("./groq");
const db = require("croxydb");
const fs = require("fs");
const path = require("path");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getLangSync } = require("../dil");
const { ownerLog } = require("../utils");

// AI Matcher başlat (croxydb ile)
const matcher = new SoruEslestirici(db);

// Cooldown sadece spam koruması için (3 saniye)
const aiCooldown = new Map();
const COOLDOWN_MS = 3000;

// Learn/owner butonları için cache (base64 JSON yerine short ID)
const learnCache = new Map();
const ownerCache = new Map();
const LEARN_CACHE_TTL = 10 * 60 * 1000; // 10 dakika
const OWNER_CACHE_TTL = 30 * 60 * 1000; // 30 dakika

const AI_CONFIG = {
  TETIKLEYICI: "rise",
  KARAKTER_LIMITI: 4000,
  COOLDOWN_MS,
  DESTEK_SUNUCU_ID: "1192948403232067725",
  DESTEK_SUNUCU_LINK: "https://discord.gg/mEfz5SfpbR"
};

/**
 * Eğitim verilerini Groq system prompt için formatla
 * cevaplar.json'dan TÜM Q&A çiftlerini ve croxydb'deki öğrenilenleri birleştirir
 */
function egitimVerileriniHazirla() {
  try {
    const fs = require("fs");
    const path = require("path");
    const all = db.all() || {};
    const veriler = [];
    
    // 1. Croxydb'den öğrenilen veriler (ai_qa_*)
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith("ai_qa_") && value && value.soru && value.cevap) {
        veriler.push({
          soru: value.soru,
          cevap: value.cevap,
          kategori: value.kategori || "genel",
          kaynak: "learned"
        });
      }
    }
    
    // 2. cevaplar.json'dan TÜM sabit Q&A çiftlerini ekle
    try {
      const cevaplarPath = path.join(__dirname, "..", "cevaplar.json");
      const cevaplarData = JSON.parse(fs.readFileSync(cevaplarPath, "utf8"));
      
      for (const item of cevaplarData.cevaplar) {
        const kategori = item.kategori || "genel";
        for (const soru of item.sorular) {
          // Sadece Türkçe cevabı kullan (Groq diline göre çevirecek)
          veriler.push({
            soru: soru,
            cevap: item.cevap,
            kategori: kategori,
            kaynak: "builtin"
          });
        }
      }
    } catch (e) {
      console.warn("[AI] cevaplar.json okunamadı:", e.message);
    }
    
    // Kategorilere göre grupla, her kategori max 5 örnek (sabit + öğrenilen)
    const kategoriler = {};
    for (const v of veriler) {
      const kat = v.kategori || "genel";
      if (!kategoriler[kat]) kategoriler[kat] = [];
      if (kategoriler[kat].length < 5) {
        kategoriler[kat].push(v);
      }
    }
    
    let output = "";
    for (const [kat, liste] of Object.entries(kategoriler)) {
      output += `\n## ${kat.toUpperCase()}\n`;
      for (const item of liste) {
        output += `Q: ${item.soru}\nA: ${item.cevap}\n\n`;
      }
    }
    
    return output;
  } catch (e) {
    console.error("[AI] Eğitim verisi hazırlama hatası:", e.message);
    return "";
  }
}

/**
 * Owner log'a AI hata/öğrenme/cevap veremezse log gönder
 */
async function ownerLogAI(client, logData) {
  try {
    const { createOwnerLogError, createOwnerLogLearn, createOwnerLogNoAnswer } = require("./groq");
    
    let logResult;
    if (logData.type === "error") {
      logResult = createOwnerLogError({
        soru: logData.soru,
        hata: logData.hata,
        guild: logData.guild,
        user: logData.user,
        lang: logData.lang
      });
    } else if (logData.type === "learn") {
      const oid = `own_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
      ownerCache.set(oid, { soru: logData.soru, cevap: logData.cevap });
      setTimeout(() => ownerCache.delete(oid), 30 * 60 * 1000);
      logResult = createOwnerLogLearn({
        soru: logData.soru,
        cevap: logData.cevap,
        guild: logData.guild,
        user: logData.user,
        lang: logData.lang,
        action: logData.action,
        cacheId: oid
      });
    } else if (logData.type === "no_answer") {
      const nid = `own_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
      ownerCache.set(nid, { soru: logData.soru });
      setTimeout(() => ownerCache.delete(nid), OWNER_CACHE_TTL);
      logResult = createOwnerLogNoAnswer({
        soru: logData.soru,
        guild: logData.guild,
        user: logData.user,
        lang: logData.lang,
        cacheId: nid
      });
    }
    
    if (logResult) {
      await ownerLog(client, {
        content: logResult.content,
        embeds: logResult.embeds,
        components: logResult.components
      }).catch(() => {});
    }
  } catch (e) {
    console.error("[AI OwnerLog Hatası]:", e);
  }
}

/**
 * "Öğren" butonu ile cevabı veritabanına kaydet + owner log
 */
async function ogrenenCevapKaydet(interaction, soru, cevap) {
  try {
    const id = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    db.set(`ai_qa_${id}`, {
      soru: soru,
      cevap: cevap,
      kategori: "ai_learned",
      kaynak: "groq_learned",
      ekleyen: interaction.user.id,
      kullanim: 0,
      faydali: 0,
      created_at: Date.now()
    });
    
    // Matcher cache temizle
    try {
      matcher.cacheTemizle();
    } catch {}
    
    const lang = getLangSync(interaction.user.id);
    const { t } = require("../dil");

    await interaction.update({
      content: t(lang, "ai.ogrenildi", { soru, cevap }),
      components: [],
      embeds: []
    }).catch(() => {});

    console.log(`🧠 [AI Öğrenme] ${interaction.user.tag}: "${soru}" kaydedildi`);

    // Owner log'a öğrenme kaydı gönder (sahip: hangi sunucuda kim öğretti)
    await ownerLogAI(interaction.client, {
      type: "learn",
      soru: soru,
      cevap: cevap,
      guild: interaction.guild,
      user: interaction.user,
      lang: lang,
      action: "learned"
    });

  } catch (e) {
    console.error("[AI Öğrenme Hatası]:", e);
    const lang = getLangSync(interaction.user.id);
    const { t } = require("../dil");
    await interaction.reply({ content: t(lang, "ai.kaydetHata"), ephemeral: true }).catch(() => {});
  }
}

/**
 * AI Ana işleyici
 * @param {Message} message - Discord mesajı
 * @param {Client} client - Discord client
 * @returns {Promise<boolean>} true = AI cevap verdi (diğer işlemler durur)
 */
async function aiIsle(message, client) {
  const icerik = message.content?.trim();
  if (!icerik) return false;

  // 1) "rise" ile başlıyor mu? (büyük/küçük harf duyarsız) - "rise" veya "rise " kabul et
  const lowerContent = icerik.toLowerCase();
  if (!lowerContent.startsWith("rise")) return false;

  // 2) Kullanıcının sorusunu al - "rise" (4 karakter) veya "rise " (5 karakter)
  const tetikleyiciUzunluk = lowerContent.startsWith("rise ") ? 5 : 4;
  const soru = icerik.slice(tetikleyiciUzunluk).trim();

  // 3) Soru boşsa - karşılama mesajı
  if (!soru) {
    const lang = getLangSync(message.author.id);
    const isTr = lang === "tr";
    await message.reply({
      content: (isTr ? `Merhaba ${message.author}! 👋 Bana bir şey sormak ister misin?\nÖrn: \`rise nasılsın\`, \`rise premium ne işe yarar\`` : `Hello ${message.author}! 👋 Want to ask me something?\nEx: \`rise how are you\`, \`rise what is premium\``),
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }

  // 3) Karakter limiti kontrolü
  if (soru.length > 4000) {
    const lang = getLangSync(message.author.id);
    await message.reply({
      content: (lang === "tr" ? `⚠️ Sorun çok uzun! En fazla **4000 karakter** olabilir.` : `⚠️ Your question is too long! Max **4000 characters**.`),
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }

  // 4) Cooldown kontrolü (sadece spam koruması - 3 sn)
  const now = Date.now();
  const sonKullanim = aiCooldown.get(message.author.id) || 0;
  if (now - sonKullanim < COOLDOWN_MS) {
    const kalan = Math.ceil((COOLDOWN_MS - (now - sonKullanim)) / 1000);
    const lang = getLangSync(message.author.id);
    await message.reply({
      content: (lang === "tr" ? `⏳ Lütfen **${kalan} saniye** bekle.` : `⏳ Please wait **${kalan} seconds**.`),
      allowedMentions: { repliedUser: false }
    }).catch(() => {});
    return true;
  }
  aiCooldown.set(message.author.id, now);

  // 6) Önce croxydb'de ara (local bilgi tabanı)
  const sonuc = await matcher.bul(soru);

  if (sonuc) {
    // ✅ Local DB'de bulundu → cevap ver
    let cevap = matcher.degiskenleriDoldur ? matcher.degiskenleriDoldur(sonuc.cevap, message, client) : sonuc.cevap;
    
    // Manuel değişken doldurma (fallback)
    if (typeof cevap === "string" && cevap.includes("{{")) {
      const lang = getLangSync(message.author.id);
      const prefix = process.env.PREFIX || "r!";
      
      cevap = cevap
        .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString(lang === "en" ? "en-US" : "tr-TR"))
        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString(lang === "en" ? "en-US" : "tr-TR"))
        .replace(/\{\{user\}\}/g, message.author?.username || "Kullanıcı")
        .replace(/\{\{mention\}\}/g, message.author ? `<@${message.author.id}>` : "@Kullanıcı")
        .replace(/\{\{guild\}\}/g, message.guild?.name || "DM")
        .replace(/\{\{prefix\}\}/g, prefix)
        .replace(/\{\{bot\}\}/g, client?.user?.username || "RiseBunny")
        .replace(/\{\{ping\}\}/g, client.ws.ping);
    }

    // Kullanım sayısını artır
    try { db.add(`ai_qa_${sonuc.id}_kullanim`, 1); } catch {}

    // "yazıyor..." etkisi
    await message.channel.sendTyping().catch(() => {});
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300));

    await message.reply({
      content: cevap,
      allowedMentions: { repliedUser: false }
    }).catch(() => {});

    console.log(`🤖 [AI Local] ${message.author.tag}: "${soru}" → "${sonuc.soru}" (skor: ${sonuc.skor.toFixed(2)})`);
    return true;
  }

  // 6b) Sunucuya özel otomasyon eğitimi (rise ile entegre, %50+ benzerlik)
  // Premium biterse: veriler DURUR, çalışma durur + sahip log + kanal bildirimi
  if (message.guild) {
    try {
      const { otomasyonDurum } = require("../komutlar/otomasyon");
      const { t } = require("../dil");
      const oto = otomasyonDurum(message.guild.id);
      if (oto && oto.bitmis) {
        const l0 = getLangSync(message.author.id);
        await message.channel.send(t(l0, "otomasyon.duraklatildi")).catch(() => {});
        try { const { ownerLog } = require("../utils"); ownerLog(client, `🤖 **Otomasyon duraklatıldı (premium bitti, veriler duruyor):** **${message.guild.name}** (${message.guild.id}) — kuran: <@${oto.kuran}>`).catch(() => {}); } catch {}
      } else if (oto) {
        const { similarity } = require("./matcher");
        const all = db.all() || {};
        let enIyi = null, enSkor = 0;
        for (const [k, v] of Object.entries(all)) {
          if (!k.startsWith(`otoegitim_${message.guild.id}_`) || !v?.soru || !v?.cevap) continue;
          const s = similarity(soru, v.soru);
          if (s > enSkor) { enSkor = s; enIyi = v; }
        }
        if (enIyi && enSkor >= 0.5) {
          let cevap = matcher.degiskenleriDoldur ? matcher.degiskenleriDoldur(enIyi.cevap, message, client) : enIyi.cevap;
          await message.channel.sendTyping().catch(() => {});
          await message.reply({ content: `🏠 ${cevap}`, allowedMentions: { repliedUser: false } }).catch(() => {});
          console.log(`🤖 [AI Otomasyon] ${message.author.tag}: "${soru}" → sunucu eğitimi (skor: ${enSkor.toFixed(2)})`);
          return true;
        }
      }
    } catch {}
  }

  // 7) Local DB'de yoksa sağlayıcı zincirine sor (limit yiyeni atlar)

  // Eğitim verilerini Groq'ya göndermek için hazırla
  const egitimVerileri = egitimVerileriniHazirla();
  
  // "Yazıyor..." etkisi
  await message.channel.sendTyping().catch(() => {});
  
  // Çoklu sağlayıcı zincirine sor (rate-limit yiyeni atla, sona gelince başa dön)
  const { chainAsk } = require("./providers");
  const { buildSystemPrompt } = require("./groq");
  const lang = getLangSync(message.author.id);
  const groqSonuc = await chainAsk(buildSystemPrompt(egitimVerileriniHazirla(), lang), soru, lang);

  if (groqSonuc.success) {
    const cevap = groqSonuc.cevap;
    const { t } = require("../dil");

    // Öğret + Ticket butonları (short ID, çevirili)
    const learnId = `learn_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
    learnCache.set(learnId, { soru, cevap });
    setTimeout(() => learnCache.delete(learnId), LEARN_CACHE_TTL);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ai_learn_${learnId}`)
        .setLabel(t(lang, "ai.ogretButon"))
        .setStyle(ButtonStyle.Success)
        .setEmoji("🧠"),
      new ButtonBuilder()
        .setCustomId(`ai_ticket_${learnId}`)
        .setLabel(t(lang, "ai.ticketButon"))
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎫")
    );

    await message.reply({
      content: cevap,
      components: [row],
      allowedMentions: { repliedUser: false }
    }).catch(() => {});

    console.log(`🤖 [AI Groq] ${message.author.tag}: "${soru}" → Groq cevapladı (${groqSonuc.provider || "?"})`);
    return true;
  }

  // 8) Cevap bulunamadı: cevapsız kanalına gönder + hata mesajı + owner log
  const { t } = require("../dil");
  const hataMesaji = groqSonuc.error || (lang === "tr" ? "Anlamadım, bir hata oldu. Başka bir şekilde sorabilir misin?" : "I didn't understand, an error occurred. Can you rephrase?");

  await message.reply({
    content: hataMesaji,
    allowedMentions: { repliedUser: false }
  }).catch(() => {});

  console.log(`❌ [AI Hata] ${message.author.tag}: "${soru}" → ${groqSonuc.error}`);

  // Cevapsız sorular kanalına gönder (otomasyon aktifse)
  await cevapsizKanalaGonder(client, message, soru, lang);

  // Owner log: sadece GERÇEK hatalarda (rate-limit/yoğunluk mesajlarında atma)
  if (groqSonuc.statusCode !== 429) {
    await ownerLogAI(client, {
      type: "error",
      soru: soru,
      hata: groqSonuc.error || "AI yanıt veremedi",
      guild: message.guild,
      user: message.author,
      lang: lang
    });
  }

  return true;
}

/**
 * Cevapsız soruyu sunucunun no-answer kanalına gönder + "Cevap Ekle" butonu (30sn yanıt penceresi)
 */
async function cevapsizKanalaGonder(client, message, soru, lang) {
  try {
    if (!message.guild) return;
    const cfg = db.fetch(`otomasyon_${message.guild.id}`);
    if (!cfg?.aktif || !cfg.noAnswerKanal) return;
    // Premium bitmişse duraklatılmış sayılır — kanal bildirimi yapma
    try {
      const { otomasyonDurum } = require("../komutlar/otomasyon");
      const d = otomasyonDurum(message.guild.id);
      if (!d || d.bitmis) return;
    } catch {}
    const kanal = message.guild.channels.cache.get(cfg.noAnswerKanal);
    if (!kanal?.isTextBased()) return;
    const { t } = require("../dil");
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
    const cid = `cevapsiz_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
    learnCache.set(cid, { soru, soran: message.author.id, kanal: message.channel.id });
    setTimeout(() => learnCache.delete(cid), 60 * 1000);
    const e = new EmbedBuilder().setColor("Orange")
      .setTitle(t(lang, "ai.cevapsizBaslik"))
      .setDescription(t(lang, "ai.cevapsizAciklama", { kullanici: `${message.author}`, soru: soru.slice(0, 1500) }))
      .setFooter({ text: `RiseBunny • ${message.guild.name}` })
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ai_cevapekle_${cid}`).setLabel(t(lang, "ai.cevapEkleButon")).setStyle(ButtonStyle.Primary).setEmoji("✏️")
    );
    await kanal.send({ embeds: [e], components: [row] }).catch(() => {});
  } catch {}
}

/**
 * "RiseBunny'ye öğret" butonu interaction handler (çevirili, local'e kaydeder)
 */
async function learnButonIsle(interaction, client) {
  const customId = interaction.customId;
  if (!customId.startsWith("ai_learn_")) return false;
  const { t } = require("../dil");

  try {
    const learnId = customId.replace("ai_learn_", "");
    const data = learnCache.get(learnId);

    if (!data) {
      const lang = getLangSync(interaction.user.id);
      await interaction.reply({ content: t(lang, "ai.sureDoldu"), ephemeral: true }).catch(() => {});
      return true;
    }

    const { soru, cevap } = data;
    learnCache.delete(learnId); // Tek kullanımlık

    await ogrenenCevapKaydet(interaction, soru, cevap);
    return true;
  } catch (e) {
    console.error("[AI Learn Button Error]:", e);
    const lang = getLangSync(interaction.user.id);
    await interaction.reply({ content: t(lang, "ai.islemHata"), ephemeral: true }).catch(() => {});
    return true;
  }
}

/**
 * "Ticket Aç" butonu — sebep sorar (modal), sonra ayarlanan kategoriye ticket açar
 */
async function ticketButonIsle(interaction, client) {
  const customId = interaction.customId;
  if (!customId.startsWith("ai_ticket_")) return false;
  const { t } = require("../dil");
  try {
    const learnId = customId.replace("ai_ticket_", "");
    const data = learnCache.get(learnId);
    if (!data) {
      const lang = getLangSync(interaction.user.id);
      await interaction.reply({ content: t(lang, "ai.sureDoldu"), ephemeral: true }).catch(() => {});
      return true;
    }
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
    const modal = new ModalBuilder()
      .setCustomId(`ai_ticketsebep_${learnId}`)
      .setTitle("🎫 Ticket");
    const input = new TextInputBuilder()
      .setCustomId("sebep")
      .setLabel("Sebep / Reason")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(500);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal).catch(() => {});
    return true;
  } catch (e) {
    console.error("[AI Ticket Button Error]:", e);
    const lang = getLangSync(interaction.user.id);
    await interaction.reply({ content: t(lang, "ai.islemHata"), ephemeral: true }).catch(() => {});
    return true;
  }
}

/**
 * Ticket sebep modalı — ayarlanan kategoriye ticket açar
 */
async function ticketSebepModalIsle(interaction, client) {
  if (!interaction.isModalSubmit() || !interaction.customId.startsWith("ai_ticketsebep_")) return false;
  const { t, getLang } = require("../dil");
  try {
    const learnId = interaction.customId.replace("ai_ticketsebep_", "");
    const data = learnCache.get(learnId);
    if (!data) {
      const lang = await getLang(interaction.user.id);
      await interaction.reply({ content: t(lang, "ai.sureDoldu"), ephemeral: true }).catch(() => {});
      return true;
    }
    const sebep = (interaction.fields.getTextInputValue("sebep") || "").slice(0, 500) || data.soru;
    const { acBilet } = require("../komutlar/ticket");
    const lang = await getLang(interaction.user.id);
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: t(lang, "ortak.hata"), ephemeral: true }).catch(() => {});
      return true;
    }
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    // Otomasyon ticket kategorisi öncelikli, yoksa ticket.js varsayılanı
    let katId = null;
    try {
      const cfg = db.fetch(`otomasyon_${guild.id}`);
      if (cfg?.ticketKategori) katId = cfg.ticketKategori;
    } catch {}
    const kanal = await acBilet(client, guild, interaction.user, `${sebep} (rise: ${data.soru.slice(0, 40)})`.slice(0, 200), lang, null, katId);
    if (kanal) return interaction.editReply({ content: `🎫 ${kanal}` }).catch(() => {});
    return interaction.editReply({ content: t(lang, "ortak.hata") }).catch(() => {});
  } catch (e) {
    console.error("[AI Ticket Modal Error]:", e);
    return true;
  }
}

/**
 * "Cevap Ekle" butonu — 30sn içinde cevap yazmasını ister, sonra sunucu eğitimine kaydeder
 */
async function cevapEkleButonIsle(interaction, client) {
  if (!interaction.isButton() || !interaction.customId.startsWith("ai_cevapekle_")) return false;
  const { t, getLang } = require("../dil");
  try {
    const cid = interaction.customId.replace("ai_cevapekle_", "");
    const data = learnCache.get(cid);
    const lang = await getLang(interaction.user.id);
    if (!data) {
      await interaction.reply({ content: t(lang, "ai.cevapEkleSure"), ephemeral: true }).catch(() => {});
      return true;
    }
    await interaction.reply({ content: t(lang, "ai.cevapEkleAciklama", { soru: data.soru.slice(0, 1000) }), ephemeral: true }).catch(() => {});
    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
    collector.on("collect", async m => {
      try {
        const cevap = m.content.trim().slice(0, 2000);
        if (!cevap) return;
        const gid = interaction.guild?.id;
        if (gid) {
          const id = `oto_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
          db.set(`otoegitim_${gid}_${id}`, { soru: data.soru, cevap, ekleyen: interaction.user.id, tarih: Date.now() });
          try { matcher.cacheTemizle(); } catch {}
          try { const { ownerLog } = require("../utils"); ownerLog(client, `✏️ **Cevapsız soru cevaplandı** (<@${interaction.user.id}> ${interaction.user.tag}) — **${interaction.guild?.name}** (${gid})\n❓ ${data.soru.slice(0, 300)}\n💡 ${cevap.slice(0, 500)}`).catch(() => {}); } catch {}
        }
        learnCache.delete(cid);
        await interaction.followUp({ content: t(lang, "ai.cevapEkleOk"), ephemeral: true }).catch(() => {});
        try { await m.delete().catch(() => {}); } catch {}
      } catch {}
    });
    collector.on("end", async (_c, reason) => {
      if (reason === "time") {
        await interaction.followUp({ content: t(lang, "ai.cevapEkleSure"), ephemeral: true }).catch(() => {});
      }
    });
    return true;
  } catch (e) {
    console.error("[AI CevapEkle Error]:", e);
    return true;
  }
}

/**
 * Owner butonları handler (kaydet/sil/öğret)
 */
async function ownerButonIsle(interaction, client) {
  const customId = interaction.customId;
  
  // Owner AI kaydet butonu (çevirili)
  if (customId.startsWith("owner_ai_save_")) {
    const { t } = require("../dil");
    if (interaction.user.id !== OWNER_ID) {
      const lang = getLangSync(interaction.user.id);
      return interaction.reply({ content: t(lang, "ai.sadeceSahip"), ephemeral: true }).catch(() => {});
    }

    try {
      const oid = customId.replace("owner_ai_save_", "");
      let data = ownerCache.get(oid);
      if (!data) {
        try { data = JSON.parse(Buffer.from(oid, 'base64').toString()); } catch {}
      }
      if (!data || !data.soru) {
        const lang0 = getLangSync(interaction.user.id);
        await interaction.reply({ content: t(lang0, "ai.kayitSureDoldu"), ephemeral: true }).catch(() => {});
        return true;
      }
      const { soru, cevap } = data;

      const id = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      db.set(`ai_qa_${id}`, {
        soru: soru,
        cevap: cevap,
        kategori: "owner_saved",
        kaynak: "owner_approved",
        ekleyen: OWNER_ID,
        kullanim: 0,
        faydali: 0,
        created_at: Date.now()
      });

      try { matcher.cacheTemizle(); } catch {}

      const lang = getLangSync(interaction.user.id);

      await interaction.update({
        content: t(lang, "ai.sahipKaydetti", { soru, cevap }),
        components: [],
        embeds: []
      }).catch(() => {});

      console.log(`👑 [Owner AI Save] ${interaction.user.tag}: "${soru}" kaydedildi`);

    } catch (e) {
      console.error("[Owner AI Save Error]:", e);
      const lang = getLangSync(interaction.user.id);
      const { t } = require("../dil");
      await interaction.reply({ content: t(lang, "ai.kaydetHata"), ephemeral: true }).catch(() => {});
    }
    return true;
  }

  // Owner AI sil butonu (çevirili)
  if (customId.startsWith("owner_ai_delete_")) {
    const { t } = require("../dil");
    if (interaction.user.id !== OWNER_ID) {
      const lang = getLangSync(interaction.user.id);
      return interaction.reply({ content: t(lang, "ai.sadeceSahip"), ephemeral: true }).catch(() => {});
    }

    try {
      const oid = customId.replace("owner_ai_delete_", "");
      let data = ownerCache.get(oid);
      if (!data) {
        try { data = JSON.parse(Buffer.from(oid, 'base64').toString()); } catch {}
      }
      if (!data || !data.soru) {
        const lang0 = getLangSync(interaction.user.id);
        await interaction.reply({ content: t(lang0, "ai.kayitSureDoldu"), ephemeral: true }).catch(() => {});
        return true;
      }
      const { soru } = data;

      // Soruya benzer kayıtları bul ve sil
      const all = db.all() || {};
      let silinen = 0;
      for (const [key, value] of Object.entries(all)) {
        if (key.startsWith("ai_qa_") && value && value.soru && value.soru.toLowerCase().includes(soru.toLowerCase().slice(0, 50))) {
          db.delete(key);
          silinen++;
        }
      }
      
      try { matcher.cacheTemizle(); } catch {}

      const lang = getLangSync(interaction.user.id);
      const { t } = require("../dil");

      await interaction.update({
        content: t(lang, "ai.silindi", { soru, sayi: silinen }),
        components: [],
        embeds: []
      }).catch(() => {});

      console.log(`🗑️ [Owner AI Delete] ${interaction.user.tag}: "${soru}" silindi (${silinen} kayıt)`);

    } catch (e) {
      console.error("[Owner AI Delete Error]:", e);
      const lang = getLangSync(interaction.user.id);
      const { t } = require("../dil");
      await interaction.reply({ content: t(lang, "ai.silHata"), ephemeral: true }).catch(() => {});
    }
    return true;
  }

  // Owner AI öğret butonu (cevap veremediğinde, çevirili)
  if (customId.startsWith("owner_ai_teach_")) {
    const { t } = require("../dil");
    if (interaction.user.id !== OWNER_ID) {
      const lang = getLangSync(interaction.user.id);
      return interaction.reply({ content: t(lang, "ai.sadeceSahip"), ephemeral: true }).catch(() => {});
    }

    // Modal açarak sahibin cevap yazmasını sağla
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
    const oid = customId.replace("owner_ai_teach_", "");
    let tdata = ownerCache.get(oid);
    if (!tdata) {
      try { tdata = JSON.parse(Buffer.from(oid, 'base64').toString()); } catch {}
    }
    if (!tdata || !tdata.soru) {
      const lang0 = getLangSync(interaction.user.id);
      await interaction.reply({ content: t(lang0, "ai.kayitSureDoldu"), ephemeral: true }).catch(() => {});
      return true;
    }
    const { soru } = tdata;
    const mid = `ownm_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
    ownerCache.set(mid, { soru });
    setTimeout(() => ownerCache.delete(mid), OWNER_CACHE_TTL);

    const modal = new ModalBuilder()
      .setCustomId(`owner_ai_teach_modal_${mid}`)
      .setTitle("🧠 AI'ya Cevap Öğret");
    
    const input = new TextInputBuilder()
      .setCustomId("owner_ai_cevap")
      .setLabel("Cevabı Yaz")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Buraya AI'ın vermesi gereken cevabı yazın...")
      .setRequired(true)
      .setMaxLength(2000);
    
    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);
    
    await interaction.showModal(modal).catch(() => {});
    return true;
  }
  
  return false;
}

/**
 * Modal handler for owner teach
 */
async function ownerModalIsle(interaction, client) {
  const customId = interaction.customId;
  
  if (customId.startsWith("owner_ai_teach_modal_")) {
    const { t } = require("../dil");
    if (interaction.user.id !== OWNER_ID) {
      const lang = getLangSync(interaction.user.id);
      return interaction.reply({ content: t(lang, "ai.sadeceSahip"), ephemeral: true }).catch(() => {});
    }

    try {
      const mid = customId.replace("owner_ai_teach_modal_", "");
      let mdata = ownerCache.get(mid);
      if (!mdata) {
        try { mdata = JSON.parse(Buffer.from(mid, 'base64').toString()); } catch {}
      }
      if (!mdata || !mdata.soru) {
        const lang0 = getLangSync(interaction.user.id);
        await interaction.reply({ content: t(lang0, "ai.kayitSureDoldu"), ephemeral: true }).catch(() => {});
        return true;
      }
      const { soru } = mdata;
      ownerCache.delete(mid);
      const cevap = interaction.fields.getTextInputValue("owner_ai_cevap");

      const id = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      db.set(`ai_qa_${id}`, {
        soru: soru,
        cevap: cevap,
        kategori: "owner_taught",
        kaynak: "owner_taught",
        ekleyen: OWNER_ID,
        kullanim: 0,
        faydali: 0,
        created_at: Date.now()
      });

      try { matcher.cacheTemizle(); } catch {}

      const lang = getLangSync(interaction.user.id);

      await interaction.reply({
        content: t(lang, "ai.sahipKaydetti", { soru, cevap }),
        ephemeral: true
      }).catch(() => {});

      // Owner log
      await ownerLogAI(client, {
        type: "learn",
        soru: soru,
        cevap: cevap,
        guild: interaction.guild,
        user: interaction.user,
        lang: lang,
        action: "owner_taught"
      });

      console.log(`👑 [Owner AI Teach] ${interaction.user.tag}: "${soru}" öğretildi`);

    } catch (e) {
      console.error("[Owner AI Teach Modal Error]:", e);
      const lang = getLangSync(interaction.user.id);
      const { t } = require("../dil");
      await interaction.reply({ content: t(lang, "ai.ogretHata"), ephemeral: true }).catch(() => {});
    }
    return true;
  }

  return false;
}

/**
 * Owner log'a AI hata/öğrenme/cevap veremezse log gönder
 */
async function ownerLogAI(client, logData) {
  try {
    const { createOwnerLogError, createOwnerLogLearn, createOwnerLogNoAnswer } = require("./groq");
    
    let logResult;
    if (logData.type === "error") {
      logResult = require("./groq").createOwnerLogError({
        soru: logData.soru,
        hata: logData.hata,
        guild: logData.guild,
        user: logData.user,
        lang: logData.lang
      });
    } else if (logData.type === "learn") {
      logResult = require("./groq").createOwnerLogLearn({
        soru: logData.soru,
        cevap: logData.cevap,
        guild: logData.guild,
        user: logData.user,
        lang: logData.lang,
        action: logData.action
      });
    } else if (logData.type === "no_answer") {
      logResult = require("./groq").createOwnerLogNoAnswer({
        soru: logData.soru,
        guild: logData.guild,
        user: logData.user,
        lang: logData.lang
      });
    }
    
    if (logResult) {
      await ownerLog(client, {
        content: logResult.content,
        embeds: logResult.embeds,
        components: logResult.components
      }).catch(() => {});
    }
  } catch (e) {
    console.error("[AI OwnerLog Hatası]:", e);
  }
}

/** Yeni QA eklendiğinde cache temizle */
function cacheTemizle() {
  matcher.cacheTemizle();
}

module.exports = {
  aiIsle,
  learnButonIsle,
  ticketButonIsle,
  ticketSebepModalIsle,
  cevapEkleButonIsle,
  ownerButonIsle,
  ownerModalIsle,
  cacheTemizle,
  AI_CONFIG,
  matcher,
  learnCache
};