const Discord = require('discord.js');
const { PermissionsBitField } = require('discord.js');
const db = require('croxydb');
const { getLangSync, t } = require("../dil");

exports.run = (client, message, args) => {
  const lang = getLangSync(message.author.id);
    // v14 yetki kontrolü
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.channel.send(t(lang, "sistem.yonetici"));
    }

    const rol = db.fetch(`otoRL_${message.guild.id}`);
    if (!rol) return message.reply((lang === "en" ? ` Autorole is already off.` : ` Otorol sistemi zaten kapalı.`));

    message.channel.send((lang === "en" ? ` Autorole reset successfully.` : ` Otorol sistemi başarıyla sıfırlandı.`));

    db.delete(`otoRL_${message.guild.id}`);
    db.delete(`otoRK_${message.guild.id}`);
    db.delete(`otoRM_${message.guild.id}`);
};

exports.conf = {
    enabled: true,
    guildOnly: false,
    permLevel: 0,
    aliases: ['otorol-sıfırla']
};

exports.help = {
    name: 'otorol-kapat',
    description: 'Türkiyenin Saatini Gösterir',
    usage: 'gç'
};