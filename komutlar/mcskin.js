const Discord = require(`discord.js`);
const { getLangSync, t } = require("../dil");
exports.run = (client, message, args) => {
  const lang = getLangSync(message.author.id);
  let mesaj = args.slice(0).join(" ");
  let member = message.mentions.members.first();
  let body = "https://mc-heads.net/body/" + mesaj;
  let user = message.mentions.users.first() || message.author;

  let userinfo = {};
  userinfo.avatar = user.displayAvatarURL();
  if (mesaj.length < 1)
    return message.channel.send((lang === "en" ? `You must specify a player name.` : `Bir oyuncu adı belirtmelisin.`));
  if (mesaj == member) {
    return message.channel.send(
      (lang === "en" ? `Specify a player name, not a user` : `Kullanıcı değil, bir oyuncu adı belirtmelisin`)
    );
  } else {
    const mcbody = new Discord.EmbedBuilder()
      .setColor("DarkButNotBlack")
      .setTitle((lang === "en" ? "Player: " : "Oyuncu: ") + mesaj)
      .setImage(body)
      .setFooter({ text: (lang === "en" ? `Requested by ${message.author.username}.` : `${message.author.username} tarafından istendi.`), iconURL: userinfo.avatar });
    message.channel.send({ embeds: [mcbody] });
  }
};
exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['skin'],
  permLevel: 0
};
exports.help = {
  name: "mc-skin",
  description: "Belirtilen oyuncunun kostümünü gösterir.",
  usage: "mcskin <oyuncu>"
};
