const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");
const { t, getLang } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = await getLang(message.author.id);
  if (!message.guild) return;
  if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
    return message.reply(t(lang, "moderasyon.banYetki"));

  const kullanici = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
  if (!kullanici) return message.reply(t(lang, "moderasyon.banEtiket"));

  const sahipId = process.env.SAHIP_ID || "985126554306773063";
  if (kullanici.id === sahipId || kullanici.id === message.guild.ownerId)
    return message.reply(t(lang, "moderasyon.banSahip"));
  if (!kullanici.bannable) return message.reply((lang === "en" ? "I cannot ban this user (role order/permission)." : "Bu kullanıcıyı banlayamıyorum (rol sıralaması/yetki)."));

  const sebep = args.slice(1).join(" ") || "Sebep belirtilmedi";

  const e = new EmbedBuilder()
    .setColor("Red")
    .setTitle(lang === "en" ? "Confirm Ban" : "Banı Onayla")
    .setDescription(lang === "en"
      ? `Ban **${kullanici.user.tag}**?\n**Reason:** ${sebep}`
      : `**${kullanici.user.tag}** kullanıcısını banlamak istiyor musun?\n**Sebep:** ${sebep}`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ban_evet_${kullanici.id}_${message.author.id}`).setLabel(lang === "en" ? "Ban" : "Banla").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("ban_hayir").setLabel(lang === "en" ? "Cancel" : "İptal").setStyle(ButtonStyle.Secondary)
  );

  await message.channel.send({ embeds: [e], components: [row] });
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["yasakla"], permLevel: 0, kategori: "moderasyon" };
exports.help = { name: "ban", description: "Belirtilen kullanıcıyı sunucudan banlar (onaylı).", usage: "ban <@kullanıcı> [sebep]" };
