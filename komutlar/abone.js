let Discord = require("discord.js");
let database = require('croxydb');
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  let aboneyetkilisi = await database.fetch(
    `aboneyetkilisi.${message.guild.id}`
  );
  let abonelog = await database.fetch(`abonelog.${message.guild.id}`);
  let abonerol = await database.fetch(`abonerol.${message.guild.id}`);
  let abonekisi = message.guild.members.cache.get(
    message.mentions.users.first() || message.guild.members.cache.get(args[0])
  );
  if (!abonerol)
    return message.channel.send(
      (lang === "en" ? `❌ **__Subscriber role is not set!__**` : `❌ **__Abone rolü ayarlanmamış!__**`)
    );
  if (!abonelog)
    return message.channel.send(
      (lang === "en" ? `❌ **__Subscriber log channel is not set!__**` : `❌ **__Abone log kanalı ayarlanmamış!__**`)
    );
  if (!aboneyetkilisi)
    return message.channel.send(
      (lang === "en" ? `❌ **__Subscriber staff role is not set!__**` : `❌ **__Abone yetkili rolü ayarlanmamış!__**`)
    );
  let user = message.mentions.users.first();
  if (!message.member.roles.cache.has(aboneyetkilisi))
    return message.channel.send(
      t(lang, "sistem.yetkiYok")
    );

  if (!message.mentions.users.first())
    return message.channel.send(t(lang, "sistem.kullaniciBelirt"));

  await abonekisi.roles.add(abonerol);
  const embed = new Discord.EmbedBuilder()
    .setTitle((lang === "en" ? `<a1140646128178712647>  Subscriber Role Given!` : `<a1140646128178712647>  Abone Rolü Verildi!`))
    .addFields({ name: (lang === "en" ? `<a1140645349069955084>  Given By:` : `<a1140645349069955084>  Abone Rolünü Veren Kişi:`), value: `<@${message.author.id}>`, inline: false })
    .addFields({ name: (lang === "en" ? `<a1140645349069955084>  Given To:` : `<a1140645349069955084>  Abone Rolü Verilen Kişi:`), value: `${user}`, inline: true })
   .addFields({ name: (lang === "en" ? `🔎 Message link` : `🔎 Mesaj linki`), value: (lang === "en" ? `[Jump to message](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id})` : `[Tıkla](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id})`), inline: true })
       .setColor("#00ff00")
  message.guild.channels.cache.get(abonelog).send({ embeds: [embed] });
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["a"],
  perm: 0
};
exports.help = {
  name: "abone"
};


