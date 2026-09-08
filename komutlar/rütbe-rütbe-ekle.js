const Discord = require("discord.js");
const Database = require("../Helpers/Database");
const { getLangSync, t } = require("../dil");
// exports.onLoad = (client) => {};
/**
 * @param {Discord.Client} client 
 * @param {Discord.Message} message 
 * @param {Array<String>} args 
 */
exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
    if(!message.member.permissions.has(Discord.PermissionFlagsBits.Administrator) && !message.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) return message.reply("Yetkin Yok!");

    
    var roleId = message.mentions.roles.first(), targetInvite = Number(args[1]);
  /*  if(!message.guild.roles.cache.has(roleId)) return message.reply("no such role.");*/
    if(isNaN(targetInvite)) return message.reply((lang === "en" ? "Enter A Number" : "Bir Numara Gir"));

    const db = new Database("./Servers/" + message.guild.id, "Rewards");

    var rewards = db.get("rewards") || [];
    rewards.push({
        Id: roleId.id,
        Invite: targetInvite
    });

    db.set("rewards", rewards);
const embed = new Discord.EmbedBuilder()
.setDescription((lang === "en" ? `**A total of ${targetInvite} invites is required to reach the ${roleId} role.**` : `**${roleId} Rolünü Ulaşabilmek İçin Toplam ${targetInvite} Davet Yapmaları Gerekmektedir.**`))
message.channel.send({ embeds: [embed] })
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["davetrol"],
  permLevel: 0
};
exports.help = {
  name: 'davet-rol',
  description: 'Logo Yaparsınız',
  usage: 'm-logo <yazı>'
};
