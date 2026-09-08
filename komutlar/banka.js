const db = require('croxydb');
const { getLangSync } = require("../dil");
const { bilgiKarti } = require("./_kart");
exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const hedef = message.mentions.members.first() || message.member;
  const user = hedef.user;
  const bank = Number(db.fetch(`bankapara_${user.id}`) || 0);
  const wallet = Number(db.fetch(`para_${user.id}`) || 0);
  const kart = await bilgiKarti({
    baslik: user.username,
    avatarURL: user.displayAvatarURL({ extension: 'png', size: 256 }),
    satirlar: [
      `${EN ? "Bank" : "Banka"}: ${bank.toLocaleString()} 🏦`,
      `${EN ? "Wallet" : "Cüzdan"}: ${wallet.toLocaleString()} 💸`,
      `${EN ? "Total" : "Toplam"}: ${(bank + wallet).toLocaleString()} 💰`
    ],
    lang, renk1: '#0f2c1f', renk2: '#2e7d5b', dosya: 'banka-kart.png'
  });
  return message.channel.send({ files: [kart] });
};
exports.conf = { enabled: true, guildOnly: false, aliases: ["bankam"], permLevel: 0 };
exports.help = { name: "banka", description: "Banka bakiyeni resimli kartla gösterir.", usage: "banka [@kullanıcı]" };
