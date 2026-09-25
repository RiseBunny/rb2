const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require("discord.js");
const { t, getLangSync } = require("../dil");
const U = require("../utils");
const croxydb = require("croxydb");
const db = croxydb;

module.exports = {
    help: { name: "iletisim", aliases: ["contact", "mesaj", "message"], category: "genel" },
    conf: { enabled: true, guildOnly: false, dmOnly: true },
    async run(client, message, args) {
        const lang = getGuildLang(message.guild?.id);
        
        const modal = new ModalBuilder()
            .setCustomId("iletisim_modal")
            .setTitle(t(lang, "contact.title"));
        
        const subjectInput = new TextInputBuilder()
            .setCustomId("subject")
            .setLabel(t(lang, "contact.subjectLabel"))
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(t(lang, "contact.subjectPlaceholder"))
            .setRequired(true)
            .setMaxLength(120);
        
        const messageInput = new TextInputBuilder()
            .setCustomId("message")
            .setLabel(t(lang, "contact.messageLabel"))
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(t(lang, "contact.messagePlaceholder"))
            .setRequired(true)
            .setMaxLength(2000);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(subjectInput),
            new ActionRowBuilder().addComponents(messageInput)
        );
        
        return message.showModal(modal);
    }
};