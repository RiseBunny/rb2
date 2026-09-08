const Discord = require('discord.js');
const db = require('croxydb');
const ms = require('parse-ms');
const fs = require('fs');
const { getLangSync, t } = require("../dil");
const { isPremium } = require("../utils");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  function rastgeleMiktar(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  let times = await db.fetch(`çalışmasüresi_${message.author.id}`);
  let day = 86400000; // 24 saat in milliseconds

  if (times !== null && day - (Date.now() - times) > 0) {
    let time = ms(day - (Date.now() - times));
    message.channel.send(
      new Discord.EmbedBuilder()
        .setColor('Red')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ }) })
        .setDescription(
          (lang === "en" ? `⏱ To work wait ${
            time.minutes ? time.minutes + ' minutes,' : ''
          } ${time.seconds ? time.seconds + ' seconds!' : 'run the command again!'}` : `⏱ Çalışmak için ${
            time.minutes ? time.minutes + ' dakika,' : ''
          } ${time.seconds ? time.seconds + ' saniye beklemelisin!' : 'komutu tekrar gir!'}`)
        )
    );
    return;
  }

  let works = lang === "en"
    ? ['at the supermarket', 'at the pizzeria', 'on the street', 'at the factory', 'at the gallery', 'at the gym', 'at the sports store', 'at the software company']
    : [
    'Süpermarkette',
    "Pizzacı da ",
    'Sokakta',
    'Fabrikada',
    'Galeride',
    'Gymde',
    'Spor Mağazasında',
    'Yazılım Şirketinde',
  ];
  var work = works[Math.floor(Math.random() * works.length)];

  // Ayarlar dosyasını oku
  let ayarlar = JSON.parse(fs.readFileSync('ayarlar.json', 'utf8'));
  let premiumIDs = ayarlar.premiumIDs; // Premium kullanıcı ID'leri

  // ID kontrolü ve para miktarı belirleme
  let moneys;
  if (isPremium(message.author.id)) {
    moneys = rastgeleMiktar(10000, 20000); // Premium para aralığı
  } else {
    moneys = rastgeleMiktar(1000, 10000); // Normal para aralığı
  }

  message.channel.send(
    new Discord.EmbedBuilder()
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ }) })
      .setColor('Yellow')
      .setDescription((lang === "en" ? `You worked ${work} and earned ${moneys} 💸!` : `${work} çalıştın ve ${moneys} 💸 kazandın!`))
  );

  db.set(`çalışmasüresi_${message.author.id}`, Date.now());
  db.add(`para_${message.author.id}`, moneys);
};

exports.conf = {
  enabled: true,
  aliases: ['calis', 'maaş'] };

exports.help = {
  name: 'çalış' };
