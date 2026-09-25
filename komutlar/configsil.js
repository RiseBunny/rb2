const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");
const { t, getLangSync } = require("../dil");
const U = require("../utils");
const croxydb = require("croxydb");
const db = croxydb;

module.exports = {
    help: { name: "configsil", aliases: ["config-sil", "configdelete"], category: "admin" },
    conf: { enabled: true, guildOnly: true, ownerOnly: true, permLevel: 5 },
    async run(client, message, args) {
        const lang = getLangSync(message.guild?.id);
        if (!args.length) {
            return message.reply({ embeds: [new Discord.EmbedBuilder().setColor("Red").setDescription(t(lang, "config.deleteUsage"))] });
        }
        
        const ids = args[0].split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
        if (!ids.length) return message.reply({ embeds: [new Discord.EmbedBuilder().setColor("Red").setDescription(t(lang, "config.deleteUsage"))] });
        
        let deleted = 0, notFound = 0;
        for (const id of ids) {
            const configs = db.get("pendingConfigs") || [];
            const idx = configs.findIndex(c => c.id === id);
            if (idx === -1) { notFound++; continue; }
            configs.splice(idx, 1);
            db.set("pendingConfigs", configs);
            deleted++;
        }
        
        const embed = new Discord.EmbedBuilder().setColor(deleted ? "Green" : "Red");
        if (deleted) embed.addFields({ name: t(lang, "config.deleted"), value: deleted.toString(), inline: true });
        if (notFound) embed.addFields({ name: t(lang, "config.notFound"), value: notFound.toString(), inline: true });
        
        return message.reply({ embeds: [embed] });
    }
};