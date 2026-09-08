const db = require('croxydb');
const { getLangSync } = require("../dil");
const { bilgiKarti } = require("./_kart");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const mentionedUser = message.mentions.users.first();
  const user = mentionedUser || message.author;

  let userIban = db.get(`iban_${user.id}`);
  if (!userIban) {
    userIban = generateRandomIban();
    db.set(`iban_${user.id}`, userIban);
  }
  const kart = await bilgiKarti({
    baslik: user.username,
    avatarURL: user.displayAvatarURL({ extension: 'png', size: 256 }),
    satirlar: [
      `IBAN: ${userIban}`,
      mentionedUser
        ? (EN ? "Mentioned user's IBAN" : "Etiketlenen kişinin IBAN'ı")
        : (EN ? "Use it for money transfers" : "Para transferlerinde kullan")
    ],
    lang, renk1: '#2c1f3d', renk2: '#7b5ea7', dosya: 'iban-kart.png'
  });
  return message.channel.send({ files: [kart] });
};

function generateRandomIban() {
  const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let iban = 'TR';
  for (let i = 0; i < 8; i++) {
    iban += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return iban;
}

exports.conf = {
  enabled: true,
  aliases: ['iban-olustur', 'iban-yarat'],
  guildOnly: false,
  permLevel: 0
};

exports.help = {
  name: 'iban',
  description: 'IBAN numaranı resimli kartla gösterir/oluşturur.',
  usage: 'iban [@kullanici]'
};
