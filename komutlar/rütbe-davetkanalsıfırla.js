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
	  const db = new Database("./Servers/" + message.guild.id, "Settings");
    if(!message.member.permissions.has(Discord.PermissionFlagsBits.Administrator) && !message.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) return message.reply(t(lang, "sistem.yetkiYok"))
    
    var type = ["Channel"];
    db.set(`settings`);

    message.reply((lang === "en" ? `Done.` : `Başarılı.`));


};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["davetkanalsıfırla","davet-kanalsıfırla","davetkanal-sıfırla"],
  permLevel: 0
};

exports.help = {
  name: 'davet-kanal-sıfırla',
  description: 'Bot adminlerinin bot üzerinde kod test etmesini sağlar.',
  usage: 'eval <kod>'
};