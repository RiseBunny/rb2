const { getLangSync } = require("../dil");
const { siralamaKarti } = require("./_kart");
const db = require('croxydb');

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const users = [];

  // Kullanıcıları toplam paralarına göre sırala (croxydb all() obje döner)
  const tum = db.all() || {};
  const userIds = Object.keys(tum).filter(k => k.startsWith('para_')).map(k => k.replace('para_', ''));
  for (const userId of userIds) {
    const user = client.users.cache.get(userId);
    if (user) {
      const walletMoney = Number(db.fetch(`para_${userId}`) || 0);
      const bankMoney = Number(db.fetch(`bankapara_${userId}`) || 0);
      users.push({ ad: user.username, deger: `${(walletMoney + bankMoney).toLocaleString()} 💸`, para: walletMoney + bankMoney });
    }
  }

  if (!users.length) return message.reply(EN ? "No data yet." : "Henüz veri yok.");
  users.sort((a, b) => b.para - a.para);

  const kart = await siralamaKarti({
    baslik: EN ? "💸 Money Top 10" : "💸 Para Sıralama",
    satirlar: users.slice(0, 10),
    lang, dosya: 'para-siralama.png'
  });
  message.channel.send({ files: [kart] });
};

exports.conf = {
  enabled: true,
  aliases: ['parasıralama', 'liderlik'],
};

exports.help = {
  name: 'para-sıralama',
  description: 'En zengin 10 kullanıcıyı resimli gösterir.',
  usage: 'para-sıralama'
};
