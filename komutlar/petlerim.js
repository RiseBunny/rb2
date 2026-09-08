const db = require('croxydb');
const { getLangSync } = require("../dil");
exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
  const userId = message.mentions.users.first() ? message.mentions.users.first().id : message.author.id;

  const userPets = db.get(`pets_${userId}`) || [];

  if (userPets.length === 0) {
    return message.channel.send(lang === "en" ? 'This user has no pets.' : 'Bu kullanıcının hiç peti yok.');
  }

  const petList = userPets.map((pet, index) => `${index + 1}. ${pet.emoji} ${pet.name}`).join('\n');

  message.channel.send((lang === "en" ? `**${userId === message.author.id ? 'Your Pets' : 'Their Pets'}**:\n${petList}` : `**${userId === message.author.id ? 'Sahip Olduğunuz Petler' : 'Etiketlenen Kullanıcının Petleri'}**:\n${petList}`));
};

exports.conf = {
  enabled: true,
  aliases: ['petlerim', 'petler'],
  guildOnly: false,
  permLevel: 0
};

exports.help = {
  name: 'petlerim',
  description: 'Sahip olduğunuz petleri görüntüler.',
  usage: 'petlerim [@kullanici]'
};
