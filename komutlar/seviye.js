const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const { xpSeviye, xpGerekli, SEVIYE_ODULLERI } = require("../utils");

async function seviyeKarti(uye, xp, seviye, lang) {
  const EN = lang === "en";
  const canvas = createCanvas(700, 250);
  const ctx = canvas.getContext('2d');

  // Arka plan gradyanı
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, '#1f1c2c');
  g.addColorStop(1, '#928dab');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Avatar (yuvarlak)
  const avatarURL = uye.displayAvatarURL({ extension: 'png', size: 256 });
  const avatar = await loadImage(avatarURL).catch(() => null);
  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 125, 70, 0, Math.PI * 2, false);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 30, 55, 140, 140);
    ctx.restore();
  }

  // Metinler
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Arial';
  ctx.fillText(uye.username.slice(0, 18), 200, 80);

  ctx.font = '22px Arial';
  ctx.fillText(`${EN ? "Level" : "Seviye"}: ${seviye}`, 200, 125);

  // XP ilerleme çubuğu
  const oncekiGerekli = 100 * (seviye - 1) * (seviye - 1);
  const gerekli = xpGerekli(seviye);
  const mevcut = Math.max(0, xp - oncekiGerekli);
  const oran = Math.min(1, mevcut / gerekli);

  ctx.fillStyle = '#00000055';
  ctx.fillRect(200, 150, 440, 26);
  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(200, 150, Math.floor(440 * oran), 26);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(200, 150, 440, 26);

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.fillText(`${mevcut.toLocaleString()} / ${gerekli.toLocaleString()} XP`, 200, 195);

  // Sonraki ödül
  let sonrakiOdul = null;
  for (const [s, odul] of Object.entries(SEVIYE_ODULLERI)) {
    if (Number(s) > seviye) { sonrakiOdul = { s: Number(s), odul }; break; }
  }
  ctx.font = '16px Arial';
  ctx.fillStyle = '#ffeaa7';
  if (sonrakiOdul) {
    ctx.fillText(`${EN ? "Next reward" : "Sonraki ödül"}: ${EN ? "Level" : "Seviye"} ${sonrakiOdul.s} → ${sonrakiOdul.odul.toLocaleString()} 💸`, 200, 220);
  } else {
    ctx.fillText(EN ? "Max rewards reached!" : "Tüm ödülleri aldın!", 200, 220);
  }

  return new AttachmentBuilder(canvas.toBuffer('image/png'), 'seviye-kart.png');
}

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const hedef = message.mentions.members.first() || message.member;
  const xp = Number(db.fetch(`xp_${hedef.id}`) || 0);
  const seviye = xpSeviye(xp);
  const kart = await seviyeKarti(hedef.user, xp, seviye, lang);
  await message.channel.send({ files: [kart] });
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["level", "rank", "xp", "seviyem"], permLevel: 0, kategori: "seviye" };
exports.help = { name: "seviye", description: "Seviyeni ve XP kartını gösterir.", usage: "seviye [@kullanıcı]" };
