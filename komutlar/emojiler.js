const Discord = require("discord.js");
const { getLangSync, t } = require("../dil");

exports.run = async(client, msg, args) => {
  const lang = getLangSync(msg.author.id);

        let animEmotes = [],
            staticEmotes = [];
  var guild = msg.guild

        guild.emojis.cache.forEach((e) => {
            e.animated ? animEmotes.push(`<a:${e.name}:${e.id}>`) : staticEmotes.push(`<:${e.name}:${e.id}>`);
        });
        staticEmotes = staticEmotes.length !== 0 ? `__**[${staticEmotes.length}] Normal Emoji**__\n${staticEmotes.join('')}` : '\n**Normal Emoji Bulunmuyor**';
        animEmotes = animEmotes.length !== 0 ? `\n\n__**[${animEmotes.length}] Hareketli Emoji**__\n${animEmotes.join('')}` : '\n**Hareketli Emoji Bulunmuyor**';
        try {     
  let botembed = new Discord.EmbedBuilder()
            .setColor(`RANDOM`)
            .setDescription(staticEmotes + animEmotes)
            .setAuthor({ name: (lang === "en" ? `${msg.guild.name} Server Emojis` : `${msg.guild.name} Sunucusu Emojileri`), iconURL: msg.guild.iconURL() })
    .setFooter({ text: (lang === "en" ? `User running this command ` : 'Bu komutu kullanan kullanıcı ') + msg.author.tag, iconURL: msg.author.displayAvatarURL() })
            .setTimestamp()
        return msg.channel.send({ embeds: [botembed] })
      } catch (err) {
        const embed = new Discord.EmbedBuilder()
            .addFields({ name: (lang === "en" ? `Emojis Found on the Server` : `Sunucuda Bulunan Emojiler`), value: (lang === "en" ? 'Sorry, your server has either too many emojis or none at all. I cannot show them. Discord does not allow it.' : 'Üzgünüm ama sunucunuzda ya çok fazla emoji bulunuyor ya da hiç emoji bulunmuyor. Bunları gösteremiyorum. Discord buna izin vermiyor.') })
            .setColor('Red')
          .setFooter({ text: (lang === "en" ? `User running this command ` : 'Bu komutu kullanan kullanıcı ') + msg.author.tag, iconURL: msg.author.displayAvatarURL() })
            .setTimestamp()
        msg.channel.send({ embeds: [embed] })
                              
    }
}
//GNARGE BOT ALTYAPISIN'DAN BU DOSYAYA AKTARILMIŞTIR!
exports.conf = {
 aliases: ['emoji-liste'],
 permLevel: 0,
 kategori: 'Sunucu'
};

exports.help = {
 name: 'emojiler',
 description: 'Sunucudaki tüm emojileri gösterir.',
 usage: 'emojiler'
};
