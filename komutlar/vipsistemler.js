const { EmbedBuilder } = require('discord.js');
const { getLangSync, t } = require("../dil");

exports.run = (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle((lang === "en" ? "🌟 VIP Systems 🌟" : "🌟 VIP Sistemler 🌟"))
    .setDescription((lang === "en" ? "Here are systems and commands exclusive to VIP members:\n\n- `weekly` (Special Server Members)\n- (More VIP features can be added here.)" : "İşte sadece VIP üyelere özel sistemler ve komutlar:\n\n- `haftalık` (Özel Sunucu Üyeleri)\n- (Daha fazla VIP özelliği buraya eklenebilir.)"))
    .setFooter({ text: "RiseBunny VIP" });

  message.channel.send({ embeds: [embed] });
}

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["vip"],
  kategori: "Bot",
  permLevel: 0
};

exports.help = {
  name: 'vipsistemler',
  description: 'VIP sistemleri ve komutları listeler.',
  usage: 'vipsistemler'
};
