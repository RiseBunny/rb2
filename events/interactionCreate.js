const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { t, getLangSync } = require("../dil");
const U = require("../utils");
const croxydb = require("croxydb");
const db = croxydb;

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const lang = getGuildSync(interaction.guild?.id);
        
        // Config onay/red butonları
        if (interaction.isButton()) {
            const customId = interaction.customId;
            
            if (customId.startsWith("config_accept_") || customId.startsWith("config_reject_")) {
                if (!U.isAdmin(interaction.member)) {
                    return interaction.reply({ content: t(lang, "onlyAdmins"), ephemeral: true });
                }
                
                const accept = customId.startsWith("config_accept_");
                const configId = customId.split("_").pop();
                
                const configs = db.get("pendingConfigs") || [];
                const idx = configs.findIndex(c => c.id === configId);
                if (idx === -1) {
                    return interaction.reply({ content: t(lang, "config.notFound"), ephemeral: true });
                }
                
                const config = configs[idx];
                const newStatus = accept ? "approved" : "rejected";
                config.status = newStatus;
                config.reviewedBy = interaction.user.id;
                config.reviewedAt = Date.now();
                if (!accept) config.rejectedReason = "Sahip reddi";
                
                // Eğer onaylandıysa, approvedConfigs'e taşı
                if (accept) {
                    const approved = db.get("approvedConfigs") || [];
                    approved.push(config);
                    db.set("approvedConfigs", approved);
                }
                
                // Listeden kaldır
                const pending = db.get("pendingConfigs") || [];
                pending.splice(pending.findIndex(c => c.id === configId), 1);
                db.set("pendingConfigs", pending);
                
                // Log mesajını güncelle
                try {
                    const log = db.get(`configLog_${configId}`);
                    if (log) {
                        const channel = interaction.client.channels.cache.get(log.channelId);
                        if (channel) {
                            const msg = await channel.messages.fetch(log.messageId).catch(() => null);
                            if (msg) {
                                const newEmbed = Discord.EmbedBuilder.from(msg.embeds[0])
                                    .setColor(accept ? "Green" : "Red")
                                    .setFields(...msg.embeds[0].fields.map(f => {
                                        if (f.name === "Durum") return { name: f.name, value: accept ? "✅ Onaylandı" : "❌ Reddedildi", inline: true };
                                        return f;
                                    }))
                                    .addFields({ name: "Yetkili", value: `<@${interaction.user.id}>`, inline: true });
                                await msg.edit({ embeds: [newEmbed], components: [] });
                            }
                        }
                    }
                } catch {}
                
                // Yükleyene DM gönder
                try {
                    const user = await interaction.client.users.fetch(config.uploader).catch(() => null);
                    if (user) {
                        await user.send({
                            embeds: [new Discord.EmbedBuilder()
                                .setColor(accept ? "Green" : "Red")
                                .setTitle(accept ? "✅ Config Onaylandı" : "❌ Config Reddedildi")
                                .setDescription(accept
                                    ? `**${config.fileName}** configin onaylandı ve Vape configinde görünüyor.`
                                    : `**${config.fileName}** configin reddedildi. Sebep: Sahip reddi`)
                                .setTimestamp()
                            ]}).catch(() => {});
                    }
                } catch {}
                
                return interaction.update({ embeds: [new Discord.EmbedBuilder()
                    .setColor(accept ? "Green" : "Red")
                    .setTitle(accept ? "✅ Config Onaylandı" : "❌ Config Reddedildi")
                    .setDescription(accept
                        ? `\`${config.fileName}\` configi onaylandı ve Vape configinde görünüyor.`
                        : `\`${config.fileName}\` configi reddedildi. Sebep: Sahip reddi`)
                    .addFields({ name: "Yetkili", value: `<@${interaction.user.id}>`, inline: true })
                    .setTimestamp()
                ], components: [] });
            }
            
            // Config liste sayfalama
            if (customId.startsWith("configlist_")) {
                const [, action, pageStr] = customId.split("_");
                const page = parseInt(pageStr);
                const newPage = action === "prev" ? page - 1 : page + 1;
                
                // Yeni mesaj gönder (sayfa değişti)
                const pendingConfigs = db.get("pendingConfigs") || [];
                const allConfigs = [...pendingConfigs].reverse();
                const perPage = 10;
                const totalPages = Math.ceil(allConfigs.length / perPage);
                const currentPage = Math.max(1, Math.min(newPage, totalPages));
                const start = (currentPage - 1) * perPage;
                const pageConfigs = allConfigs.slice(start, start + perPage);
                
                const embed = new Discord.EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("📋 Config Listesi")
                    .setDescription(pageConfigs.map(c => {
                        const statusEmoji = c.status === "approved" ? "✅" : c.status === "rejected" ? "❌" : "⏳";
                        return `${statusEmoji} **#${c.id}** ${c.fileName} — <@${c.uploader}> (\`${c.uploaderName}\`) — ${c.status === "pending" ? "⏳" : c.status === "approved" ? "✅" : "❌"}`;
                    }).join("\n") || "—")
                    .setFooter({ text: `Sayfa ${currentPage}/${totalPages} • ${allConfigs.length} config/sayfa` })
                    .setTimestamp();
                
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`configlist_prev_${currentPage}`).setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 1),
                    new ButtonBuilder().setCustomId(`configlist_next_${currentPage}`).setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(currentPage === totalPages)
                );
                
                return interaction.update({ embeds: [embed], components: [row] });
            }
            
            // İletişim cevaplama butonu
            if (customId.startsWith("iletisim_reply_")) {
                if (!U.isMod(interaction.member)) {
                    return interaction.reply({ content: t(lang, "onlyMods"), ephemeral: true });
                }
                const msgId = customId.split("_").pop();
                
                const modal = new ModalBuilder()
                    .setCustomId(`iletisim_reply_modal_${msgId}`)
                    .setTitle("İletişim Yanıtı");
                
                const replyInput = new TextInputBuilder()
                    .setCustomId("reply")
                    .setLabel("Yanıtınız")
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Kullanıcıya gönderilecek yanıtı yazın...")
                    .setRequired(true)
                    .setMaxLength(2000);
                
                modal.addComponents(new ActionRowBuilder().addComponents(replyInput));
                return interaction.showModal(modal);
            }
        }
        
        // Modal submit - iletisim formu
        if (interaction.isModalSubmit() && interaction.customId === "iletisim_modal") {
            const subject = interaction.fields.getTextInputValue("subject");
            const message = interaction.fields.getTextInputValue("message");
            const userId = interaction.user.id;
            
            // Bot'a gönder (sahip loguna düşecek)
            await U.sendContactToBot(userId, interaction.user.username, subject, message);
            
            return interaction.reply({ 
                embeds: [new Discord.EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ Mesaj Gönderildi")
                    .setDescription("Mesajınız sahiplere iletildi. En kısa sürede size DM ile dönüş yapılır.")
                ], ephemeral: true });
        }
        
        // Modal submit - iletisim cevap
        if (interaction.isModalSubmit() && interaction.customId.startsWith("iletisim_reply_modal_")) {
            if (!U.isMod(interaction.member)) {
                return interaction.reply({ content: t(lang, "onlyMods"), ephemeral: true });
            }
            
            const msgId = interaction.customId.split("_").pop();
            const reply = interaction.fields.getTextInputValue("reply");
            
            const contact = db.get(`contact_${msgId}`);
            if (!contact) {
                return interaction.reply({ content: "Mesaj bulunamadı.", ephemeral: true });
            }
            
            // Kullanıcıya DM gönder
            try {
                const user = await interaction.client.users.fetch(contact.userId).catch(() => null);
                if (user) {
                    await user.send({
                        embeds: [new Discord.EmbedBuilder()
                            .setColor("Blurple")
                            .setTitle("📬 RiseBunny Destek Yanıtı")
                            .setDescription(reply)
                            .addFields(
                                { name: "Sizin Mesajınız", value: contact.message.slice(0, 900), inline: false },
                                { name: "Yanıtlayan Yetkili", value: `<@${interaction.user.id}>`, inline: true }
                            )
                            .setTimestamp()
                        ]});
                }
            } catch (e) {
                console.error("[DM] iletisim yaniti gonderilemedi:", e.message);
            }
            
            // Log güncelle
            db.set(`contact_${msgId}`, { ...contact, status: "replied", reply, repliedBy: interaction.user.id, repliedAt: Date.now() });
            
            // Sahip loguna bildir
            try {
                const logChannel = interaction.client.channels.cache.get(U.OWNER_LOG);
                if (logChannel) {
                    await logChannel.send({ embeds: [new Discord.EmbedBuilder()
                        .setColor("Green")
                        .setTitle("✅ İletişim Yanıtı Gönderildi")
                        .addFields(
                            { name: "Kayıt", value: `#${msgId}`, inline: true },
                            { name: "Kullanıcı", value: `<@${contact.userId}>\n\`${contact.userId}\``, inline: true },
                            { name: "Yetkili", value: `<@${interaction.user.id}>`, inline: true },
                            { name: "Orijinal Mesaj", value: contact.message.slice(0, 900) },
                            { name: "Gönderilen Yanıt", value: reply.slice(0, 900) }
                        )
                        .setTimestamp()]);
                }
            } catch {}
            
            return interaction.reply({ content: "✅ Yanıt gönderildi.", ephemeral: true });
        }
        
        // Config sil onay modalı
        if (interaction.isModalSubmit() && interaction.customId.startsWith("config_reject_modal_")) {
            // ... (config reddetme modalı için)
        }
    }
};