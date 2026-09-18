/**
 * Otomasyon Bot - Ana Dosya
 * Topluluk Destekli AI Ticket Sistemi
 */

require("dotenv").config();

const { Client, GatewayIntentBits, Partials, Collection, ActivityType } = require("discord.js");
const path = require("path");
const config = require("./config");

// Veritabanı ve AI modüllerini yükle
const DatabaseManager = require("./database/db");
const { SoruEslestirici } = require("./ai");

// Handler'lar
const { SetupHandler, TrainingHandler, TicketHandler, CommunityHandler, RiseHandler } = require("./handlers");

// Komutlar
const commands = require("./commands");

// Event'ler
const events = require("./events");

class OtomasyonBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
      ]
    });

    this.db = null;
    this.soruEslestirici = null;
    this.handlers = {};
    this.commands = new Collection();
    this.cooldowns = new Collection();

    this.init();
  }

  async init() {
    try {
      console.log("🤖 Otomasyon Bot başlatılıyor...");

      // Veritabanı başlat
      this.db = new DatabaseManager();
      console.log("✅ Veritabanı bağlandı");

      // AI Eşleştirici başlat
      this.soruEslestirici = new SoruEslestirici(this.db);
      console.log("✅ AI Eşleştirici hazır");

      // Handler'ları başlat
      this.handlers.setup = new SetupHandler(this.db, this);
      this.handlers.training = new TrainingHandler(this.db, this);
      this.handlers.ticket = new TicketHandler(this.db, this);
      this.handlers.community = new CommunityHandler(this.db, this);
      this.handlers.rise = new RiseHandler(this.db, this);
      console.log("✅ Handler'lar yüklendi");

      // Komutları yükle
      this.loadCommands();
      console.log("✅ Komutlar yüklendi");

      // Event'leri bağla
      this.bindEvents();
      console.log("✅ Event'ler bağlandı");

      // Botu başlat
      await this.client.login(config.BOT_TOKEN);
      console.log(`✅ Bot giriş yaptı: ${this.client.user.tag}`);

      // Hazır olduğunda
      this.client.once("ready", () => this.onReady());

    } catch (error) {
      console.error("❌ Bot başlatma hatası:", error);
      process.exit(1);
    }
  }

  loadCommands() {
    for (const [name, command] of Object.entries(commands)) {
      this.commands.set(name, command);
      if (command.aliases) {
        for (const alias of command.aliases) {
          this.commands.set(alias, command);
        }
      }
    }
  }

  bindEvents() {
    // Message Create
    this.client.on("messageCreate", (message) => events.messageCreate(message, this));

    // Interaction Create
    this.client.on("interactionCreate", (interaction) => events.interactionCreate(interaction, this));

    // Guild Member Add
    this.client.on("guildMemberAdd", (member) => events.guildMemberAdd(member, this));

    // Hata yakalama
    this.client.on("error", (error) => console.error("[Discord Hatası]:", error));
    this.client.on("warn", (warning) => console.warn("[Discord Uyarısı]:", warning));

    process.on("unhandledRejection", (reason) => console.error("[Unhandled Rejection]:", reason));
    process.on("uncaughtException", (error) => console.error("[Uncaught Exception]:", error));
  }

  async onReady() {
    console.log(`\n═══════════════════════════════════`);
    console.log(`🤖 Otomasyon Bot Hazır!`);
    console.log(`👤 Bot: ${this.client.user.tag}`);
    console.log(`🌐 Sunucular: ${this.client.guilds.cache.size}`);
    console.log(`👥 Kullanıcılar: ${this.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`);
    console.log(`═══════════════════════════════════\n`);

    // Aktivite ayarla
    this.client.user.setPresence({
      activities: [{
        name: "otomasyon yardım | AI Ticket Sistemi",
        type: ActivityType.Playing
      }],
      status: "online"
    });

    // Premium sürelerini kontrol et (her saat)
    setInterval(() => this.checkPremiumExpiry(), 60 * 60 * 1000);
  }

  async checkPremiumExpiry() {
    try {
      const guilds = this.db.prepare("SELECT guild_id, premium_expires_at FROM guilds WHERE premium_active = 1 AND premium_expires_at > 0").all();
      
      for (const guild of guilds) {
        if (guild.premium_expires_at <= Date.now()) {
          this.db.updateGuild(guild.guild_id, { premium_active: 0, premium_expires_at: 0 });
          this.db.prepare("INSERT INTO premium_logs (guild_id, action, details) VALUES (?, ?, ?)").run(guild.guild_id, "expired", "Süre doldu");

          // Sunucuya bildir
          const g = this.client.guilds.cache.get(guild.guild_id);
          if (g && g.systemChannel) {
            await g.systemChannel.send({
              embeds: [{
                color: 0xFFAA00,
                title: "💎 Premium Süresi Doldu",
                description: "Bu sunucunun **Premium** süresi doldu. Avantajlar devre dışı bırakıldı.\n\nYenilemek için bot sahibi ile iletişime geçin.",
                timestamp: new Date()
              }]
            }).catch(() => {});
          }

          // Sahip log
          const config = require("./config");
          const logChannel = this.client.channels.cache.get(config.OWNER_LOG_CHANNEL);
          if (logChannel) {
            await logChannel.send({
              embeds: [{
                color: 0xFFAA00,
                title: "💎 Premium Sona Erdi",
                description: `**Sunucu:** ${g?.name || guild.guild_id} (${guild.guild_id})\nPremium süresi doldu, otomatik devre dışı bırakıldı.`,
                timestamp: new Date()
              }]
            }).catch(() => {});
          }
        }
      }
    } catch (error) {
      console.error("[Premium Kontrol Hatası]:", error);
    }
  }
}

// Botu başlat
const bot = new OtomasyonBot();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Bot kapatılıyor...");
  if (bot.db) bot.db.close();
  if (bot.client) await bot.client.destroy();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Bot kapatılıyor (SIGTERM)...");
  if (bot.db) bot.db.close();
  if (bot.client) await bot.client.destroy();
  process.exit(0);
});