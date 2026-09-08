
const Discord = require("discord.js");
const { getLangSync, t } = require("../dil");
exports.run = async (client, message, args, level) => {
  const lang = getLangSync(message.author.id);
  const toplamkomut = new Discord.EmbedBuilder()

    .setTitle(lang === "en" ? `Command Count` : `Komut Sayısı`)
    .setAuthor({ name: (lang === "en" ? `RiseBunny  |  Total Command Count` : `RiseBunny  |  Toplam Komut Sayısı`) })
    .setDescription(
      (lang === "en" ? `✅ **RiseBunny Total**  \`` : `✅ **RiseBunny de  Toplam**  \``) +
        client.commands.size +
        (lang === "en" ? `\` **Wow, commands!**` : `\` **Komut Var vay be!**`)
    )
    .setColor("#00ff00")
    .setTimestamp()
    .setFooter({ text: (lang === "en" ? `Using RiseBunny is a privilege!` : `RiseBunny kullanmak bir ayrıcalıktır!`), iconURL: client.user.displayAvatarURL() });

  return message.channel.send({ embeds: [toplamkomut] });
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['toplamkomut','toplam-komut','topkomut'],
  permLevel: 0
};

exports.help = {
  name: "komutlar",
  description: "Toplam Komut",
  usage: "toplamkomut"
};
