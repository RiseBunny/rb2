require("dotenv").config();

module.exports = {
  // Bot ayarları
  BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN,
  PREFIX: process.env.PREFIX || "otomasyon",
  OWNER_ID: process.env.OWNER_ID || "0",

  // Premium ayarları
  PREMIUM_SERVER: process.env.PREMIUM_SERVER_ID || "0",

  // Veritabanı
  DB_PATH: process.env.DB_PATH || "./database/otomasyon.db",

  // Geliştirme modu
  DEV_MODE: process.env.NODE_ENV === "development",

  // Log kanalı (sahip log)
  OWNER_LOG_CHANNEL: process.env.OWNER_LOG_CHANNEL || "0",

  // Destek sunucusu
  SUPPORT_SERVER_INVITE: process.env.SUPPORT_SERVER_INVITE || "https://discord.gg/otomasyon",
};