const { getLangSync, t } = require("../dil");
 exports.run = (client, message) => {
  const lang = getLangSync(message.author.id);
        let db = require('croxydb')
        let Discord = require("discord.js")
    let reklam = db.fetch(`reklam.${message.guild.id}.durum`)
  const member3 = new Discord.EmbedBuilder()
     .setColor(0x36393F)
.setDescription((lang === "en" ? ` **ERROR** - You are not staff on this server.` : ` **HATA**  - Bu sunucuda yetkili değilsin.`))
        if (!message.member.permissions.has(Discord.PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [member3] })
    const member = new Discord.EmbedBuilder()
     .setColor(0x36393F)
.setDescription((lang === "en" ? ` **ERROR** - Mention a channel.` : ` **HATA**  - Bir kanal etiketle.`))
      if(reklam) {
        let kanal = message.mentions.channels.first()
        if(!kanal) return message.channel.send({ embeds: [member] })
      db.set(`reklam.${message.guild.id}.kanal`,kanal.id)
      message.channel.send((lang === "en" ? ` **Ad log channel set successfully.** ` : ` **Başarılı ile reklam log kanalı ayarlandı.** `)).then(l => {
      setTimeout(() => l.delete().catch(() => {}), 5000)
    })
    }else{
     message.channel.send((lang === "en" ? ` **Ad filter is not on.**` : ` **Reklam engel açık değil.**`)).then(l => {
      setTimeout(() => l.delete().catch(() => {}), 5000)
    })
    }
    }

exports.conf = {
  enabled: true,
  guildOnly: false,
  aliases: ["reklam-log"],
  permLevel: 0
};

exports.help = {
  name: 'reklamlog',
  description: 'WESTRA',
  usage: 'WESTRA'
}