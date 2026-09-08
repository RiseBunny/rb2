const { getLangSync } = require("../dil");
const { siralamaKarti } = require("./_kart");
const { xpSeviye } = require("../utils");
const db = require('croxydb');

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const users = [];

  const tum = db.all() || {};
  const userIds = Object.keys(tum).filter(k => k.startsWith('xp_') && !k.startsWith('xp_cd_')).map(k => k.replace('xp_', ''));
  for (const userId of userIds) {
    const user = client.users.cache.get(userId);
    if (!user) continue;
    const xp = Number(db.fetch(`xp_${userId}`) || 0);
    if (xp <= 0) continue;
    users.push({ ad: user.username, deger: `Sv.${xpSeviye(xp)} • ${xp.toLocaleString()} XP`, xp });
  }

  if (!users.length) return message.reply(EN ? "No data yet." : "Henüz veri yok.");
  users.sort((a, b) => b.xp - a.xp);

  const kart = await siralamaKarti({
    baslik: EN ? "🏆 Level Top 10" : "🏆 Seviye Sıralama",
    satirlar: users.slice(0, 10),
    lang, dosya: 'seviye-siralama.png'
  });
  message.channel.send({ files: [kart] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ['levelsıralama', 'leveltop', 'seviyetop', 'level-top'], permLevel: 0, kategori: "seviye" };
exports.help = { name: "seviye-sıralama", description: "En yüksek levelli 10 kullanıcıyı resimli gösterir.", usage: "seviye-sıralama" };
