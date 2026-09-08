const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { getLangSync } = require("../dil");

const DIL_KODLARI = ["tr", "en", "de", "fr", "es", "it", "ru", "ar", "ja", "ko", "zh-CN", "pt", "nl", "pl", "uk", "sv", "no", "da", "fi", "el"];

function kaynakTahmin(metin) {
  // Türkçe özel karakterler varsa tr, yoksa en varsay
  return /[ğüşıöçĞÜŞİÖÇ]/.test(metin) ? "tr" : "en";
}

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";

  let hedef = (args[0] || "").toLowerCase();
  let metin;
  if (DIL_KODLARI.includes(hedef)) {
    metin = args.slice(1).join(" ").trim();
  } else {
    // Hedef belirtilmediyse: kullanıcının diğer diline çevir
    hedef = EN ? "tr" : "en";
    metin = args.join(" ").trim();
  }

  if (!metin) return message.reply(EN
    ? "Usage: `translate <target> <text>` (e.g. `translate en Merhaba dünya`)"
    : "Kullanım: `çevir <hedef> <metin>` (örn: `çevir en Merhaba dünya`)");

  const kaynak = kaynakTahmin(metin);
  if (kaynak === hedef) return message.reply(EN ? "Source and target languages are the same." : "Kaynak ve hedef dil aynı.");

  try {
    const res = await axios.get("https://api.mymemory.translated.net/get", {
      params: { q: metin.slice(0, 500), langpair: `${kaynak}|${hedef}` },
      timeout: 15000
    });
    const ceviri = res.data?.responseData?.translatedText;
    if (!ceviri || ceviri === "PLEASE SELECT TWO DISTINCT LANGUAGES") throw new Error("no translation");
    const e = new EmbedBuilder().setColor("Purple").setTitle(EN ? "🌐 Translation" : "🌐 Çeviri")
      .addFields(
        { name: `${kaynak.toUpperCase()} → ${hedef.toUpperCase()}`, value: String(ceviri).slice(0, 1900) }
      );
    return message.channel.send({ embeds: [e] });
  } catch {
    return message.reply(EN ? "Translation failed, please try again." : "Çeviri başarısız oldu, tekrar deneyin.");
  }
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["cevir", "translate", "tercume"], permLevel: 0, kategori: "yapayzeka" };
exports.help = { name: "çevir", description: "Metni başka bir dile çevirir.", usage: "çevir <hedef> <metin>" };
