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
    if(!message.member.permissions.has(Discord.PermissionFlagsBits.Administrator) && !message.member.permissions.has(Discord.PermissionFlagsBits.ManageGuild)) return message.reply(t(lang, "sistem.yetkiYok"));

    var victim = message.mentions.members.size > 0 ? message.mentions.members.first().id : args.length > 0 ? args[0] : undefined;
    if(!victim) return message.reply((lang === "en" ? "Please Write Someone's ID" : "Lütfen Birinin İD Sini Yaz"));
    victim = message.guild.members.cache.get(victim);
    if(!victim) return message.reply((lang === "en" ? "The Person Whose ID You Wrote Is Not On The Server." : "İD Sini Yazdığınız Kişi Sunucuda Bulunmamaktadır."));

    var num = Number(args[1]);
    if(isNaN(num)) return message.reply((lang === "en" ? "Please Enter The Bonus Number." : "Lütfen Bonus Olacak Sayı Giriniz."));
    const db = new Database("./Servers/" + message.guild.id, "Invites");

    var bonus = (db.add(`invites.${victim.id}.bonus`, num) || 0), total = (db.get(`invites.${victim.id}.total`) || 0);
    message.channel.send((lang === "en" ? `Around ${num} Bonus Added To ${victim}.` : `${victim} Adlı Kişiye ${num} Civarı Bonus Eklendi.`));

    global.onUpdateInvite(victim, message.guild.id, total + bonus);
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: 0
};
exports.help = {
  name: 'bonus-ekle',
  description: 'Logo Yaparsınız',
  usage: 'm-logo <yazı>'
};
