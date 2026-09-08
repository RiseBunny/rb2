const ms = require('ms');
const { PermissionsBitField } = require('discord.js'); // v14 için eklendi
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
    // v14'te hasPermission yerine permissions.has() kullanılır.
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.channel.send(t(lang, "sistem.mesajYonet"));
    }

    let giveawayChannel = message.mentions.channels.first();
    if (!giveawayChannel) {
        return message.channel.send((lang === "en" ? ' Please Mention A Channel! or copy this => r!giveaway #giveawaychannel 1 1d PremiumRiseBunny (the 1d at the end means 1 day, write PremiumRiseBunny with no spaces or it will not work) ' : ' Lütfen Bir Kanal Etiketle! yada şunu kopyala => r!çekiliş #cekiliskanali 1 1d PremiumRiseBunny (sondaki 1d=1gün ve sonda yazdığım PremiumRiseBunny yi boşluksuz yazın aksi taktirde çalışmaz) '));
        // Aşağıdaki satırlar return'den sonra çalışmaz, gereksiz. Kaldırıldı.
    }

    let giveawayDuration = args[1];
    if (!giveawayDuration || isNaN(ms(giveawayDuration))) {
        return message.channel.send((lang === "en" ? ' You need to specify a valid duration!' : ' Geçerli bir süre belirtmeniz gerekiyor!'));
    }

    let giveawayNumberWinners = args[2];
    if (isNaN(giveawayNumberWinners) || (parseInt(giveawayNumberWinners) <= 0)) {
        return message.channel.send((lang === "en" ? ' You need to specify a valid winner count!' : ' Geçerli bir kazanan sayısı belirtmeniz gerekiyor!'));
    }

    let giveawayPrize = args.slice(3).join(' ');
    if (!giveawayPrize) {
        return message.channel.send((lang === "en" ? ' You must specify a valid prize!' : ' Geçerli bir ödül belirtmelisiniz!'));
    }

    // discord-giveaways paketi v14 ile uyumludur. Değişiklik gerekmez.
    client.giveawaysManager.start(giveawayChannel, {
        time: ms(giveawayDuration),
        prize: giveawayPrize,
        winnerCount: giveawayNumberWinners,
        hostedBy: process.env.hostedBy ? message.author : null,
        messages: {
            giveaway: (process.env.everyoneMention ? "@everyone\n\n" : "") + " <a1140647136376148018>  **ÇEKİLİŞ** <a1140647136376148018>  ",
            giveawayEnded: (process.env.everyoneMention ? "@everyone\n\n" : "") + "🎉🎉 **ÇEKİLİŞ SONA ERDİ** 🎉🎉",
            timeRemaining: "Kalan süre: **{duration}**!",
            inviteToParticipate: "Katılmak için 🎉 tepkisine tıklayın!",
            winMessage: "Tebrikler, {winners}! **{prize}** Ödülünü Kazandın!",
            embedFooter: "Çekiliş",
            noWinner: "Giveaway iptal edildi, geçerli katılım yok.",
            hostedBy: "Çekilişi Yapan: {user}",
            winners: "Kazanan",
            endedAt: "Sona Erdi",
            units: {
                seconds: "saniye",
                minutes: "dakika",
                hours: "saat",
                days: "gün",
                pluralS: false
            }
        }
    });

    message.channel.send((lang === "en" ? `Giveaway Started In ${giveawayChannel}!` : `Çekiliş ${giveawayChannel} Kanalında Başlatıldı!`));
    // message.delete() kullanımı isteğe bağlı, ancak yukarıda kaldırıldı. İsterseniz ekleyin.
};

exports.conf = {
    aliases: ['start', 'çekiliş'],
    permLevel: 0,
};
exports.help = {
    name: 'başlat',
    description: 'Çekilişi Başlatır.',
    usage: 'başlat #kanal <Süre> <Kazanacak Kişi Sayısı> <Ödül Adı>'
};