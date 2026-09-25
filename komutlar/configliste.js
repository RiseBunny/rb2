const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits } = require("discord.js");
const { t, getLangSync } = require("../dil");
const U = require("../utils");
const croxydb = require("croxydb");
const db = croxydb;

module.exports = {
    help: { name: "configliste", aliases: ["config-liste", "configlist"], category: "admin" },
    conf: { enabled: true, guildOnly: true, ownerOnly: true, permLevel: 5 },
    async run(client, message, args) {
        const lang = getLangSync(message.guild?.id);
        const page = parseInt(args[0]) || 1;
        const perPage = 10;
        
        const pendingConfigs = db.get("pendingConfigs") || [];
        const allConfigs = [...pendingConfigs].reverse();
        
        if (!allConfigs.length) {
            return message.reply({ embeds: [new Discord.EmbedBuilder().setColor("Blue").setDescription(t(lang, "config.listEmpty"))] });
        }
        
        const totalPages = Math.ceil(allConfigs.length / perPage);
        const currentPage = Math.max(1, Math.min(page, totalPages));
        const start = (currentPage - 1) * perPage;
        const pageConfigs = allConfigs.slice(start, start + perPage);
        
        const embed = new Discord.EmbedBuilder()
            .setColor("Blue")
            .setTitle(t(lang, "config.listTitle"))
            .setDescription(pageConfigs.map(c => {
                const statusEmoji = c.status === "approved" ? "✅" : c.status === "rejected" ? "❌" : "⏳";
                return `${statusEmoji} **#${c.id}** ${c.fileName} — <@${c.uploader}> (\`${c.uploaderName}\`) — ${c.status === "pending" ? "⏳" : c.status === "approved" ? "✅" : "❌"}`;
            }).join("\n") || "—")
            .setFooter({ text: `${t("config.page", { current: currentPage, total: totalPages })} • ${allConfigs.length} ${t("config.perPage")}` })
            .setTimestamp();
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`configlist_prev_${currentPage}`).setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 1),
            new ButtonBuilder().setCustomId(`configlist_next_${currentPage}`).setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(currentPage === totalPages)
        );
        
        return message.reply({ embeds: [embed], components: [row] });
    }
};