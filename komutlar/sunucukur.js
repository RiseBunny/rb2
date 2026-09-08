const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { t, getLang } = require("../dil");
const { ownerLog } = require("../utils");

exports.run = async (client, message) => {
  const lang = await getLang(message.author.id);
  if (!message.guild) return;
  if (message.author.id !== message.guild.ownerId && !message.member.permissions.has(PermissionFlagsBits.Administrator))
    return message.reply((lang === "en" ? "Sorry, only the server owner can use this command!" : "Üzgünüm ama bu komutu sadece sunucu sahibi kullanabilir!"));

  const sor = new EmbedBuilder().setColor("#3f007f").setTitle((lang === "en" ? "Are You Sure You Want To Set Up The Server?" : "Sunucu Kurmak İstediğine Emin misin?"))
    .setDescription((lang === "en" ? "Should the required channels be created?" : "Gerekli kanallar kurulsun mu?"))
    .setFooter({ text: (lang === "en" ? 'Type "yes" to confirm (30 sec)' : 'Onaylıyorsan "evet" yaz (30 sn)') });
  await message.channel.send({ embeds: [sor] });

  let collected;
  try {
    collected = await message.channel.awaitMessages({ filter: (r) => r.author.id === message.author.id && ["evet", "yes"].includes(r.content.toLowerCase()), max: 1, time: 30000, errors: ["time"] });
  } catch { return message.reply((lang === "en" ? "Time is up, operation cancelled." : "Süre doldu, işlem iptal.")); }
  if (!collected || collected.size === 0) return;

  const yapilar = [
    ["ÖNEMLİ KANALLAR", ChannelType.GuildCategory, null],
    ["「📜」kurallar", ChannelType.GuildText, "ÖNEMLİ KANALLAR"],
    ["「🎉」duyuru", ChannelType.GuildText, "ÖNEMLİ KANALLAR"],
    ["SOHBET KANALLARI", ChannelType.GuildCategory, null],
    ["「💬」sohbet", ChannelType.GuildText, "SOHBET KANALLARI"],
    ["「📈」komutlar", ChannelType.GuildText, "SOHBET KANALLARI"],
    ["SES KANALLARI", ChannelType.GuildCategory, null],
    ["● Genel Sohbet", ChannelType.GuildVoice, "SES KANALLARI"]
  ];
  const katId = {};
  for (const [ad, tip, parent] of yapilar) {
    try {
      const k = await message.guild.channels.create({ name: ad, type: tip, parent: parent ? katId[parent] : null });
      if (tip === ChannelType.GuildCategory) katId[ad] = k.id;
    } catch {}
  }
  await message.channel.send((lang === "en" ? "Required channels are being created. Setting the roles is up to you :)" : "Gerekli kanallar kuruluyor. Rolleri ayarlamak sana düşer :)"));
  await ownerLog(client, new EmbedBuilder().setColor("Green").setDescription(`🏗️ Sunucu kuruldu: **${message.guild.name}** | ${message.author.tag}`));
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["sunucu-kur"], permLevel: 3, kategori: "moderasyon" };
exports.help = { name: "sunucukur", description: "Sunucuyu kurar (kategori + kanallar).", usage: "sunucukur" };
