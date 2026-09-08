const { getLangSync, t } = require("../dil");
exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const bans = await message.guild.bans.fetch();
  return message.channel.send((lang === "en" ? `Your server has ${bans.size} banned members.` : `Sunucunuzda ${bans.size} yasaklı üye bulunmaktadır.`));
};
exports.conf = { enabled: true, guildOnly: true, aliases: ["ban-say"], permLevel: 0 };
exports.help = { name: "bansay", description: "Yasaklı üye sayısını gösterir.", usage: "bansay" };