const Discord = require("discord.js");
const ayarlar = require("../ayarlar.json");
const { getLangSync, t } = require("../dil");
let prefix = ayarlar.prefix;

// secim: tas/kagit/makas (TR+EN giris kabul edilir)
const SEC = {
  tas: ["t", "tas", "taş", "rock", "r"],
  kagit: ["k", "kagit", "kağıt", "paper", "p"],
  makas: ["m", "makas", "scissors", "s"]
};
function normalize(girdi) {
  girdi = (girdi || "").toLowerCase();
  for (const [k, v] of Object.entries(SEC)) if (v.includes(girdi)) return k;
  return null;
}
function sonuc(a, b) {
  if (a === b) return "draw";
  if ((a === "tas" && b === "makas") || (a === "kagit" && b === "tas") || (a === "makas" && b === "kagit")) return "won";
  return "lost";
}
const AD = { tas: { tr: "taş", en: "rock" }, kagit: { tr: "kağıt", en: "paper" }, makas: { tr: "makas", en: "scissors" } };

exports.run = async (client, msg, args) => {
  const lang = getLangSync(msg.author.id);
  const EN = lang === "en";
  if (!args[0]) {
    return msg.channel.send(
      new Discord.EmbedBuilder()
        .setColor("DarkButNotBlack")
        .setDescription(EN ? `Make your choice rock, paper or scissors | ${prefix}rps <rock,paper,scissors>` : `Lütfen seçimini yap taş, kağıt yada makas | ${prefix}tkm <taş,kağıt,makas>`)
    );
  }
  const choice = normalize(args[0]);
  if (!choice) {
    return msg.channel.send(
      new Discord.EmbedBuilder()
        .setColor("DarkButNotBlack")
        .setDescription(EN ? `Make your choice rock, paper or scissors | ${prefix}rps <r,p,s>` : `Lütfen seçimini yap taş, kağıt yada makas | ${prefix}tkm <t,k,m>`)
    );
  }
  const botChoice = ["tas", "kagit", "makas"][Math.floor(Math.random() * 3)];
  const result = sonuc(choice, botChoice);
  const sen = AD[choice][EN ? "en" : "tr"], o = AD[botChoice][EN ? "en" : "tr"];
  let answer;
  if (result === "won") {
    answer = EN ? `You **__won__** \n Your pick: \`${sen}\` | Bot's pick: \`${o}\`` : `Başarılı, sen **__Kazandın__** \n Senin Seçtiğin: \`${sen}\` | Bot'un Seçtiği: \`${o}\``;
  } else if (result === "lost") {
    answer = EN ? `Better luck next time **__buddy__**\n Your pick: \`${sen}\` | Bot's pick: \`${o}\`` : `Bidakine **__Kaybetin Dostum__**\n Senin Seçtiğin: \`${sen}\` | Bot'un Seçtiği: \`${o}\``;
  } else {
    answer = EN ? `**__Draw__** \n Your pick: \`${sen}\` | Bot's pick: \`${o}\`` : `**__Berabere__** \n Senin Seçimin: \`${sen}\` | Bot'un Seçimi: \`${o}\``;
  }
  msg.channel.send(answer);
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: [],
  permLevel: 0
};

exports.help = {
  name: "tkm",
  description: "Taş kağıt makas oyununu oynar.",
  usage: "tkm"
};
