const Discord = require('discord.js');
const ms = require('ms');
const database = require('croxydb');
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  // Komutu sadece adminlerin kullanmasına izin vermek için yetki kontrolü yapın
  if (!message.member.permissions.has(Discord.PermissionFlagsBits.Administrator)) {
    return message.channel.send(t(lang, "sistem.yonetici"));
  }

  // Kullanıcıdan hedef kullanıcıyı, rolü ve süreyi etiketlemesini isteyin
  const hedefKullanici = message.mentions.members.first();
  if (!hedefKullanici) return message.reply((lang === "en" ? 'You must mention the user to give the role to!' : 'Rol vermek istediğiniz kullanıcıyı etiketlemelisiniz!'));

  const rol = message.mentions.roles.first();
  if (!rol) return message.reply((lang === "en" ? 'You must mention the role to set!' : 'Ayarlamak istediğiniz rolü etiketlemelisiniz!'));

  const sureArg = args[2];
  if (!sureArg) return message.reply((lang === "en" ? 'You must specify a duration. Example: `1s` (1 second), `1m` (1 minute), `1h` (1 hour), `1w` (1 week)' : 'Bir süre belirtmelisiniz. Örnek: `1s` (1 saniye), `1m` (1 dakika), `1h` (1 saat), `1w` (1 hafta)'));

  // Belirtilen süreyi milisaniyeye çevirin
  const sureMs = ms(sureArg);
  if (!sureMs) return message.reply((lang === "en" ? 'You specified an invalid duration. Example: `1s` (1 second), `1m` (1 minute), `1h` (1 hour), `1w` (1 week)' : 'Geçersiz bir süre belirttiniz. Örnek: `1s` (1 saniye), `1m` (1 dakika), `1h` (1 saat), `1w` (1 hafta)'));

  // Hedef kullanıcıya rolü verin
  hedefKullanici.roles.add(rol);

  // Verilen rolü ve sonlanma zamanını veritabanına kaydedin
  const sonlanmaZamani = Date.now() + sureMs;
  database.set(`suresi.${message.guild.id}.${hedefKullanici.id}.${rol.id}`, {
    sonlanmaZamani: sonlanmaZamani,
  });

  // Başarılı yanıtı ve süreyi içeren bir mesaj gönderin
  const kalanSure = ms(sureMs, { long: true }); // Süreyi daha okunabilir bir formata dönüştürün
  const basariliMesaj = new Discord.EmbedBuilder()
    .setColor('Green')
    .setTitle((lang === "en" ? 'Role Given Successfully!' : 'Rol Başarıyla Verildi!'))
    .setDescription((lang === "en" ? `${hedefKullanici} got **${rol.name}** for ${kalanSure}.` : `${hedefKullanici} kullanıcısına **${rol.name}** rolü, başarıyla verildi ve ${kalanSure} süre boyunca aktif olacak.`));

  message.channel.send({ embeds: [basariliMesaj] });
};

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['sürelirol', 'rolver', 'rolvergelsin'],
  permLevel: 0
};

exports.help = {
  name: 'sürelirol',
  description: 'Belirtilen süre boyunca bir kullanıcıya rol verir.',
  usage: 'sürelirol @Kullanıcı @Rol <Süre>'
};
