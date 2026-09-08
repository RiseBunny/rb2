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

    let giveaway =
        client.giveawaysManager.giveaways.find((g) => g.prize === args.join(' ')) ||
        client.giveawaysManager.giveaways.find((g) => g.messageID === args[0]);

    if (!giveaway) {
        return message.channel.send((lang === "en" ? ' Giveaway message not found `' : 'Çekiliş Mesajı Bulunamadı `') + args.join(' ') + '`.');
    }

    // reroll metodu v14'te aynı kalır
    client.giveawaysManager.reroll(giveaway.messageID)
        .then(() => {
            message.channel.send((lang === "en" ? 'Giveaway Winner Rerolled!' : 'Çekiliş Kazananı Yenilendi!'));
        })
        .catch((e) => {
            if (e.startsWith && e.startsWith(`${giveaway.messageID} ID'li Çekiliş Sona Ermedi.`)) {
                message.channel.send((lang === "en" ? 'This giveaway has not ended yet!' : 'Bu çekiliş henüz bitmedi!'));
            } else {
                console.error(e);
                message.channel.send((lang === "en" ? ' An error occurred...' : 'Bir Hata Oluştu...'));
            }
        });
};

exports.conf = {
    aliases: ['yenile'],
    permLevel: 0,
};
exports.help = {
    name: 'reroll',
    description: 'Çekilişi yeniler.',
    usage: 'reroll <mesajID>'
};