/**
 * Message Create Event - Ana mesaj işleyici
 */

const { hataEmbed } = require("../utils/embeds");
const config = require("../config");

module.exports = async (message, client) => {
  // Bot mesajlarını yoksay
  if (message.author.bot) return;

  // DM kontrolü
  const isDM = !message.guild;

  // Prefix kontrolü
  const prefix = "otomasyon";
  
  // Komut mu yoksa AI sohbeti mi?
  const isCommand = message.content.toLowerCase().startsWith(prefix + " ");
  const isAIChat = message.content.toLowerCase().startsWith(prefix + " ") && 
    !["eğit", "egit", "sıfırla", "sifirla", "premium", "istatistik", "stats", "dil", "adminrol", "yardım", "help", "ping"].some(cmd => 
      message.content.toLowerCase().startsWith(prefix + " " + cmd + " ")
    );

  // Önce handler'ları dene
  try {
    // 1. Setup handler (kurulum süreci)
    const setupSession = client.db.getSetupSession(message.guild?.id);
    if (setupSession && setupSession.user_id === message.author.id) {
      const handled = await client.handlers.setup.mesajIsle(message);
      if (handled) return;
    }

    // 2. Training handler (admin eğitim butonları)
    // Bu interactionCreate'de işlenir

    // 3. Rise handler (AI sohbet)
    if (isAIChat || isCommand) {
      const handled = await client.handlers.rise.isle(message);
      if (handled) return;
    }

    // 4. Training handler (admin soru yönetimi)
    if (message.guild) {
      const handled = await client.handlers.training.adminSoruYonet(message);
      if (handled) return;
    }

    // 5. Normal komut işleme
    if (isCommand) {
      await komutIsle(message, client);
      return;
    }

  } catch (error) {
    console.error("[MessageCreate Hatası]:", error);
    if (!isDM) {
      await message.reply({ embeds: [hataEmbed("Hata", "Mesaj işlenirken bir hata oluştu.")] }).catch(() => {});
    }
  }
};

/**
 * Normal komut işleyici
 */
async function komutIsle(message, client) {
  const prefix = "otomasyon";
  const content = message.content.slice(prefix.length).trim();
  const args = content.split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName) || 
    client.commands.find(cmd => cmd.aliases?.includes(commandName));

  if (!command) return;

  // Cooldown kontrolü
  if (command.cooldown) {
    const key = `${command.name}_${message.author.id}`;
    const now = Date.now();
    const timestamps = client.cooldowns.get(command.name) || new Map();
    const expirationTime = (timestamps.get(key) || 0) + command.cooldown * 1000;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return message.reply({ content: `⏳ Bu komutu tekrar kullanmak için **${timeLeft.toFixed(1)} saniye** bekleyin.`, allowedMentions: { repliedUser: false } });
    }
    timestamps.set(key, now);
    client.cooldowns.set(command.name, timestamps);
  }

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(`[Komut Hatası - ${command.name}]:`, error);
    await message.reply({ embeds: [hataEmbed("Hata", "Komut çalıştırılırken bir hata oluştu.")] }).catch(() => {});
  }
}