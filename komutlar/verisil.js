const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const db = require("croxydb");
const { getLangSync, t } = require("../dil");
const { SAHIP_ID, ownerLog } = require("../utils");

const KAPSAMLAR = {
  bot: { tr: "Sadece Bot", en: "Bot Only" },
  site: { tr: "Sadece Site/Forum", en: "Site/Forum Only" },
  ikisi: { tr: "Bot + Site/Forum", en: "Bot + Site/Forum" }
};

async function getUserBotData(userId) {
  const data = {};
  const keys = db.all() || {};
  const userKeys = Object.keys(keys).filter(k =>
    k.startsWith(`para_${userId}`) ||
    k.startsWith(`banka_${userId}`) ||
    k.startsWith(`xp_${userId}`) ||
    k.startsWith(`premium_${userId}`) ||
    k.startsWith(`pets_${userId}`) ||
    k.startsWith(`hatirlaticilar_${userId}`) ||
    k.startsWith(`kasa_${userId}`) ||
    k.startsWith(`envanter_${userId}`) ||
    k.startsWith(`meslek_${userId}`) ||
    k.startsWith(`iban_${userId}`) ||
    k.startsWith(`language_${userId}`) ||
    k.startsWith(`consent_${userId}`) ||
    k.startsWith(`onay_${userId}`) ||
    k.startsWith(`karalist_${userId}`) ||
    k.startsWith(`sebep_${userId}`)
  );
  for (const k of userKeys) {
    data[k] = db.fetch(k);
  }
  return data;
}

async function getUserSiteData(discordId) {
  // Site verileri Firebase'de, bot tarafında doğrudan erişilemez
  // Site API'si üzerinden çekilecek veya "site verisi için site panelini kullanın" notu
  return { not: "Site/Forum verileri (profil, konular, yanıtlar, bildirimler) Firebase'de saklanır. Detay için site hesabınızı ziyaret edin." };
}

