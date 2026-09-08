// Ortak resimli kart yardımcısı (seviye kartı ile aynı tema: gradyan + avatar)
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

async function _avatar(ctx, avatarURL, x, y, r) {
  if (!avatarURL) return;
  try {
    const avatar = await loadImage(avatarURL).catch(() => null);
    if (!avatar) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2, false);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, x - r, y - r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = '#ffffffaa';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  } catch {}
}

function _bg(ctx, W, H, renk1, renk2) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, renk1 || '#1f1c2c');
  g.addColorStop(1, renk2 || '#928dab');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// Bilgi kartı: başlık + en fazla 4 satır (700x250)
async function bilgiKarti({ baslik, avatarURL, satirlar, lang, renk1, renk2, dosya }) {
  const canvas = createCanvas(700, 250);
  const ctx = canvas.getContext('2d');
  _bg(ctx, 700, 250, renk1, renk2);
  await _avatar(ctx, avatarURL, 100, 125, 70);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Arial';
  ctx.fillText(String(baslik || '').slice(0, 22), 200, 80);
  ctx.font = '22px Arial';
  (satirlar || []).slice(0, 4).forEach((s, i) => {
    ctx.fillText(String(s).slice(0, 38), 200, 125 + i * 36);
  });
  return new AttachmentBuilder(canvas.toBuffer('image/png'), dosya || 'kart.png');
}

const MADALYA = ['#f1c40f', '#cfd8dc', '#e0934a'];

// Sıralama kartı: ilk 10 (700 x dinamik)
async function siralamaKarti({ baslik, satirlar, lang, dosya }) {
  const rows = (satirlar || []).slice(0, 10);
  const H = 130 + rows.length * 46;
  const canvas = createCanvas(700, H);
  const ctx = canvas.getContext('2d');
  _bg(ctx, 700, H, '#1f1c2c', '#4a4560');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial';
  ctx.fillText(String(baslik || '').slice(0, 26), 40, 60);
  ctx.fillStyle = '#ffffff88';
  ctx.fillRect(40, 78, 620, 2);
  rows.forEach((r, i) => {
    const y = 120 + i * 46;
    const renk = MADALYA[i] || '#ffffff';
    // sıra rozeti
    ctx.fillStyle = renk;
    ctx.beginPath();
    ctx.arc(65, y - 8, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f1c2c';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(String(i + 1), 65 - (i + 1 > 9 ? 11 : 6), y - 1);
    // isim + değer
    ctx.fillStyle = renk;
    ctx.font = 'bold 22px Arial';
    ctx.fillText(String(r.ad || '?').slice(0, 20), 100, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px Arial';
    const val = String(r.deger || '');
    ctx.fillText(val.slice(0, 24), 660 - ctx.measureText(val.slice(0, 24)).width, y);
  });
  return new AttachmentBuilder(canvas.toBuffer('image/png'), dosya || 'siralama.png');
}

module.exports = { bilgiKarti, siralamaKarti };
