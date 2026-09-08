const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");

function deste() {
  const kartlar = [];
  for (const deger of ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"])
    for (const renk of ["♠", "♥", "♦", "♣"]) kartlar.push({ deger, renk });
  return kartlar;
}
function kartDegeri(k) {
  if (k.deger === "A") return 11;
  if (["J", "Q", "K"].includes(k.deger)) return 10;
  return parseInt(k.deger);
}
function elToplam(el) {
  let t = el.reduce((s, k) => s + kartDegeri(k), 0);
  let as = el.filter(k => k.deger === "A").length;
  while (t > 21 && as > 0) { t -= 10; as--; }
  return t;
}
function elGoster(el) { return el.map(k => `${k.deger}${k.renk}`).join(" "); }

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const uid = message.author.id;
  const bakiye = Number(db.fetch(`para_${uid}`) || 0);

  const miktar = args[0]?.toLowerCase() === "all" || args[0]?.toLowerCase() === "hepsi"
    ? Math.min(bakiye, 50000) : Number(args[0]);
  if (!Number.isInteger(miktar) || miktar < 1 || miktar > 50000 || miktar > bakiye)
    return message.reply(EN ? "Enter an amount between 1 and 50,000 that does not exceed your balance." : "1 ile 50.000 arasında ve bakiyeni aşmayan bir miktar gir.");

  const deste = deste().sort(() => Math.random() - 0.5);
  const oyuncu = [deste.pop(), deste.pop()];
  const kasa = [deste.pop(), deste.pop()];

  const e = new EmbedBuilder().setColor("Blue").setTitle("🃏 Blackjack")
    .setDescription(EN
      ? `**Your hand:** ${elGoster(oyuncu)} (${elToplam(oyuncu)})\n**Dealer:** ${elGoster([kasa[0]])} + ?`
      : `**Elin:** ${elGoster(oyuncu)} (${elToplam(oyuncu)})\n**Kurpiyer:** ${elGoster([kasa[0]])} + ?`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bj_cek_${uid}_${miktar}`).setLabel(EN ? "Hit" : "Kart Çek").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bj_kal_${uid}_${miktar}`).setLabel(EN ? "Stand" : "Kal").setStyle(ButtonStyle.Success)
  );

  db.set(`bj_${uid}`, { oyuncu, kasa, deste, miktar });
  await message.reply({ embeds: [e], components: [row] });
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["21", "blackjack", "bj"], permLevel: 0, kategori: "ekonomi" };
exports.help = { name: "blackjack", description: "Blackjack (21) oyunu.", usage: "blackjack <miktar|all>" };
