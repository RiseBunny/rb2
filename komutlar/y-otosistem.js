// komutlar/otosistem.js

const { EmbedBuilder } = require('discord.js');
const database = require('croxydb');
const { getLangSync, t } = require("../dil");
module.exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const channelNames = ['kayıt-ol', 'kayıtol', 'kayıt', 'kayıtsız'];
  const roleNames = ['kayıtsız', 'erkek', 'kız', 'kadın', 'bayan', 'bay', 'adam'];

  let kayitKanal = null;
  for (const name of channelNames) {
    const channel = message.guild.channels.cache.find(channel =>
      channel.name.toLowerCase() === name.toLowerCase() &&
      channel.isTextBased()
    );
    if (channel) {
      kayitKanal = channel;
      break;
    }
  }

  const roles = await Promise.all(roleNames.slice(0, 3).map(async name => {
    const role = message.guild.roles.cache.find(role => role.name.toLowerCase() === name.toLowerCase());
    if (!role) {
      // Eğer rol tanımlı değilse, oluşturabilir veya hata mesajı gönderebilirsiniz.
      return message.guild.roles.create({
        name,
        color: 'Random',
        reason: 'Otomatik Kayıt Sistemi için bir rol oluşturuldu.',
      });
    }
    return role;
  }));
  const [kayitsizRol, erkekRol, kizRol] = roles;

  if (!message.member.permissions.has('Administrator')) {
  return message.reply(t(lang, "sistem.yonetici"));
  }
  
  
  if (kayitKanal && kayitsizRol && erkekRol && kizRol) {
    // Verileri veritabanına kaydet
    database.set(`kayıt-kanal.${message.guild.id}`, kayitKanal.id);
    database.set(`kayıt-kayıtsız.${message.guild.id}`, kayitsizRol.id);
    database.set(`kayıt-erkek.${message.guild.id}`, erkekRol.id);
    database.set(`kayıt-kız.${message.guild.id}`, kizRol.id);

    const successEmbed = new EmbedBuilder()
      .setColor('Green')
      .setTitle((lang === "en" ? 'Automatic Registration System Set Up Successfully' : 'Otomatik Kayıt Sistemi Başarıyla Kuruldu'))
      .setDescription((lang === "en" ? `Register Channel: ${kayitKanal}\nUnregistered Role: ${kayitsizRol}\nMale Role: ${erkekRol}\nFemale Role: ${kizRol}` : `Kayıt Kanalı: ${kayitKanal}\nKayıtsız Rolü: ${kayitsizRol}\nErkek Rolü: ${erkekRol}\nKız Rolü: ${kizRol}`));

    message.channel.send({ embeds: [successEmbed] });

  } else {
    // Hata durumu
    const EN2 = lang === "en";
    let errorMessage = EN2 ? 'Missing items:\n' : 'Aşağıdaki öğeler bulunamadı:\n';
    if (!kayitKanal) errorMessage += EN2 ? '- Register channel\n' : '- Kayıt kanalı\n';
    if (!kayitsizRol) errorMessage += EN2 ? '- Unregistered role\n' : '- Kayıtsız rolü\n';
    if (!erkekRol) errorMessage += EN2 ? '- Male role\n' : '- Erkek rolü\n';
    if (!kizRol) errorMessage += EN2 ? '- Female role\n' : '- Kız rolü\n';

    const errorEmbed = new EmbedBuilder()
      .setColor('Red')
      .setTitle((lang === "en" ? 'Error' : 'Hata'))
      .setDescription(errorMessage);

    message.channel.send({ embeds: [errorEmbed] });
  }
};

module.exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ['y-otosistem'],
  permLevel: 0,
   kategori: "yapayzeka"
};

module.exports.help = {
  name: 'y-otosistem'
};