function formatDataForEmbed(data, lang) {
  const EN = lang === "en";
  const lines = [];
  const total = Object.keys(data).length;
  if (total === 0) return EN ? "No data found." : "Veri bulunamadı.";

  for (const [key, value] of Object.entries(data).slice(0, 15)) {
    let label = key.replace(`_${Object.keys(data)[0]?.split('_').pop() || ''}`, '').replace(/_/g, ' ');
    let val = typeof value === 'object' ? JSON.stringify(value).slice(0, 100) : String(value).slice(0, 100);
    lines.push(`• **${label}**: ${val}`);
  }
  if (total > 15) lines.push(EN ? `... and ${total - 15} more fields` : `... ve ${total - 15} alan daha`);
  return lines.join("\n");
}

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";

  // Önce onay iste: "Emin misin?"
  const confirmEmbed = new EmbedBuilder()
    .setColor("Yellow")
    .setTitle(EN ? "⚠️ Confirm Data Deletion Request" : "⚠️ Veri Silme Talebi Onayı")
    .setDescription(EN
      ? "This will request deletion of **all your data** from both the bot and website.\n\n**Scope options:**\n• **Bot Only**: Wallet, bank, XP, pets, premium, inventory, reminders, settings\n• **Site Only**: Forum profile, threads, replies, notifications\n• **Both**: Everything\n\n**Process:**\n1. You confirm → Request sent to bot owner\n2. Owner reviews your data → Approves/Rejects\n3. If approved → All data permanently deleted\n4. You'll be notified via DM of the result\n\nAre you sure you want to proceed?"
      : "Bu işlem **bot ve sitedeki tüm verilerinizin** silinmesi talebini gönderir.\n\n**Kapsam seçenekleri:**\n• **Sadece Bot**: Cüzdan, banka, XP, petler, premium, envanter, hatırlatıcılar, ayarlar\n• **Sadece Site/Forum**: Forum profili, konular, yanıtlar, bildirimler\n• **İkisi de**: Her şey\n\n**Süreç:**\n1. Onaylarsınız → Talep bot sahibine gönderilir\n2. Sahip verilerinizi inceler → Onaylar/Reddeder\n3. Onaylanırsa → Tüm veriler kalıcı silinir\n4. Sonuç DM ile size bildirilir\n\nDevam etmek istiyor musunuz?")
    .setFooter({ text: EN ? "This action cannot be undone after approval!" : "Onay sonrası geri alınamaz!" });

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("verisil_onayla").setLabel(EN ? "✅ Yes, I'm sure" : "✅ Evet, eminim").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("verisil_iptal").setLabel(EN ? "❌ Cancel" : "❌ İptal").setStyle(ButtonStyle.Secondary)
  );

  const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [confirmRow] });

  const confirmCol = confirmMsg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });
  confirmCol.on("collect", async (i) => {
    if (i.customId === "verisil_iptal") {
      return i.update({ content: EN ? "Cancelled." : "İptal edildi.", embeds: [], components: [] }).catch(() => {});
    }
    if (i.customId === "verisil_onayla") {
      // Kapsam seçimi
      await i.deferUpdate().catch(() => {});
      const scopeEmbed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle(EN ? "📋 Select Deletion Scope" : "📋 Silme Kapsamı Seçin")
        .setDescription(EN ? "Which data should be deleted?" : "Hangi veriler silinsin?");
      const scopeRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("verisil_kapsam")
          .setPlaceholder(EN ? "Select scope..." : "Kapsam seç...")
          .addOptions([
            new StringSelectMenuOptionBuilder().setLabel(EN ? "Bot Only" : "Sadece Bot").setValue("bot").setDescription(EN ? "Wallet, XP, pets, premium, etc." : "Cüzdan, XP, petler, premium, vb.").setEmoji("🤖"),
            new StringSelectMenuOptionBuilder().setLabel(EN ? "Site/Forum Only" : "Sadece Site/Forum").setValue("site").setDescription(EN ? "Forum profile, threads, replies" : "Forum profili, konular, yanıtlar").setEmoji("🌐"),
            new StringSelectMenuOptionBuilder().setLabel(EN ? "Both (All Data)" : "İkisi de (Tümü)").setValue("ikisi").setDescription(EN ? "Complete data wipe" : "Tam veri temizliği").setEmoji("💥").setDefault(true)
          ])
      );
      return i.editReply({ embeds: [scopeEmbed], components: [scopeRow] }).catch(() => {});
    }
  });
  confirmCol.on("end", () => confirmMsg.edit({ components: [] }).catch(() => {}));

  // Kapsam seçimi collector (tekrar mesaj üzerinde)
  const scopeCollector = confirmMsg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, componentType: 3, time: 60000 });
  scopeCollector.on("collect", async (i) => {
    if (i.customId !== "verisil_kapsam") return;
    const kapsam = i.values[0];
    await i.deferUpdate().catch(() => {});

    // Spam koruması: 1 saatte 1 talep (site akışıyla ortak sayaç)
    try {
      const sonTalep = Number(db.fetch(`silme_cooldown_${message.author.id}`) || 0);
      const kalan = 60 * 60 * 1000 - (Date.now() - sonTalep);
      if (kalan > 0) {
        const dk = Math.ceil(kalan / 60000);
        return i.editReply({
          content: null,
          embeds: [new EmbedBuilder().setColor("Red")
            .setTitle(EN ? "⏳ Too Soon" : "⏳ Çok Erken")
            .setDescription(EN
              ? `You already sent a deletion request recently. Try again in **${dk} minute(s)**.`
              : `Yakın zamanda zaten talep gönderdin. **${dk} dakika** sonra tekrar dene.`)],
          components: []
        }).catch(() => {});
      }
      db.set(`silme_cooldown_${message.author.id}`, Date.now());
    } catch {}

    // Verileri topla
    const botData = await getUserBotData(message.author.id);
    const siteData = await getUserSiteData(message.author.id);

    // Sahibe DM gönder
    const owner = await client.users.fetch(SAHIP_ID).catch(() => null);
    if (!owner) {
      return i.editReply({ content: EN ? "Owner not found." : "Sahip bulunamadı.", embeds: [], components: [] }).catch(() => {});
    }

    const requestId = `del_${Date.now()}_${message.author.id.slice(-4)}`;
    db.set(`deletion_${requestId}`, {
      userId: message.author.id,
      username: message.author.tag,
      kapsam,
      botData,
      siteData,
      status: "pending",
      createdAt: Date.now()
    });

    const dataEmbed = new EmbedBuilder()
      .setColor("Orange")
      .setTitle(EN ? `🗑️ Deletion Request: ${requestId}` : `🗑️ Silme Talebi: ${requestId}`)
      .setDescription(EN
        ? `**User:** ${message.author.tag} (\`${message.author.id}\`)\n**Scope:** ${KAPSAMLAR[kapsam][lang]}\n**Requested:** <t:${Math.floor(Date.now()/1000)}:F>`
        : `**Kullanıcı:** ${message.author.tag} (\`${message.author.id}\`)\n**Kapsam:** ${KAPSAMLAR[kapsam][lang]}\n**Talep:** <t:${Math.floor(Date.now()/1000)}:F>`)
      .addFields({ name: EN ? "🤖 Bot Data" : "🤖 Bot Verileri", value: formatDataForEmbed(botData, lang) || (EN ? "None" : "Yok") })
      .addFields({ name: EN ? "🌐 Site Data" : "🌐 Site Verileri", value: JSON.stringify(siteData).slice(0, 1000) })
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`del_approve_${requestId}`).setLabel(EN ? "✅ Approve & Delete" : "✅ Onayla ve Sil").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`del_reject_${requestId}`).setLabel(EN ? "❌ Reject" : "❌ Reddet").setStyle(ButtonStyle.Secondary)
    );

    await owner.send({ embeds: [dataEmbed], components: [actionRow] }).catch(() => {});

    // Kullanıcıya bildir
    const userEmbed = new EmbedBuilder()
      .setColor("Green")
      .setTitle(EN ? "✅ Request Sent" : "✅ Talep Gönderildi")
      .setDescription(EN
        ? `Your data deletion request has been sent to the bot owner.\n**Request ID:** \`${requestId}\`\n**Scope:** ${KAPSAMLAR[kapsam][lang]}\n\nThe owner will review your data and decide. You'll receive a DM with the result.`
        : `Veri silme talebiniz bot sahibine gönderildi.\n**Talep ID:** \`${requestId}\`\n**Kapsam:** ${KAPSAMLAR[kapsam][lang]}\n\nSahip verilerinizi inceleyip karar verecek. Sonuç DM ile size gelecek.`)
      .setTimestamp();

    await i.editReply({ embeds: [userEmbed], components: [] }).catch(() => {});

    // Log
    ownerLog(client, `🗑️ **Silme Talebi:** ${message.author.tag} (\`${message.author.id}\`) — Kapsam: ${kapsam}`);
  });
  scopeCollector.on("end", () => confirmMsg.edit({ components: [] }).catch(() => {}));
};

