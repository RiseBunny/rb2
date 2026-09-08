const Discord = require('discord.js');
const db = require('croxydb');
const { getLangSync } = require("../dil");
const U = require("../utils");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (message.author.id !== U.SAHIP_ID)
    return message.channel.send({ content: EN ? " Only **my owner** can take backups." : " Yedeği sadece **sahibim** alabilir." });

  try {
    // croxydb'nin TÜM kayıtlarını db.all() ile çek (DB dosyası kaynağından)
    const tum = db.all() || {};
    const keys = Object.keys(tum);
    const paket = {
      __risebunny: { tur: "tam-yedek", versiyon: 2, alinan: Date.now(), kayit: keys.length, yapan: message.author.tag },
      data: tum
    };
    const json = JSON.stringify(paket, null, 0);
    const buf = Buffer.from(json, "utf8");
    const ek = new Discord.AttachmentBuilder(buf, { name: `risebunny-tam-yedek-${Date.now()}.json` });
    const u = message.author;
    await u.send({
      content: `💾 **RiseBunny TAM Yedek** — **${keys.length}** kayıt (${(buf.length / 1024).toFixed(1)} KB)\nGeri yüklemek için: \`r!yedek-yükle\` + bu dosyayı mesaja ekle.`,
      files: [ek]
    }).catch(() => {});
    return message.channel.send(EN
      ? `✅ Full backup sent to your DM (**${keys.length}** records).`
      : `✅ Tam yedek DM'ine gönderildi (**${keys.length}** kayıt).`);
  } catch (e) {
    return message.channel.send((EN ? "Backup failed: " : "Yedek alınamadı: ") + e.message);
  }
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["yedek-al", "backup"], permLevel: 4, kategori: "sahip" };
exports.help = { name: "yedek", description: "croxydb'nin TÜM verisini JSON olarak DM'ine yedekler (sahip).", usage: "yedek" };
