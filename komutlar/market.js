const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");

function marketListesi() {
  try { return db.get("marketListesi") || []; } catch { return []; }
}

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  const uid = message.author.id;
  const alt = (args[0] || "").toLowerCase();

  // r!market liste
  if (alt === "liste" || alt === "list") {
    const liste = marketListesi();
    if (!liste.length) return message.reply(EN ? "The market is empty." : "Pazar boş.");
    const satirlar = liste.map(l => `\`#${l.id}\` ${l.pet.emoji} **${l.pet.name}** — ${Number(l.fiyat).toLocaleString()} 💸 | ${EN ? "Seller" : "Satıcı"}: <@${l.satanId}>`);
    const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "💱 Market" : "💱 Pazar")
      .setDescription(satirlar.join("\n").slice(0, 3900));
    return message.channel.send({ embeds: [e] });
  }

  // r!market sat <petIndex> <fiyat>
  if (alt === "sat" || alt === "sell") {
    const index = parseInt(args[1]);
    const fiyat = parseInt(args[2]);
    if (isNaN(index) || isNaN(fiyat) || fiyat <= 0)
      return message.reply(EN ? "Usage: `market sell <petNumber> <price>`" : "Kullanım: `market sat <petNo> <fiyat>`");
    const pets = db.get(`pets_${uid}`) || [];
    const pet = pets[index - 1];
    if (!pet) return message.reply(EN ? "Invalid pet number." : "Geçersiz pet numarası.");
    pets.splice(index - 1, 1);
    db.set(`pets_${uid}`, pets);
    const liste = marketListesi();
    const id = (liste.length ? Math.max(...liste.map(l => l.id)) : 0) + 1;
    liste.push({ id, satanId: uid, pet, fiyat, tarih: Date.now() });
    db.set("marketListesi", liste);
    return message.reply(EN ? `Listed ${pet.emoji} **${pet.name}** for ${fiyat.toLocaleString()} 💸 (ID: #${id}).` : `${pet.emoji} **${pet.name}** ${fiyat.toLocaleString()} 💸 fiyatla listelendi (ID: #${id}).`);
  }

  // r!market iptal <id>
  if (alt === "iptal" || alt === "cancel") {
    const id = parseInt(args[1]);
    if (isNaN(id)) return message.reply(EN ? "Enter a listing ID." : "Bir ilan ID'si girin.");
    const liste = marketListesi();
    const ilan = liste.find(l => l.id === id && l.satanId === uid);
    if (!ilan) return message.reply(EN ? "Listing not found or not yours." : "İlan bulunamadı veya size ait değil.");
    db.set("marketListesi", liste.filter(l => l.id !== id));
    const pets = db.get(`pets_${uid}`) || [];
    pets.push(ilan.pet);
    db.set(`pets_${uid}`, pets);
    return message.reply(EN ? "Listing cancelled, pet returned." : "İlan iptal edildi, pet geri verildi.");
  }

  // r!market al <id>
  if (alt === "al" || alt === "buy") {
    const id = parseInt(args[1]);
    if (isNaN(id)) return message.reply(EN ? "Enter a listing ID." : "Bir ilan ID'si girin.");
    const liste = marketListesi();
    const ilan = liste.find(l => l.id === id);
    if (!ilan) return message.reply(EN ? "Listing not found." : "İlan bulunamadı.");
    if (ilan.satanId === uid) return message.reply(EN ? "You cannot buy your own listing." : "Kendi ilanını satın alamazsın.");
    const bakiye = Number(db.fetch(`para_${uid}`) || 0);
    if (bakiye < ilan.fiyat) return message.reply(EN ? "Insufficient balance." : "Yetersiz bakiye.");

    const e = new EmbedBuilder().setColor("Gold").setTitle(EN ? "Confirm Purchase" : "Satın Almayı Onayla")
      .setDescription(EN ? `Buy ${ilan.pet.emoji} **${ilan.pet.name}** for **${ilan.fiyat.toLocaleString()} 💸**?` : `${ilan.pet.emoji} **${ilan.pet.name}** petini **${ilan.fiyat.toLocaleString()} 💸** karşılığında satın al?`);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`market_evet_${id}_${uid}`).setLabel(EN ? "Buy" : "Satın Al").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("market_hayir").setLabel(EN ? "Cancel" : "İptal").setStyle(ButtonStyle.Danger)
    );
    return message.reply({ embeds: [e], components: [row] });
  }

  return message.reply(EN ? "Usage: `market list | sell <petNo> <price> | buy <id> | cancel <id>`" : "Kullanım: `market liste | sat <petNo> <fiyat> | al <id> | iptal <id>`");
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["pazar", "marketplace"], permLevel: 0, kategori: "ekonomi" };
exports.help = { name: "market", description: "Kullanıcıların pet alıp sattığı pazar.", usage: "market liste | sat <petNo> <fiyat> | al <id> | iptal <id>" };
