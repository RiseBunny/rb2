const { EmbedBuilder } = require("discord.js");
const { getLangSync } = require("../dil");
const { SAHIP_ID, ownerLog } = require("../utils");
const { modEkle, modCikar, modListesi } = require("../ai/executor");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  // SADECE sahip kullanabilir
  if (message.author.id !== SAHIP_ID)
    return message.reply(EN ? "❌ Only the bot owner can use this." : "❌ Bunu sadece bot sahibi kullanabilir.").catch(() => {});

  const alt = (args[0] || "").toLowerCase();
  const hedefler = new Set();
  message.mentions.users.forEach(u => { if (!u.bot) hedefler.add(u.id); });
  for (const a of args.slice(1)) {
    const id = String(a).replace(/[<@!>]/g, "");
    if (/^\d{15,25}$/.test(id)) hedefler.add(id);
  }

  if (["ekle", "add"].includes(alt)) {
    if (!hedefler.size) return message.reply(EN ? "Usage: `r!mod ekle @user/ID`" : "Kullanım: `r!mod ekle @kullanıcı/ID` (çoklu olur).");
    const ok = [];
    for (const id of hedefler) if (modEkle(id)) ok.push(id);
    await ownerLog(client, new EmbedBuilder().setColor("Blue").setDescription(`🛡️ **Mod eklendi:** ${[...hedefler].map(id => `<@${id}>`).join(" ")} — ${message.author.tag}\nYetkiler: karaliste, beyazliste, kupon, bakım`)).catch(() => {});
    return message.reply(ok.length
      ? (EN ? `🛡️ Mods added: ${ok.map(id => `<@${id}>`).join(" ")}` : `🛡️ Mod eklendi: ${ok.map(id => `<@${id}>`).join(" ")} (karaliste/beyazliste/kupon/bakım kullanabilir)`)
      : (EN ? "Already mods." : "Bunlar zaten mod."));
  }
  if (["sil", "çıkar", "cikar", "remove", "del"].includes(alt)) {
    if (!hedefler.size) return message.reply(EN ? "Usage: `r!mod sil @user/ID`" : "Kullanım: `r!mod sil @kullanıcı/ID`.");
    for (const id of hedefler) modCikar(id);
    return message.reply(EN ? "🛡️ Removed." : "🛡️ Mod çıkarıldı.");
  }
  if (["liste", "list"].includes(alt)) {
    const l = modListesi();
    return message.reply(l.length ? `🛡️ **Modlar (${l.length}):**\n${l.map(id => `• <@${id}> (\`${id}\`)`).join("\n")}` : (EN ? "No mods." : "Mod yok."));
  }
  return message.reply(EN ? "Usage: `r!mod ekle/sil/liste @user`" : "Kullanım: `r!mod ekle/sil/liste @kullanıcı`");
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["moderator", "moderatör"], permLevel: 5, kategori: "sahip" };
exports.help = { name: "mod", description: "Mod ekler/siler/listeler (sadece sahip). Modlar karaliste/beyazliste/kupon/bakım kullanabilir.", usage: "mod ekle @kullanıcı" };
