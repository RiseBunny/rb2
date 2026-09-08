const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { t, getLang, setLang, setGuildLang, hasGuildLang } = require("../dil");
const { ownerLog } = require("../utils");
const db = require("croxydb");

module.exports = async (interaction) => {
  try {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "dil_sec") {
        const sec = interaction.values[0];
        setLang(interaction.user.id, sec);
        if (interaction.guild && interaction.guild.ownerId === interaction.user.id && !hasGuildLang(interaction.guild.id)) {
          setGuildLang(interaction.guild.id, sec);
        }
        return interaction.reply({ content: t(sec, "ortak.dilOk"), ephemeral: true });
      }
      if (interaction.customId === "sdil_sec") {
        const sec = interaction.values[0];
        const klang = await getLang(interaction.user.id);
        if (!interaction.guild) return interaction.reply({ content: t(klang, "ortak.hata"), ephemeral: true });
        const isOwner = interaction.guild.ownerId === interaction.user.id;
        if (!isOwner && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild))
          return interaction.reply({ content: t(klang, "ortak.sunucuDilGerek"), ephemeral: true });
        setGuildLang(interaction.guild.id, sec);
        const dilAdi = sec === "en" ? "English" : "Türkçe";
        return interaction.reply({ content: t(sec, "ortak.sunucuDilOk", { dil: dilAdi }), ephemeral: true });
      }
      if (interaction.customId === "yardim_kategori") {
        const katId = interaction.values[0];
        const lang = await getLang(interaction.user.id);
        const { katAdi } = require("../dil");
        const { kategoriListesi } = require("../komutlar/yardım");
        const { PREFIX } = require("../utils");
        const satirlar = kategoriListesi(interaction.client, lang, katId);
        const embed = new EmbedBuilder()
          .setAuthor({ name: `${katAdi(lang, katId)}`, iconURL: interaction.client.user.displayAvatarURL() })
          .setColor("Random")
          .setDescription(satirlar.length ? satirlar.join("\n").slice(0, 3900) : "-")
          .setFooter({ text: `RiseBunny • ${PREFIX}` })
          .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
      }
    }

    if (interaction.isButton()) {
      const id = interaction.customId || "";

      // --- Raid koruma butonları (Aç / Kapat) ---
      if (id === "raid_btn_ac" || id === "raid_btn_kapat") {
        const lang = await getLang(interaction.user.id);
        const isOwner = Boolean(interaction.guild && interaction.guild.ownerId === interaction.user.id);
        if (!isOwner && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: t(lang, "sistem.yonetici"), ephemeral: true });
        }
        const key = `raidkoruma_${interaction.guild.id}`;
        const { PREFIX } = require("../utils");
        const prefix = process.env.PREFIX || PREFIX;

        if (id === "raid_btn_ac") {
          const current = db.fetch(key);
          const esik = current?.esik || 5;
          const rol = current?.rol || null;
          db.set(key, { durum: "açık", esik, rol });

          const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle(t(lang, "raid.embedBaslik"))
            .setDescription(t(lang, "raid.durumAcik", { esik, rol: rol ? `<@&${rol}>` : t(lang, "raid.rolYok"), prefix }))
            .setFooter({ text: `RiseBunny • ${prefix}raid` })
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("raid_btn_ac").setLabel(t(lang, "raid.butonAc")).setStyle(ButtonStyle.Success).setEmoji("🛡️").setDisabled(true),
            new ButtonBuilder().setCustomId("raid_btn_kapat").setLabel(t(lang, "raid.butonKapat")).setStyle(ButtonStyle.Danger).setEmoji("❌").setDisabled(false)
          );

          return interaction.update({ embeds: [embed], components: [row] }).catch(() => {});
        } else if (id === "raid_btn_kapat") {
          try { db.delete(key); } catch {}

          const embed = new EmbedBuilder()
            .setColor("Red")
            .setTitle(t(lang, "raid.embedBaslik"))
            .setDescription(t(lang, "raid.durumKapali", { prefix }))
            .setFooter({ text: `RiseBunny • ${prefix}raid` })
            .setTimestamp();

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("raid_btn_ac").setLabel(t(lang, "raid.butonAc")).setStyle(ButtonStyle.Success).setEmoji("🛡️").setDisabled(false),
            new ButtonBuilder().setCustomId("raid_btn_kapat").setLabel(t(lang, "raid.butonKapat")).setStyle(ButtonStyle.Danger).setEmoji("❌").setDisabled(true)
          );

          return interaction.update({ embeds: [embed], components: [row] }).catch(() => {});
        }
      }

      // --- Ticket aç (panel) ---
      if (id === "ticket_ac") {
        const { acBilet } = require("../komutlar/ticket");
        const lang = await getLang(interaction.user.id);
        await interaction.deferReply({ ephemeral: true }).catch(() => {});
        const guild = interaction.guild;
        const mevcutId = db.fetch(`ass.${guild.id}.${interaction.user.id}`);
        if (mevcutId && guild.channels.cache.get(mevcutId)) {
          return interaction.editReply({ content: "Zaten açık bir biletin var." }).catch(() => {});
        }
        // Sebep için varsayılan: modal yerine hızlı bilet (buton akışını bozmamak için)
        const kanal = await acBilet(interaction.client, guild, interaction.user, "destek", lang, null);
        if (kanal) return interaction.editReply({ content: `Biletin açıldı: ${kanal}` }).catch(() => {});
        return interaction.editReply({ content: t(lang, "ortak.hata") }).catch(() => {});
      }

      // --- Ticket kapat / sil ---
      if (id.startsWith("ticket_kapat_") || id.startsWith("ticket_sil_")) {
        const kanalId = id.split("_").pop();
        const kanal = interaction.guild.channels.cache.get(kanalId) || interaction.channel;
        const lang = await getLang(interaction.user.id);
        if (!kanal) return interaction.reply({ content: t(lang, "ortak.hata"), ephemeral: true });
        if (id.startsWith("ticket_kapat_")) {
          await kanal.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false }).catch(() => {});
          const opener = db.fetch(`ticket.${interaction.guild.id}.${kanal.id}`)?.acan;
          if (opener) {
            const uye = await interaction.guild.members.fetch(opener).catch(() => null);
            if (uye) await kanal.permissionOverwrites.edit(uye, { ViewChannel: true, SendMessages: false }).catch(() => {});
          }
          await kanal.setName(`closed-${kanal.name.slice(0, 80)}`).catch(() => {});
          await ownerLog(interaction.client, new EmbedBuilder().setColor("Grey").setDescription(`🔒 Bilet kapatıldı: **${interaction.guild.name}** | ${interaction.user.tag} | #${kanal.name}`));
          return interaction.reply({ content: t(lang, "ticket.kapatildi", { kullanici: `${interaction.user}` }) });
        } else {
          await interaction.reply({ content: t(lang, "ticket.silinecek") });
          const kayit = db.fetch(`ticket.${interaction.guild.id}.${kanal.id}`);
          if (kayit?.acan && typeof db.delete === "function") {
            try { db.delete(`ass.${interaction.guild.id}.${kayit.acan}`); db.delete(`ticket.${interaction.guild.id}.${kanal.id}`); } catch {}
          }
          await ownerLog(interaction.client, new EmbedBuilder().setColor("Red").setDescription(`⛔ Bilet silindi: **${interaction.guild.name}** | ${interaction.user.tag} | #${kanal.name}`));
          setTimeout(() => kanal.delete().catch(() => {}), 5000);
          return;
        }
      }

      // --- Kick onay ---
      if (id.startsWith("kick_evet_") || id === "kick_hayir") {
        if (id === "kick_hayir") {
          await interaction.update({ content: "İşlem iptal oldu!", embeds: [], components: [] }).catch(() => {});
          return;
        }
        const [, , hedefId, isteyenId] = id.split("_");
        if (interaction.user.id !== isteyenId) return interaction.reply({ content: "Bu onayı sadece komutu kullanan kişi verebilir.", ephemeral: true });
        const uye = await interaction.guild.members.fetch(hedefId).catch(() => null);
        if (!uye || !uye.kickable) return interaction.reply({ content: "Atamıyorum (yetki/rol).", ephemeral: true });
        try { await uye.kick(`Onaylı kick: ${interaction.user.tag}`); } catch { return interaction.reply({ content: "Kick başarısız.", ephemeral: true }); }
        await ownerLog(interaction.client, new EmbedBuilder().setColor("Orange").setDescription(`👢 Kick: **${uye.user.tag}** | **${interaction.guild.name}** | Yetkili: ${interaction.user.tag}`));
        return interaction.update({ content: `✅ **${uye.user.tag}** sunucudan atıldı!`, embeds: [], components: [] }).catch(() => {});
      }

      // --- Ban onayı ---
      if (id.startsWith("ban_evet_") || id === "ban_hayir") {
        if (id === "ban_hayir") {
          return interaction.update({ content: "İşlem iptal oldu!", embeds: [], components: [] }).catch(() => {});
        }
        const [, , hedefId, isteyenId] = id.split("_");
        if (interaction.user.id !== isteyenId) return interaction.reply({ content: "Bu onayı sadece komutu kullanan kişi verebilir.", ephemeral: true });
        const uye = await interaction.guild.members.fetch(hedefId).catch(() => null);
        if (!uye || !uye.bannable) return interaction.reply({ content: "Banlayamıyorum (yetki/rol).", ephemeral: true });
        try { await uye.ban({ reason: `Onaylı ban: ${interaction.user.tag}` }); } catch { return interaction.reply({ content: "Ban başarısız.", ephemeral: true }); }
        await ownerLog(interaction.client, new EmbedBuilder().setColor("Red").setDescription(`🔨 Ban: **${uye.user.tag}** | **${interaction.guild.name}** | Yetkili: ${interaction.user.tag}`));
        return interaction.update({ content: `✅ **${uye.user.tag}** sunucudan banlandı!`, embeds: [], components: [] }).catch(() => {});
      }

      // --- Kupon kullan onayı (v2 format: para/pet/premium) ---
      if (id.startsWith("kupon_evet_")) {
        const parca = id.split("_");
        const isteyenId = parca[parca.length - 1];
        const kod = parca.slice(2, -1).join("_");
        if (interaction.user.id !== isteyenId) return interaction.reply({ content: "Bu onayı sadece komutu kullanan kişi verebilir.", ephemeral: true });
        const lang = await getLang(interaction.user.id);
        const EN = lang === "en";
        const kupon = db.fetch(`kupon_${kod}`);
        if (!kupon) return interaction.update({ content: EN ? "Invalid coupon." : "Geçersiz kupon.", embeds: [], components: [] }).catch(() => {});
        // Eski format (saf sayı) geri uyumluluk
        if (typeof kupon === "number") {
          db.add(`para_${interaction.user.id}`, kupon);
          db.set(`usedCoupons.${kod}`, true);
          return interaction.update({ content: EN ? `Congratulations, you earned ${kupon.toLocaleString()} 💸!` : `Tebrikler, ${kupon.toLocaleString()} 💸 kazandınız!`, embeds: [], components: [] }).catch(() => {});
        }
        if (kupon.yer === "site") return interaction.update({ content: EN ? "🌐 This coupon is website-only (Discord login required)." : "🌐 Bu kupon sadece sitede kullanılabilir (Discord girişi şart).", embeds: [], components: [] }).catch(() => {});
        if (kupon.bitis && Date.now() > kupon.bitis) return interaction.update({ content: EN ? "Expired coupon." : "Kuponun süresi dolmuş.", embeds: [], components: [] }).catch(() => {});
        if (kupon.limit && (kupon.calismalar || 0) >= kupon.limit) return interaction.update({ content: EN ? "Usage limit reached." : "Kullanım limitine ulaşılmış.", embeds: [], components: [] }).catch(() => {});
        if (db.fetch(`kupon_kullandi_${kod}_${interaction.user.id}`)) return interaction.update({ content: EN ? "You already used this coupon." : "Bu kuponu zaten kullandın.", embeds: [], components: [] }).catch(() => {});
        let mesaj = "";
        if (kupon.tip === "premium") {
          const gun = Number(kupon.premiumGun) || 30;
          const U = require("../utils");
          U.addPremium(interaction.user.id, gun * 24 * 60 * 60 * 1000);
          mesaj = EN ? `💎 ${gun} days of premium activated!` : `💎 ${gun} gün premium aktif!`;
        } else if (kupon.tip === "pet") {
          const pets = db.get(`pets_${interaction.user.id}`) || [];
          pets.push({ name: kupon.petAd || "Tavşan", emoji: kupon.petEmoji || "🐰", rarity: "coupon", price: Number(kupon.petFiyat) || 50000 });
          db.set(`pets_${interaction.user.id}`, pets);
          mesaj = EN ? `${kupon.petEmoji || "🐰"} ${kupon.petAd || "Tavşan"} joined your pets!` : `${kupon.petEmoji || "🐰"} ${kupon.petAd || "Tavşan"} petlerine eklendi!`;
        } else {
          const miktar = Number(kupon.miktar) || 0;
          db.add(`para_${interaction.user.id}`, miktar);
          mesaj = EN ? `Congratulations, you earned ${miktar.toLocaleString()} 💸!` : `Tebrikler, ${miktar.toLocaleString()} 💸 kazandın!`;
        }
        db.set(`kupon_kullandi_${kod}_${interaction.user.id}`, Date.now());
        db.set(`kupon_${kod}`, { ...kupon, calismalar: (kupon.calismalar || 0) + 1 });
        return interaction.update({ content: mesaj, embeds: [], components: [] }).catch(() => {});
      }
      if (id === "kupon_hayir") {
        return interaction.update({ content: "İşlem iptal edildi.", embeds: [], components: [] }).catch(() => {});
      }
      // --- V2.0 kupon bilgi butonu (yardım menüsü) ---
      if (id === "kupon_bilgi_v2") {
        const lang = await getLang(interaction.user.id);
        const EN = lang === "en";
        const { EmbedBuilder } = require("discord.js");
        const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "🎟️ RISE-V2 Launch Coupon" : "🎟️ RISE-V2 Yayın Kuponu")
          .setDescription(EN
            ? "**250,000 RiseBunny Cash** — permanent, one per account.\n\n**How to redeem:**\n1️⃣ Go to **risebunny.vercel.app**\n2️⃣ Sign in with **Discord** (top right)\n3️⃣ Open **RiseBunny Bot → Hesabım & Mağaza**\n4️⃣ Enter `RISE-V2` in the coupon box"
            : "**250.000 RiseBunny Cash** — süresiz, hesap başına tek.\n\n**Nasıl kullanılır:**\n1️⃣ **risebunny.vercel.app**'e gir\n2️⃣ Sağ üstten **Discord ile giriş** yap\n3️⃣ **RiseBunny Bot → Hesabım & Mağaza** bölümünü aç\n4️⃣ Kupon kutusuna `RISE-V2` yaz");
        return interaction.reply({ embeds: [e], ephemeral: true }).catch(() => {});
      }
      // --- Kupon silme menüsü (sahip paneli) ---
      if (id.startsWith("kupon_sil_") && interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
        const kod = (interaction.values[0] || "").replace("kupon_sil_", "");
        const { SAHIP_ID } = require("../utils");
        if (interaction.user.id !== SAHIP_ID) return interaction.reply({ content: "Yetkin yok.", ephemeral: true });
        try { db.delete(`kupon_${kod}`); } catch {}
        try { const l = db.get("kuponListesi") || []; db.set("kuponListesi", l.filter(k => k.kod !== kod)); } catch {}
        return interaction.reply({ content: `Kupon \`${kod}\` silindi.`, ephemeral: true }).catch(() => {});
      }

      // --- Kupon sil (sahip, eski buton yolu) ---
      if (id.startsWith("kupon_sil_")) {
        const kod = id.slice("kupon_sil_".length);
        const { SAHIP_ID } = require("../utils");
        if (interaction.user.id !== SAHIP_ID) return interaction.reply({ content: "Yetkin yok.", ephemeral: true });
        try { db.delete(`kupon_${kod}`); } catch {}
        try { const l = db.get("kuponListesi") || []; db.set("kuponListesi", l.filter(k => k.kod !== kod)); } catch {}
        return interaction.update({ content: `Kupon \`${kod}\` silindi.`, embeds: [], components: [] }).catch(() => {});
      }

      // --- Market satın alma onayı ---
      if (id.startsWith("market_evet_")) {
        const [, , ilanId, isteyenId] = id.split("_");
        if (interaction.user.id !== isteyenId) return interaction.reply({ content: "Bu onayı sadece komutu kullanan kişi verebilir.", ephemeral: true });
        const lang = await getLang(interaction.user.id);
        const EN = lang === "en";
        const liste = db.get("marketListesi") || [];
        const ilan = liste.find(l => l.id === Number(ilanId));
        if (!ilan) return interaction.update({ content: EN ? "Listing not found." : "İlan bulunamadı.", embeds: [], components: [] }).catch(() => {});
        const bakiye = Number(db.fetch(`para_${interaction.user.id}`) || 0);
        if (bakiye < ilan.fiyat) return interaction.update({ content: EN ? "Insufficient balance." : "Yetersiz bakiye.", embeds: [], components: [] }).catch(() => {});
        db.subtract(`para_${interaction.user.id}`, ilan.fiyat);
        db.add(`para_${ilan.satanId}`, ilan.fiyat);
        const aliciPets = db.get(`pets_${interaction.user.id}`) || [];
        aliciPets.push(ilan.pet);
        db.set(`pets_${interaction.user.id}`, aliciPets);
        db.set("marketListesi", liste.filter(l => l.id !== Number(ilanId)));
        ownerLog(interaction.client, new EmbedBuilder().setColor("Gold").setTitle("💱 Pazar Satışı")
          .setDescription(`**Alıcı:** <@${interaction.user.id}> (\`${interaction.user.id}\`)\n**Satıcı:** <@${ilan.satanId}> (\`${ilan.satanId}\`)\n**Pet:** ${ilan.pet.emoji} **${ilan.pet.name}**\n**Fiyat:** ${ilan.fiyat.toLocaleString()} 💸`)
          .setTimestamp()).catch(() => {});
        return interaction.update({ content: EN ? `You bought ${ilan.pet.emoji} **${ilan.pet.name}** for ${ilan.fiyat.toLocaleString()} 💸!` : `${ilan.pet.emoji} **${ilan.pet.name}** petini ${ilan.fiyat.toLocaleString()} 💸 karşılığında satın aldın!`, embeds: [], components: [] }).catch(() => {});
      }
      if (id === "market_hayir") {
        return interaction.update({ content: "İşlem iptal edildi.", embeds: [], components: [] }).catch(() => {});
      }

      // --- Blackjack ---
      if (id.startsWith("bj_cek_") || id.startsWith("bj_kal_")) {
        const parcalar = id.split("_");
        const istek = parcalar[2];
        if (interaction.user.id !== istek) return interaction.reply({ content: "Bu oyun sadece komutu kullanan kişiye aittir.", ephemeral: true });
        const lang = await getLang(interaction.user.id);
        const EN = lang === "en";
        const durum = db.get(`bj_${interaction.user.id}`);
        if (!durum) return interaction.update({ content: EN ? "No active game." : "Aktif oyun yok.", embeds: [], components: [] }).catch(() => {});

        const kartDegeri = (k) => k.deger === "A" ? 11 : (["J","Q","K"].includes(k.deger) ? 10 : parseInt(k.deger));
        const elToplam = (el) => { let t = el.reduce((s,k)=>s+kartDegeri(k),0); let a = el.filter(k=>k.deger==="A").length; while(t>21&&a>0){t-=10;a--;} return t; };
        const elGoster = (el) => el.map(k=>`${k.deger}${k.renk}`).join(" ");

        const bitir = (baslik, aciklama, renk) => {
          db.delete(`bj_${interaction.user.id}`);
          return interaction.update({ embeds: [new EmbedBuilder().setColor(renk).setTitle(baslik).setDescription(aciklama)], components: [] }).catch(() => {});
        };

        if (id.startsWith("bj_cek_")) {
          durum.oyuncu.push(durum.deste.pop());
          const toplam = elToplam(durum.oyuncu);
          if (toplam > 21) {
            db.subtract(`para_${interaction.user.id}`, durum.miktar);
            return bitir("🃏 Blackjack", EN ? `You busted (${toplam}) and lost **${durum.miktar.toLocaleString()} 💸**.` : `Bust oldun (${toplam}) ve **${durum.miktar.toLocaleString()} 💸** kaybettin.`, "Red");
          }
          if (toplam === 21) {
            // Otomatik kal -> kurpiyer oynar
            while (elToplam(durum.kasa) < 17) durum.kasa.push(durum.deste.pop());
            const kasaT = elToplam(durum.kasa);
            if (kasaT > 21 || kasaT < toplam) { db.add(`para_${interaction.user.id}`, durum.miktar); return bitir("🃏 Blackjack", EN ? `You won! Dealer: ${kasaT}, You: ${toplam}. **+${durum.miktar.toLocaleString()} 💸**` : `Kazandın! Kurpiyer: ${kasaT}, Sen: ${toplam}. **+${durum.miktar.toLocaleString()} 💸**`, "Green"); }
            if (kasaT === toplam) { return bitir("🃏 Blackjack", EN ? `Push! Both ${toplam}. Money returned.` : `Berabere! İkisi de ${toplam}. Para iade.`, "Grey"); }
            db.subtract(`para_${interaction.user.id}`, durum.miktar); return bitir("🃏 Blackjack", EN ? `Dealer wins (${kasaT}). You lost **${durum.miktar.toLocaleString()} 💸**.` : `Kurpiyer kazandı (${kasaT}). **${durum.miktar.toLocaleString()} 💸** kaybettin.`, "Red");
          }
          db.set(`bj_${interaction.user.id}`, durum);
          const e = new EmbedBuilder().setColor("Blue").setTitle("🃏 Blackjack")
            .setDescription(EN ? `**Your hand:** ${elGoster(durum.oyuncu)} (${toplam})\n**Dealer:** ${elGoster([durum.kasa[0]])} + ?` : `**Elin:** ${elGoster(durum.oyuncu)} (${toplam})\n**Kurpiyer:** ${elGoster([durum.kasa[0]])} + ?`);
          return interaction.update({ embeds: [e] }).catch(() => {});
        }

        // bj_kal_ (stand)
        while (elToplam(durum.kasa) < 17) durum.kasa.push(durum.deste.pop());
        const kasaT = elToplam(durum.kasa);
        const oyuncuT = elToplam(durum.oyuncu);
        if (kasaT > 21 || kasaT < oyuncuT) { db.add(`para_${interaction.user.id}`, durum.miktar); return bitir("🃏 Blackjack", EN ? `You won! Dealer: ${kasaT}, You: ${oyuncuT}. **+${durum.miktar.toLocaleString()} 💸**` : `Kazandın! Kurpiyer: ${kasaT}, Sen: ${oyuncuT}. **+${durum.miktar.toLocaleString()} 💸**`, "Green"); }
        if (kasaT === oyuncuT) { return bitir("🃏 Blackjack", EN ? `Push! Both ${oyuncuT}. Money returned.` : `Berabere! İkisi de ${oyuncuT}. Para iade.`, "Grey"); }
        db.subtract(`para_${interaction.user.id}`, durum.miktar); return bitir("🃏 Blackjack", EN ? `Dealer wins (${kasaT}). You lost **${durum.miktar.toLocaleString()} 💸**.` : `Kurpiyer kazandı (${kasaT}). **${durum.miktar.toLocaleString()} 💸** kaybettin.`, "Red");
      }
    }

    // Modal submit (ileride ticket sebep modalı için hazır)
    if (interaction.isModalSubmit() && interaction.customId === "ticket_sebep") {
      const sebep = interaction.fields.getTextInputValue("sebep") || "destek";
      const { acBilet } = require("../komutlar/ticket");
      const lang = await getLang(interaction.user.id);
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
      const kanal = await acBilet(interaction.client, interaction.guild, interaction.user, sebep.slice(0, 60), lang, null);
      if (kanal) return interaction.editReply({ content: `Biletin açıldı: ${kanal}` }).catch(() => {});
      return interaction.editReply({ content: t(lang, "ortak.hata") }).catch(() => {});
    }
  } catch (e) {
    console.error("Interaction hatası:", e.message);
    try { if (!interaction.replied) await interaction.reply({ content: "Hata oluştu.", ephemeral: true }); } catch {}
  }
};
