const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getLangSync, komutAdi } = require("../dil");
const { DESTEK } = require("../utils");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const davet = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
  const embed = new EmbedBuilder()
    .setColor(0x36393F)
    .setTitle("RiseBunny")
    .setDescription((lang === "en" ? `**Use the button to invite**\n[Support Server](${DESTEK})` : `**Davet etmek için butonu kullan**\n[Destek Sunucusu](${DESTEK})`));
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel(lang === "en" ? "Invite" : "Davet Et").setStyle(ButtonStyle.Link).setURL(davet),
    new ButtonBuilder().setLabel(lang === "en" ? "Support Server" : "Destek Sunucusu").setStyle(ButtonStyle.Link).setURL(DESTEK)
  );
  await message.channel.send({ embeds: [embed], components: [row] });
};
exports.conf = { enabled: true, guildOnly: false, aliases: ["invite", "link"], kategori: "bot", permLevel: 0 };
exports.help = { name: "davet", description: "Bot davet ve destek linkleri.", usage: "davet" };
