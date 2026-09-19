const { EmbedBuilder } = require("discord.js");
const { SAHIP_ID, komutLog } = require("../utils");
const { getLangSync, t } = require("../dil");
const util = require("util");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  if (message.author.id !== SAHIP_ID) return message.reply(t(lang, "ortak.sahipSadece"));
  
  const codein = args.join(" ");
  if (!codein) return message.reply(lang === "en" ? "You must enter some code to try!" : "Deneyebilmek için bir kod girmelisin!");
  
  // ⛔ Güvenlik filtresi (genişletildi)
  const YASAKLI = [
    "process.env", "DISCORD_BOT_TOKEN", "token", "client.destroy",
    "client.login", "fs.unlink", "fs.rmdir", "child_process",
    "require('fs')", "require(\"fs\")", "eval(", "Function(",
    "process.exit", "process.kill"
  ];
  for (const yasak of YASAKLI) {
    if (codein.toLowerCase().includes(yasak.toLowerCase())) {
      return message.reply(lang === "en" 
        ? `⛔ Security: \`${yasak}\` is forbidden.` 
        : `⛔ Güvenlik: \`${yasak}\` yasaklı.`);
    }
  }

  try {
    // ✅ DÜZELTİLDİ: return ile async IIFE kullan
    let code = await eval(`(async () => { return ${codein} })()`);

    // ✅ DÜZELTİLDİ: util.inspect'i try/catch içine al + daha sıkı limitler
    if (typeof code !== "string") {
      try {
        code = util.inspect(code, {
          depth: 0,              // ⬅️ 1 yerine 0 (döngüyü kesin keser)
          maxArrayLength: 10,
          maxStringLength: 300,
          breakLength: 80,
          compact: true,
          showHidden: false,
          getters: false,        // ⬅️ Getter'ları çalıştırma (hata kaynağı!)
          showProxy: false
        });
      } catch (inspectErr) {
        // util.inspect başarısız olursa basit string'e çevir
        code = `[Gösterilemiyor: ${inspectErr.message}]`;
        try { code += `\nTip: ${typeof code}`; } catch {}
      }
    }

    await komutLog(client, message, "eval").catch(() => {});

    const embed = new EmbedBuilder()
      .setColor("Random")
      .addFields(
        { name: lang === "en" ? "» Code" : "» Kod", value: `\`\`\`js\n${codein.slice(0, 1000)}\n\`\`\`` },
        { name: lang === "en" ? "» Result" : "» Sonuç", value: `\`\`\`js\n${String(code).slice(0, 1500)}\n\`\`\`` }
      );

    await message.channel.send({ embeds: [embed] }).catch(() => {
      // Embed hatası olursa düz mesaj gönder
      message.channel.send(`**Sonuç:**\n\`\`\`js\n${String(code).slice(0, 1900)}\n\`\`\``).catch(() => {});
    });

  } catch (e) {
    const embed2 = new EmbedBuilder()
      .setColor("Random")
      .addFields({ 
        name: lang === "en" ? "» Error" : "» Hata", 
        value: `\`\`\`js\n${String(e.stack || e).slice(0, 1500)}\n\`\`\`` 
      });
    await message.channel.send({ embeds: [embed2] }).catch(() => {});
  }
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["kod", "çalıştır"], permLevel: 5, kategori: "sahip" };
exports.help = { name: "eval", description: "Kod denemeyi sağlar (sahip).", usage: "eval <kod>" };