/**
 * Ping Komutu
 */

module.exports = {
  name: "ping",
  description: "Bot gecikmesini gösterir",
  aliases: ["p"],
  cooldown: 2,

  async execute(message, args, client) {
    const sent = await message.reply("🏓 Pong! Hesaplanıyor...");
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    await sent.edit(`🏓 **Pong!**\nMesaj gecikmesi: **${latency}ms**\nAPI gecikmesi: **${apiLatency}ms**`);
  }
};