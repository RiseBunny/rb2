const Discord = require("discord.js")
const { getLangSync, t } = require("../dil");
const {EmbedBuilder} = Discord
exports.run = async (client,message,args) =>{
  const lang = getLangSync(message.author.id);
  let yazı = args[0]
  if(!yazı) return message.channel.send((lang === "en" ? " Enter some text to create a logo." : " Logo oluşturmak için bir yazı girmelisin."))
  let api = `https://habbofont.net/font/palooza/${yazı}.gif`
  const embed = new EmbedBuilder()
  .setColor("Blue")
  .setImage(api)
  message.channel.send({ embeds: [embed] })
}
exports.conf = {
        enabled: true,
        guildOnly: false,
        aliases: [],
        permLevel: 0,
    kategori: "logo",
   
      };
      
    exports.help = {
        name: 'gold',
        description: '',
        usage: '',
   
    };