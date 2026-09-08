const ms = require('ms');
const { PermissionsBitField } = require('discord.js');
const db = require('croxydb');
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
    return message.channel.send(t(lang, "sistem.mesajYonet"));

  const kanal = message.mentions.channels.first();
  if (!kanal) return message.channel.send(EN ? "Mention a channel!" : "Bir kanal etiketle!");

  const sureStr = args[1];
  if (!sureStr || isNaN(ms(sureStr))) return message.channel.send(EN ? "Enter a valid duration!" : "Geçerli bir süre gir!");

  const kazananSayi = parseInt(args[2]);
  if (isNaN(kazananSayi) || kazananSayi <= 0) return message.channel.send(EN ? "Enter a valid winner count!" : "Geçerli bir kazanan sayısı gir!");

  // Ödül + şartları ayıkla
  const kalan = args.slice(3);
  let odul = [];
  let davetSarti = 0;
  let rolSarti = null;
  for (let i = 0; i < kalan.length; i++) {
    if (kalan[i] === "--davet" || kalan[i] === "-davet") { davetSarti = parseInt(kalan[i + 1]) || 0; i++; }
    else if (kalan[i] === "--rol" || kalan[i] === "-rol") { rolSarti = message.mentions.roles.first()?.id || null; }
    else odul.push(kalan[i]);
  }
  const odulAdi = odul.join(" ") || (EN ? "Prize" : "Ödül");
  if (!davetSarti && !rolSarti)
    return message.channel.send(EN ? "You must set a requirement: `--davet <count>` or `--rol @role`." : "Bir katılım şartı belirtmelisin: `--davet <sayı>` veya `--rol @rol`.");

  const sartMetni = [
    davetSarti ? (EN ? `${davetSarti}+ invites` : `${davetSarti}+ davet`) : null,
    rolSarti ? (EN ? `<@&${rolSarti}> role` : `<@&${rolSarti}> rolü`) : null
  ].filter(Boolean).join(EN ? " and " : " ve ");

  const giveaway = await client.giveawaysManager.start(kanal, {
    time: ms(sureStr),
    prize: odulAdi,
    winnerCount: kazananSayi,
    hostedBy: message.author,
    messages: {
      giveaway: (EN ? "🎉 **GIVEAWAY** 🎉\n**Requirement:** " : "🎉 **ÇEKİLİŞ** 🎉\n**Katılım Şartı:** ") + sartMetni,
      giveawayEnded: EN ? "🎉 **GIVEAWAY ENDED** 🎉" : "🎉 **ÇEKİLİŞ SONA ERDİ** 🎉",
      timeRemaining: (EN ? "Time remaining: **{duration}**!" : "Kalan süre: **{duration}**!"),
      inviteToParticipate: EN ? "React with 🎉 to participate!" : "Katılmak için 🎉 tepkisine tıklayın!",
      winMessage: EN ? "Congratulations {winners}! You won **{prize}**!" : "Tebrikler {winners}! **{prize}** ödülünü kazandın!",
      embedFooter: EN ? "Giveaway" : "Çekiliş",
      noWinner: EN ? "Giveaway cancelled, no valid entries." : "Çekiliş iptal edildi, geçerli katılım yok.",
      hostedBy: EN ? "Hosted by: {user}" : "Çekilişi Yapan: {user}",
      winners: EN ? "Winner" : "Kazanan",
      endedAt: EN ? "Ended At" : "Sona Erdi",
      units: { seconds: EN ? "seconds" : "saniye", minutes: EN ? "minutes" : "dakika", hours: EN ? "hours" : "saat", days: EN ? "days" : "gün", pluralS: false }
    }
  });

  // Şartı kaydet (bot.js giveawayEnded dinleyicisi doğrular)
  const mesajId = giveaway.id || giveaway.messageId;
  db.set(`cekilis_sart_${mesajId}`, { davet: davetSarti, rol: rolSarti, guild: message.guild.id });

  await message.channel.send(EN ? `Giveaway with requirement started in ${kanal}!` : `Şartlı çekiliş ${kanal} kanalında başlatıldı!`);
};

exports.conf = { enabled: true, guildOnly: true, aliases: ["çekiliş-şart", "cekilis-sart", "giveaway-requirement", "greq"], permLevel: 0, kategori: "cekilis" };
exports.help = { name: "çekiliş-şart", description: "Davet sayısı veya rol şartlı çekiliş başlatır.", usage: "çekiliş-şart #kanal <süre> <kazanan> <ödül> --davet <sayı> / --rol @rol" };
