const Discord = require('discord.js')
const db = require('croxydb')
const ms_2 = require('parse-ms')
const { getLangSync, t } = require("../dil");

const CUMLE_TR = {
  lose: [
    "Soygun bittikten sonra polis seni yakaladı", "Masken yırtıldı, ifşa oldun", "Tofaş çalarken yaşlı amca seni yakaladı", "Marketi soyarken kekolar seni patakladı", "Boksör adamı soymaya çalışırken dayak yedin",
    "Kekolar seni bankayı soyup kaçarken yakaladı", "Tofaşı çalarken alarm öttü"
  ],
  win: [
    "Ünlü bir iş adamını soydun", "Şehirdeki bir süpermarketi soydun", "Mahalledeki dayının tofaşını çaldın", "Galeri soygunu yaptın", "Nokia çalıp birisine sattın", "Tofaş çaldın"
  ]
};
const CUMLE_EN = {
  lose: [
    "Cops caught you after the heist", "Your mask ripped, you got exposed", "An old man caught you stealing the car", "Thugs beat you up at the market", "You tried to rob a boxer and got beaten",
    "The gang caught you fleeing the bank", "The alarm went off while stealing the car"
  ],
  win: [
    "You robbed a famous businessman", "You robbed a supermarket", "You stole the neighbor's car", "You pulled a gallery heist", "You stole a Nokia and sold it", "You stole a car"
  ]
};

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const CUMLE = EN ? CUMLE_EN : CUMLE_TR;
  let user = message.author;

  let timeout = 840000;
  function rastgeleMiktar(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  let crime = await db.fetch(`soygunsüre_${message.author.id}`)

  if (crime !== null && timeout - (Date.now() - crime) > 0) {
    let time = ms_2(timeout - (Date.now() - crime));
    message.channel.send(new Discord.EmbedBuilder()
      .setColor("Red")
      .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
      .setDescription((lang === "en" ? `⏱ To rob wait ${time.minutes ? time.minutes + ' minutes,' : ''} ${time.seconds ? time.seconds + ' seconds!' : 'try again!'}` : `⏱ Soygun yapmak için ${time.minutes ? time.minutes + ' dakika,' : ''} ${time.seconds ? time.seconds + ' saniye beklemelisin!' : 'tekrar dene!'}`)))
  } else {
    const result = ["WINWIN", "LOOSELOOSE"]
    let awnser = result[Math.floor(Math.random() * result.length)];
    if (awnser === "LOOSELOOSE") {
      var kaybettin = rastgeleMiktar(400, 900)
      const cumle = CUMLE.lose[Math.floor(Math.random() * CUMLE.lose.length)];
      message.channel.send(new Discord.EmbedBuilder()
        .setColor("Red")
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
        .setDescription((lang === "en" ? `${cumle} — you lost ${kaybettin} 💸!` : `${cumle} ve ${kaybettin} 💸 kaybettin!`)));
      await db.add(`para_${user.id}`, -kaybettin);
      await db.set(`soygunsüre_${user.id}`, Date.now());
    } else {
      var sentence2 = CUMLE.win[Math.floor(Math.random() * CUMLE.win.length)]
      var kazandın = rastgeleMiktar(800, 1700)
      let embed = new Discord.EmbedBuilder()
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({}) })
        .setColor("Green")
        .setDescription((lang === "en" ? `${sentence2} and you won ${kazandın} 💸!` : `${sentence2} ve ${kazandın} 💸 kazandın!`))
      message.channel.send({ embeds: [embed] })
      await db.add(`para_${user.id}`, kazandın);
      await db.set(`soygunsüre_${user.id}`, Date.now());
    }
  }
}

exports.conf = {
  enabled: true,
  aliases: ["soygunyap", "soygun-yap", "soy"] };

exports.help = {
  name: 'soygun' };
