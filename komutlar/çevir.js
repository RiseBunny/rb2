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
    const ceviri = await cevirZincir(metin.slice(0, 500), kaynak, hedef);
    if (!ceviri) throw new Error("no translation");
    const e = new EmbedBuilder().setColor("Purple").setTitle(EN ? "🌐 Translation" : "🌐 Çeviri")
      .addFields(
        { name: `${kaynak.toUpperCase()} → ${hedef.toUpperCase()}`, value: String(ceviri).slice(0, 1900) }
      );
    return message.channel.send({ embeds: [e] });
  } catch {
    return message.reply(EN ? "Translation failed, please try again." : "Çeviri başarısız oldu, tekrar deneyin.");
  }
};

/* Çeviri servis zinciri: MyMemory → Google GTX → Lingva (ilki dönen kazanır) */
const ceviriOnbellek = new Map();
async function cevirZincir(metin, kaynak, hedef) {
  const anahtar = `${kaynak}|${hedef}|${metin}`;
  if (ceviriOnbellek.has(anahtar)) return ceviriOnbellek.get(anahtar);
  // 1) MyMemory
  try {
    const res = await axios.get("https://api.mymemory.translated.net/get", {
      params: { q: metin, langpair: `${kaynak}|${hedef}` },
      timeout: 12000
    });
    const t = res.data?.responseData?.translatedText;
    if (t && t !== "PLEASE SELECT TWO DISTINCT LANGUAGES" && !/MYMEMORY WARNING/i.test(t)) {
      if (ceviriOnbellek.size > 500) ceviriOnbellek.clear();
      ceviriOnbellek.set(anahtar, t);
      return t;
    }
    throw new Error("mymemory bos");
  } catch {}
  // 2) Google GTX (resmi olmayan uç)
  try {
    const res = await axios.get("https://translate.googleapis.com/translate_a/single", {
      params: { client: "gtx", sl: kaynak, tl: hedef, dt: "t", q: metin },
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const d = res.data;
    if (Array.isArray(d) && Array.isArray(d[0])) {
      const t = d[0].map(x => x[0]).join("");
      if (t) {
        if (ceviriOnbellek.size > 500) ceviriOnbellek.clear();
        ceviriOnbellek.set(anahtar, t);
        return t;
      }
    }
    throw new Error("gtx bos");
  } catch {}
  // 3) Lingva (açık örnek)
  try {
    const res = await axios.get(`https://lingva.ml/api/v1/${kaynak}/${hedef}/${encodeURIComponent(metin)}`, { timeout: 12000 });
    const t = res.data?.translation;
    if (t) {
      if (ceviriOnbellek.size > 500) ceviriOnbellek.clear();
      ceviriOnbellek.set(anahtar, t);
      return t;
    }
  } catch {}
  return null;
}

exports.conf = { enabled: true, guildOnly: false, aliases: ["cevir", "translate", "tercume"], permLevel: 0, kategori: "yapayzeka" };
exports.help = { name: "çevir", description: "Metni başka bir dile çevirir.", usage: "çevir <hedef> <metin>" };
