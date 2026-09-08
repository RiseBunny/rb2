//https://habbofont.net/font/black/enter+your+text+here.gif
const Discord = require("discord.js")
const { getLangSync, t } = require("../dil");
const {EmbedBuilder} = Discord
exports.run = async (client,message,args) =>{
  const lang = getLangSync(message.author.id);
  let yazı = args[0]
  if(!yazı) return message.channel.send((lang === "en" ? "You must enter some text to create a logo." : "Logo oluşturmak için bir yazı girmelisin."))
  let api = `https://flamingtext.com/net-fu/proxy_form.cgi?imageoutput=true&script=graffiti-logo&text=${yazı}`
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
        name: 'graffiti',
        description: '',
        usage: '',
   
    };