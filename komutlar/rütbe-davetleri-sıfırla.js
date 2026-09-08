const Discord = require("discord.js");
const Database = require("../Helpers/Database");
const { getLangSync, t } = require("../dil");


exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
    if(!message.member.permissions.has(Discord.PermissionFlagsBits.Administrator) && !message.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) return message.reply("Yetkin Yok!");

    const db2 = new Database("./Servers/" + message.guild.id, "Invites");

db2.set("invites")
message.channel.send((lang === "en" ? "Invites Reset" : "Davetler Sıfırlandı"))
}

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: 0
};
exports.help = {
  name: 'davetleri-sıfırla',
  description: 'Logo Yaparsınız',
  usage: 'm-logo <yazı>'
};

