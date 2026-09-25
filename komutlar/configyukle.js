const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { t, getLangSync } = require("../dil");
const U = require("../utils");
const croxydb = require("croxydb");
const db = croxydb;

module.exports = {
    help: { name: "configyükle", aliases: ["config-yukle", "configyukle"], category: "admin" },
    conf: { enabled: true, guildOnly: true, ownerOnly: true, permLevel: 5 },
    async run(client, message, args) {
        const lang = getGuildLang(message.guild?.id);
        if (!message.attachments?.size) {
            return message.reply({ embeds: [new Discord.EmbedBuilder().setColor("Red").setDescription(t(lang, "config.noAttachment"))] });
        }
        const attachment = message.attachments.first();
        if (!attachment.name.endsWith(".json")) {
            return message.reply({ embeds: [new Discord.EmbedBuilder().setColor("Red").setDescription(t(lang, "config.invalidFormat"))] });
        }
        try {
            const configData = JSON.parse(await (await fetch(attachment.url)).text());
            if (!configData.modules || !Array.isArray(configData.modules)) {
                return message.reply({ embeds: [new Discord.EmbedBuilder().setColor("Red").setDescription(t(lang, "config.invalidStructure"))] });
            }
        } catch {
            return message.reply({ embeds: [new Discord.EmbedBuilder().setColor("Red").setDescription(t(lang, "config.invalidJson"))] });
        }

        const configId = U.randomId(8);
        const config = {
            id: configId,
            uploader: message.author.id,
            uploaderName: message.author.username,
            fileName: attachment.name,
            configData: configData,
            status: "pending",
            createdAt: Date.now()
        };
        db.push(`pendingConfigs`, config);

        const embed = new Discord.EmbedBuilder()
            .setColor("Yellow")
            .setTitle("📤 Yeni Config Yüklendi")
            .addFields(
                { name: "Yükleyen", value: `<@${message.author.id}> (${message.author.username})`, inline: true },
                { name: "Config ID", value: `\`${configId}\``, inline: true },
                { name: "Dosya", value: attachment.name, inline: true },
                { name: "Modül Sayısı", value: String(configData.modules.length), inline: true },
                { name: "Durum", value: "⏳ Onay Bekliyor", inline: true }
            )
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`config_accept_${configId}`).setLabel("Kabul Et").setStyle(ButtonStyle.Success).setEmoji("✅"),
            new ButtonBuilder().setCustomId(`config_reject_${configId}`).setLabel("Reddet").setStyle(ButtonStyle.Danger).setEmoji("❌")
        );

        const ownerLogChannel = client.channels.cache.get(U.OWNER_LOG);
        if (ownerLogChannel) {
            const sent = await ownerLogChannel.send({ embeds: [embed], components: [row] });
            db.set(`configLog_${configId}`, { channelId: ownerLogChannel.id, messageId: sent.id });
        }

        return message.reply({ embeds: [new Discord.EmbedBuilder().setColor("Green").setDescription(t(lang, "config.uploaded", { id: configId }))] });
    }
};