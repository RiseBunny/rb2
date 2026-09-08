const ms = require('ms');
const { PermissionsBitField } = require('discord.js');
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
    // v14 yetki kontrolü
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.channel.send(t(lang, "sistem.mesajYonet"));
    }

    if (!args[0]) {
        return message.channel.send((lang === "en" ? ' Please specify the giveaway message ID!' : ' Lütfen Yapılan Çekilişin Mesaj IDsini Belirtin!'));
    }

    // Çekilişi bul: önce prize göre (args join) veya messageID'ye göre
    let giveaway =
        client.giveawaysManager.giveaways.find((g) => g.prize === args.join(' ')) ||
        client.giveawaysManager.giveaways.find((g) => g.messageID === args[0]);

    if (!giveaway) {
        return message.channel.send((lang === "en" ? ' Giveaway message not found `' : 'Çekiliş Mesajı Bulunamadı `') + args.join(' ') + '`.');
    }

    // Çekilişi hemen bitir (setEndTimestamp ile)
    client.giveawaysManager.edit(giveaway.messageID, {
        setEndTimestamp: Date.now()
    })
    .then(() => {
        message.channel.send((lang === "en" ? 'Giveaway Ended Successfully!' : 'Çekiliş Başarıyla Sona Erdirildi!'));
    })
    .catch((e) => {
        // Hata mesajını kontrol et (discord-giveaways sürümüne göre değişebilir)
        if (e.startsWith && e.startsWith(`${giveaway.messageID} ID'li Çekiliş Sona Ermedi.`)) {
            message.channel.send((lang === "en" ? 'Giveaway Ended Successfully!' : 'Çekiliş Başarıyla Sonlandırıldı!'));
        } else {
            console.error(e);
            message.channel.send((lang === "en" ? ' An error occurred...' : 'Bir Hata Oluştu...'));
        }
    });
};

exports.conf = {
    aliases: ['end', 'bitir'],
    permLevel: 0,
};
exports.help = {
    name: 'sonlandır',
    description: 'Çekilişi Sonlandırır.',
    usage: 'sonlandır <mesajID>'
};