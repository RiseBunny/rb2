const Discord = require('discord.js')
const data = require('croxydb')
const { getLangSync, t } = require("../dil");

exports.run = async (client, message, args) => {
  const lang = getLangSync(message.author.id);
let prefix = 'r!'// botun prefixi

if(!message.member.permissions.has(Discord.PermissionFlagsBits.ManageMessages)) return message.channel.send(t(lang, "sistem.yetkiYok"))
if(!args[0]) return message.channel.send((lang === "en" ? `To use the system, use ${prefix}warn add/remove/info commands.` : `Sistemi kullanmak için, ${prefix}uyarı ekle/sil/bilgi komutlarını kullanın.`))


if(args[0] === 'ekle') {
let kullanıcı = message.mentions.users.first()
if(!args[1]) return message.channel.send(t(lang, "sistem.kullaniciBelirt"))
if(!kullanıcı) return message.channel.send((lang === "en" ? `${args[1]}, user not found on this server.` : `${args[1]}, kullanıcısını sunucuda bulamıyorum.`))
if(kullanıcı.bot) return message.channel.send((lang === "en" ? `I cannot warn bots.` : `Botları uyaramam.`))
if(kullanıcı.id === message.author.id) return message.channel.send((lang === "en" ? `You cannot warn yourself.` : `Kendini uyaramazsın.`))
let reason = args.slice(2).join(' ')

data.add(`uyarı.${message.guild.id}.${kullanıcı.id}`, +1)
const syı = await data.fetch(`uyarı.${message.guild.id}.${kullanıcı.id}`)

if(!reason) {
await message.channel.send((lang === "en" ? `${kullanıcı}, warned!\nTotal warnings: ${syı}` : `${kullanıcı}, uyarıldı!\nToplam uyarı sayısı: ${syı}`)) 
return}

if(reason) {
await message.channel.send((lang === "en" ? `${kullanıcı}, warned!\nTotal warnings: ${syı}` : `${kullanıcı}, uyarıldı!\nToplam uyarı sayısı: ${syı}`))
return} }

if(args[0] === 'sil') {
let kullanıcı = message.mentions.users.first()
if(!args[1]) return message.channel.send(t(lang, "sistem.kullaniciBelirt"))
if(!kullanıcı) return message.channel.send((lang === "en" ? `${args[1]}, user not found on this server.` : `${args[1]}, kullanıcısını sunucuda bulamıyorum.`))
if(kullanıcı.id === message.author.id) return message.channel.send((lang === "en" ? `You cannot warn yourself.` : `Kendini uyaramazsın.`))

let sayı = args[2]
if(!sayı) return message.channel.send((lang === "en" ? `You did not specify how many warnings to delete!` : `Silinecek uyarı sayısını yazmadın!`))
if(isNaN(sayı)) return message.channel.send((lang === "en" ? `You did not specify how many warnings to delete!` : `Silinecek uyarı sayısını yazmadın!`))
if(sayı === '0') return message.channel.send((lang === "en" ? `Are you trying to fool me?` : `Beni mi kandırmaya çalışıyorsun sen?`))
const syı2 = await data.fetch(`uyarı.${message.guild.id}.${kullanıcı.id}`)
if(syı2 < sayı) return message.channel.send((lang === "en" ? `${kullanıcı} has ${syı2} warnings! You can only delete that many.` : `${kullanıcı}, kullanıcısının uyarı sayısı: ${syı2}! Sadece bu kadar silebilirsin.`))

data.add(`uyarı.${message.guild.id}.${kullanıcı.id}`, -sayı)
const syı = await data.fetch(`uyarı.${message.guild.id}.${kullanıcı.id}`)
await message.channel.send((lang === "en" ? `${kullanıcı}, warning removed!\nTotal warnings: ${syı ? syı : '0'}` : `${kullanıcı}, uyarısı silindi!\nToplam uyarı sayısı: ${syı ? syı : '0'}`)) }

if(args[0] === 'bilgi') {
let kullanıcı = message.mentions.users.first()
if(!args[1]) return message.channel.send(t(lang, "sistem.kullaniciBelirt"))
if(!kullanıcı) return message.channel.send((lang === "en" ? `${args[1]}, user not found on this server.` : `${args[1]}, kullanıcısını sunucuda bulamıyorum.`))

const syı2 = await data.fetch(`uyarı.${message.guild.id}.${kullanıcı.id}`)
if(!syı2) return message.channel.send((lang === "en" ? `${kullanıcı} has no warnings.` : `${kullanıcı}, kullanıcısının hiç uyarısı yok.`))
await message.channel.send((lang === "en" ? `${kullanıcı}:\nTotal warnings: ${syı2 ? syı2 : '0'}` : `${kullanıcı}:\nToplam uyarı sayısı: ${syı2 ? syı2 : '0'}`)) }
};

exports.conf = {
enabled: true,
guildOnly: false,
aliases: ['warn','uyar'],
permLevel: 0,
}

exports.help = {
name: 'uyarı'
}