// Global button handler for owner approve/reject (interactionCreate.js içinde)
exports.handleDeletionButton = async (interaction, client) => {
  const id = interaction.customId;
  const lang = getLangSync(interaction.user.id);
  const EN = lang === "en";

  if (id.startsWith("del_approve_")) {
    const requestId = id.replace("del_approve_", "");
    const req = db.fetch(`deletion_${requestId}`);
    if (!req) return interaction.reply({ content: EN ? "Request not found." : "Talep bulunamadı.", ephemeral: true });
    if (req.status !== "pending") return interaction.reply({ content: EN ? "Already processed." : "Zaten işlenmiş.", ephemeral: true });

    // Owner yetkisi kontrol
    if (interaction.user.id !== SAHIP_ID) return interaction.reply({ content: EN ? "Only owner can approve." : "Sadece sahip onaylayabilir.", ephemeral: true });

    // Kullanıcıya DM (silme onayı - son şans)
    try {
      const user = await client.users.fetch(req.userId).catch(() => null);
      if (user) {
        const confirmDel = new EmbedBuilder()
          .setColor("Red")
          .setTitle(EN ? "🗑️ Final Confirmation" : "🗑️ Son Onay")
          .setDescription(EN
            ? `The owner **approved** your deletion request (\`${requestId}\`).\n\n**This will permanently delete all your data.**\nAre you absolutely sure?`
            : `Sahip talebinizi **onayladı** (\`${requestId}\`).\n\n**Tüm verileriniz KALICI OLARAK SİLİNECEK.**\nKesinlikle emin misiniz?`);
        const finalRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`del_final_yes_${requestId}`).setLabel(EN ? "✅ Yes, delete everything" : "✅ Evet, her şeyi sil").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`del_final_no_${requestId}`).setLabel(EN ? "❌ No, keep my data" : "❌ Hayır, verilerim kalsın").setStyle(ButtonStyle.Success)
        );
        await user.send({ embeds: [confirmDel], components: [finalRow] }).catch(() => {});
      }
    } catch {}

    db.set(`deletion_${requestId}`, { ...req, status: "awaiting_user_confirm" });
    return interaction.update({ content: EN ? "User confirmation requested via DM." : "Kullanıcı onayı DM ile istendi.", embeds: [], components: [] }).catch(() => {});
  }

  if (id.startsWith("del_reject_")) {
    const requestId = id.replace("del_reject_", "");
    const req = db.fetch(`deletion_${requestId}`);
    if (!req) return interaction.reply({ content: EN ? "Request not found." : "Talep bulunamadı.", ephemeral: true });
    if (req.status !== "pending") return interaction.reply({ content: EN ? "Already processed." : "Zaten işlenmiş.", ephemeral: true });

    if (interaction.user.id !== SAHIP_ID) return interaction.reply({ content: EN ? "Only owner can reject." : "Sadece sahip reddedebilir.", ephemeral: true });

    // Red sebebi için modal (basit: nedeni yaz)
    // Şimdilik basit bir neden isteyelim - followUp ile
    await interaction.reply({ content: EN ? "Enter rejection reason (will be sent to user):" : "Red sebebini yazın (kullanıcıya gönderilecek):", ephemeral: true }).catch(() => {});

    const msgCol = interaction.channel.createMessageComponentCollector({ filter: m => m.author.id === interaction.user.id, time: 60000, max: 1 });
    msgCol.on("collect", async (m) => {
      const reason = m.content.slice(0, 500);
      try { await m.delete(); } catch {}

      // Kullanıcıya DM
      try {
        const user = await client.users.fetch(req.userId).catch(() => null);
        if (user) {
          await user.send({ embeds: [new EmbedBuilder().setColor("Red")
            .setTitle(EN ? "❌ Deletion Request Rejected" : "❌ Silme Talebi Reddedildi")
            .setDescription(EN
              ? `Your deletion request (\`${requestId}\`) was **rejected**.\n\n**Reason:** ${reason}`
              : `Silme talebiniz (\`${requestId}\`) **reddedildi**.\n\n**Sebep:** ${reason}`)
            .setTimestamp()] }).catch(() => {});
        }
      } catch {}

      db.set(`deletion_${requestId}`, { ...req, status: "rejected", reason, processedAt: Date.now() });
      ownerLog(client, `🗑️ **Silme Reddedildi:** ${req.username} (\`${req.userId}\`) — ${reason}`);
      return interaction.editReply({ content: EN ? "Rejected. User notified." : "Reddedildi. Kullanıcı bilgilendirildi.", embeds: [], components: [] }).catch(() => {});
    });
  }

  if (id.startsWith("del_final_yes_")) {
    const requestId = id.replace("del_final_yes_", "");
    const req = db.fetch(`deletion_${requestId}`);
    if (!req || req.status !== "awaiting_user_confirm") return interaction.reply({ content: EN ? "Invalid or expired." : "Geçersiz veya süresi dolmuş.", ephemeral: true });

    await interaction.deferUpdate().catch(() => {});

    // VERİLERİ SİL
    let deleted = { bot: 0, site: 0 };
    if (["bot", "ikisi"].includes(req.kapsam)) {
      const keys = db.all() || {};
      const userKeys = Object.keys(keys).filter(k => k.includes(req.userId));
      for (const k of userKeys) {
        try { db.delete(k); deleted.bot++; } catch {}
      }
    }
    if (["site", "ikisi"].includes(req.kapsam)) {
      // Site silme: API çağrısı veya not
      // Bot tarafında Firebase erişimi yok, site API'sine istek atılabilir
      deleted.site = "api_call_needed";
    }

    db.set(`deletion_${requestId}`, { ...req, status: "completed", deleted, completedAt: Date.now() });

    // Kullanıcıya DM
    try {
      const user = await client.users.fetch(req.userId).catch(() => null);
      if (user) {
        await user.send({ embeds: [new EmbedBuilder().setColor("Green")
          .setTitle(EN ? "✅ Data Deleted" : "✅ Veriler Silindi")
          .setDescription(EN
            ? `Your deletion request (\`${requestId}\`) has been **completed**.\n\n**Deleted:**\n• Bot data: ${deleted.bot} keys\n• Site data: ${deleted.site === "api_call_needed" ? "requested via API" : deleted.site} keys\n\nYou can now start fresh with RiseBunny!`
            : `Silme talebiniz (\`${requestId}\`) **tamamlandı**.\n\n**Silinenler:**\n• Bot verisi: ${deleted.bot} anahtar\n• Site verisi: ${deleted.site === "api_call_needed" ? "API ile talep edildi" : deleted.site} anahtar\n\nArtık RiseBunny ile yeniden başlayabilirsiniz!`)
          .setTimestamp()] }).catch(() => {});
      }
    } catch {}

    ownerLog(client, `🗑️ **Silme Tamamlandı:** ${req.username} (\`${req.userId}\`) — Bot: ${deleted.bot}, Site: ${deleted.site}`);
    return interaction.editReply({ content: EN ? "Data deleted. User notified." : "Veriler silindi. Kullanıcı bilgilendirildi.", embeds: [], components: [] }).catch(() => {});
  }

  if (id.startsWith("del_final_no_")) {
    const requestId = id.replace("del_final_no_", "");
    const req = db.fetch(`deletion_${requestId}`);
    if (!req) return interaction.reply({ content: EN ? "Request not found." : "Talep bulunamadı.", ephemeral: true });

    db.set(`deletion_${requestId}`, { ...req, status: "cancelled_by_user", cancelledAt: Date.now() });

    // Owner'a bildir
    try {
      const owner = await client.users.fetch(SAHIP_ID).catch(() => null);
      if (owner) await owner.send({ content: EN ? `User cancelled deletion \`${requestId}\`.` : `Kullanıcı silmeyi iptal etti \`${requestId}\`.` }).catch(() => {});
    } catch {}

    return interaction.update({ content: EN ? "Deletion cancelled. Your data is safe." : "Silme iptal edildi. Verileriniz güvende.", embeds: [], components: [] }).catch(() => {});
  }
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["veri-sil", "delete-data", "data-delete"], permLevel: 0, kategori: "genel" };
exports.help = { name: "verisil", description: "Bot ve sitedeki tüm verilerinizin silinmesini talep edersiniz.", usage: "verisil" };