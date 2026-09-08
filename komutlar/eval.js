const { EmbedBuilder } = require("discord.js");
const { SAHIP_ID, komutLog } = require("../utils");
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  if (message.author.id !== SAHIP_ID) return message.reply(t(lang, "ortak.sahipSadece"));
  const codein = args.join(" ");
  if (!codein) return message.reply((lang === "en" ? "You must enter some code to try!" : "Deneyebilmek için bir kod girmelisin!"));
  if (/token|DISCORD_BOT_TOKEN|process\.env/i.test(codein)) return message.reply((lang === "en" ? "Security: code containing tokens cannot be executed." : "Güvenlik: token içeren kod çalıştırılamaz."));

  try {
    let code = eval(codein);
    if (code instanceof Promise) code = await code;
    if (typeof code !== "string") code = require("util").inspect(code, { depth: 1 }).slice(0, 1500);
    await komutLog(client, message, "eval");
    const embed = new EmbedBuilder()
      .setColor("Random")
      .addFields(
        { name: (lang === "en" ? "» Code" : "» Kod"), value: `\`\`\`js\n${codein.slice(0, 1000)}\n\`\`\`` },
        { name: (lang === "en" ? "» Result" : "» Sonuç"), value: `\`\`\`js\n${String(code).slice(0, 1500)}\n\`\`\`` }
      );
    await message.channel.send({ embeds: [embed] });
  } catch (e) {
    const embed2 = new EmbedBuilder()
      .setColor("Random")
      .addFields({ name: (lang === "en" ? "» Error" : "» Hata"), value: `\`\`\`js\n${String(e).slice(0, 1500)}\n\`\`\`` });
    await message.channel.send({ embeds: [embed2] });
  }
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["kod", "çalıştır"], permLevel: 5, kategori: "sahip" };
exports.help = { name: "eval", description: "Kod denemeyi sağlar (sahip).", usage: "eval <kod>" };
