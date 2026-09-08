const db = require('croxydb');
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
    const user = message.author;

    const receiverIban = args[0];
    if (!receiverIban) return message.channel.send((lang === "en" ? 'You must specify the recipient IBAN number for the transfer.' : 'Para transferi için alıcının IBAN numarasını belirtmelisiniz.'));

    const amount = parseFloat(args[1]);
    if (isNaN(amount) || amount <= 0 || amount > 200000) return message.channel.send((lang === "en" ? 'You must specify a valid amount, max 200,000 TL per transfer.' : 'Geçerli bir miktar belirtmelisiniz ve en fazla 200,000 TL transfer yapabilirsiniz.'));

    const senderIban = db.get(`iban_${user.id}`);
    if (!senderIban) return message.channel.send({ content: (lang === "en" ? 'You must have an IBAN number first. Use the `iban` command to create one.' : 'Öncelikle bir IBAN numaranız olmalıdır. IBAN numarası oluşturmak için `iban-olustur` komutunu kullanabilirsiniz.') });

    if (receiverIban === senderIban) return message.channel.send((lang === "en" ? 'You cannot transfer money to your own IBAN number.' : 'Kendi IBAN numaranıza para transferi yapamazsınız.'));

    const receiverId = db.get(`iban_${receiverIban}`);
    if (receiverId === null) return message.channel.send((lang === "en" ? 'No recipient found with the given IBAN number.' : 'Belirtilen IBAN numarasına sahip bir alıcı bulunamadı.'));

    const senderBalance = db.fetch(`para_${user.id}`) || 0;
    if (senderBalance < amount) return message.channel.send((lang === "en" ? 'Insufficient balance.' : 'Yeterli bakiyeniz yok.'));

    const receiverBalance = db.fetch(`para_${receiverId}`) || 0;

    db.subtract(`para_${user.id}`, amount);
    db.add(`para_${receiverId}`, amount);

    message.channel.send((lang === "en" ? `User ${user.username} transferred ${amount} TL to the user with IBAN ${receiverIban}.` : `${user.username} adlı kullanıcı, IBAN ${receiverIban} olan kullanıcıya ${amount} TL transfer etti.`));
};

exports.conf = {
    enabled: true,
    aliases: ['para-transfer', 'paratransfer'],
    guildOnly: false,
    permLevel: 0
};

exports.help = {
    name: 'transfer',
    description: 'Belirtilen IBAN numarasına para transferi yapar.',
    usage: 'transfer <iban> <miktar>'
};
