const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const { getLangSync } = require("../dil");
const db = require('croxydb');

async function createMoneyCard(username, avatarURL, walletMoney, bankMoney, totalMoney, userIban, lang) {
    const EN = lang === "en";
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');

    // Arka plan
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#5E3B82'); // Mor
    gradient.addColorStop(1, '#19171D'); // Siyah
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Kullanıcı bilgileri
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`${EN ? "User" : "Kullanıcı"}: ${username}`, 20, 40);
    ctx.fillText(`${EN ? "Wallet" : "Cüzdan"}: ${walletMoney} `, 20, 80);
    ctx.fillText(`${EN ? "Bank" : "Banka"}: ${bankMoney} `, 20, 120);
    ctx.fillText(`${EN ? "Total" : "Toplam"}: ${totalMoney} `, 20, 160);

    if (userIban) {
        ctx.fillText(`IBAN: ${userIban}`, 20, 200);
    } else {
        ctx.fillText(`IBAN: ${EN ? "None" : "Yok"}`, 20, 200);
    }

    // Kullanıcı avatarı
    const avatar = await loadImage(avatarURL);
    ctx.drawImage(avatar, 300, 40, 75, 75);

    const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), 'money-card.png');
    return attachment;
}

exports.run = async (client, message, args) => {
    const lang = getLangSync(message.author.id);
    let user = message.mentions.users.first() || message.author;

    let walletMoney = db.fetch(`para_${user.id}`) || 0;
    let bankMoney = db.fetch(`bankapara_${user.id}`) || 0;
    let totalMoney = walletMoney + bankMoney;

    let userIban = db.get(`iban_${user.id}`); // Kullanıcının IBAN'ını al

    const attachment = await createMoneyCard(user.username, user.displayAvatarURL({ extension: 'png' }), walletMoney, bankMoney, totalMoney, userIban, lang);
    message.channel.send({ files: [attachment] });
};

exports.conf = {
    enabled: true,
    aliases: ['kart','kartım','bankam','banka','param','kartım'],
};

exports.help = {
    name: 'para',
    description: 'Kullanıcının cüzdan ve banka bilgisini gösterir.',
    usage: 'para [@kullanici]'
};
