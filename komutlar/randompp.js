const { EmbedBuilder } = require("discord.js");
const { getLangSync, t } = require("../dil");
exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const users = [...client.users.cache.values()].filter(user => !user.bot);
  const user = users[Math.floor(Math.random() * users.length)] || message.author;
  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle((lang === "en" ? "Random profile" : "Rastgele profil"))
    .setDescription(`${user.tag}`)
    .setThumbnail(user.displayAvatarURL({ size: 512 }));
  return message.channel.send({ embeds: [embed] });
};
exports.conf = { enabled: true, guildOnly: false, aliases: ["random-pp"], permLevel: 0 };
exports.help = { name: "randompp", description: "Rastgele bir profil gösterir.", usage: "randompp" };