const { EmbedBuilder } = require("discord.js");
const { getLangSync } = require("../dil");
const { SAHIP_ID, ownerLog } = require("../utils");
const { betaEkle, betaCikar, betaListesi } = require("../ai/executor");

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
    if (!hedefler.size) return message.reply(EN ? "Usage: `r!betatester ekle @user/ID`" : "Kullanım: `r!betatester ekle @kullanıcı/ID` (çoklu olur).");
    const ok = [];
    for (const id of hedefler) if (betaEkle(id)) ok.push(id);
    await ownerLog(client, new EmbedBuilder().setColor("Purple").setDescription(`🧪 **Beta tester eklendi:** ${[...hedefler].map(id => `<@${id}>`).join(" ")} — ${message.author.tag}`)).catch(() => {});
    return message.reply(ok.length
      ? (EN ? `🧪 Beta testers added: ${ok.map(id => `<@${id}>`).join(" ")}` : `🧪 Beta tester eklendi: ${ok.map(id => `<@${id}>`).join(" ")}`)
      : (EN ? "Already beta testers." : "Bunlar zaten beta tester."));
  }
  if (["sil", "çıkar", "cikar", "remove", "del"].includes(alt)) {
    if (!hedefler.size) return message.reply(EN ? "Usage: `r!betatester sil @user/ID`" : "Kullanım: `r!betatester sil @kullanıcı/ID`.");
    for (const id of hedefler) betaCikar(id);
    return message.reply(EN ? "🧪 Removed." : "🧪 Beta tester çıkarıldı.");
  }
  if (["liste", "list"].includes(alt)) {
    const l = betaListesi();
    return message.reply(l.length ? `🧪 **Beta testerlar (${l.length}):**\n${l.map(id => `• <@${id}> (\`${id}\`)`).join("\n")}` : (EN ? "No beta testers." : "Beta tester yok."));
  }
  return message.reply(EN ? "Usage: `r!betatester ekle/sil/liste @user`" : "Kullanım: `r!betatester ekle/sil/liste @kullanıcı`");
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["betatest", "beta-tester"], permLevel: 5, kategori: "sahip" };
exports.help = { name: "betatester", description: "Beta tester ekler/siler/listeler (sadece sahip).", usage: "betatester ekle @kullanıcı" };
