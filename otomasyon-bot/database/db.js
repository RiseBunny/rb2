const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const config = require("../config");

class DatabaseManager {
  constructor() {
    const dbPath = config.DB_PATH;
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.initTables();
  }

  initTables() {
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    this.db.exec(schema);
    console.log("✅ Veritabanı tabloları hazır");
  }

  // ═══════════════════════════════════════════════
  // GUILD (SUNUCU) İŞLEMLERİ
  // ═══════════════════════════════════════════════

  getGuild(guildId) {
    return this.db.prepare("SELECT * FROM guilds WHERE guild_id = ?").get(guildId);
  }

  createGuild(guildId, guildName) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO guilds (guild_id, guild_name, setup_completed)
      VALUES (?, ?, 0)
    `);
    stmt.run(guildId, guildName);
    return this.getGuild(guildId);
  }

  updateGuild(guildId, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    if (fields.length === 0) return;
    values.push(guildId);
    this.db.prepare(`UPDATE guilds SET ${fields.join(", ")} WHERE guild_id = ?`).run(...values);
  }

  deleteGuild(guildId) {
    this.db.prepare("DELETE FROM guilds WHERE guild_id = ?").run(guildId);
  }

  // ═══════════════════════════════════════════════
  // EĞİTİM VERİSİ İŞLEMLERİ
  // ═══════════════════════════════════════════════

  addEgitimVerisi(guildId, soru, cevap, ekleyenUserId, kaynak = "manual", onaylayanUserId = null) {
    const normalized = this.normalizeSoru(soru);
    const stmt = this.db.prepare(`
      INSERT INTO egitim_verisi (guild_id, soru, soru_normalized, cevap, kaynak, ekleyen_user_id, onaylayan_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(guildId, soru, normalized, cevap, kaynak, ekleyenUserId, onaylayanUserId);
    return result.lastInsertRowid;
  }

  searchEgitimVerisi(guildId, soru, limit = 5) {
    const normalized = this.normalizeSoru(soru);
    // Önce tam eşleşme ara
    let results = this.db.prepare(`
      SELECT * FROM egitim_verisi 
      WHERE guild_id = ? AND soru_normalized = ?
      ORDER BY kullanim_sayisi DESC
      LIMIT ?
    `).all(guildId, normalized, limit);

    if (results.length > 0) return results;

    // Fuzzy search: LIKE ile ara
    const words = normalized.split(" ").filter(w => w.length > 2);
    if (words.length === 0) return [];

    const placeholders = words.map(() => "soru_normalized LIKE ?").join(" OR ");
    const params = [guildId, ...words.map(w => `%${w}%`), limit];
    
    results = this.db.prepare(`
      SELECT * FROM egitim_verisi 
      WHERE guild_id = ? AND (${placeholders})
      ORDER BY kullanim_sayisi DESC
      LIMIT ?
    `).all(...params);

    return results;
  }

  getEgitimVerisiById(id) {
    return this.db.prepare("SELECT * FROM egitim_verisi WHERE id = ?").get(id);
  }

  incrementKullanim(id) {
    this.db.prepare("UPDATE egitim_verisi SET kullanim_sayisi = kullanim_sayisi + 1 WHERE id = ?").run(id);
  }

  incrementFaydali(id) {
    this.db.prepare("UPDATE egitim_verisi SET faydali_sayisi = faydali_sayisi + 1 WHERE id = ?").run(id);
  }

  addSoruVaryasyonu(guildId, orijinalSoru, yeniSoru, ekleyenUserId) {
    const orijinal = this.db.prepare("SELECT * FROM egitim_verisi WHERE guild_id = ? AND soru_normalized = ?")
      .get(guildId, this.normalizeSoru(orijinalSoru));
    if (orijinal) {
      this.addEgitimVerisi(guildId, yeniSoru, orijinal.cevap, ekleyenUserId, "user_feedback", orijinal.onaylayan_user_id);
    }
  }

  normalizeSoru(soru) {
    return soru
      .toLowerCase()
      .replace(/[ıİ]/g, "i")
      .replace(/[şŞ]/g, "s")
      .replace(/[ğĞ]/g, "g")
      .replace(/[üÜ]/g, "u")
      .replace(/[öÖ]/g, "o")
      .replace(/[çÇ]/g, "c")
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ═══════════════════════════════════════════════
  // TICKET İŞLEMLERİ
  // ═══════════════════════════════════════════════

  createTicket(guildId, channelId, kullaniciId, soru) {
    const stmt = this.db.prepare(`
      INSERT INTO tickets (guild_id, channel_id, kullanici_id, soru, durum)
      VALUES (?, ?, ?, ?, 'acik')
    `);
    const result = stmt.run(guildId, channelId, kullaniciId, soru);
    return result.lastInsertRowid;
  }

  getTicketByChannel(channelId) {
    return this.db.prepare("SELECT * FROM tickets WHERE channel_id = ?").get(channelId);
  }

  getOpenTickets(guildId) {
    return this.db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND durum = 'acik' ORDER BY created_at DESC").all(guildId);
  }

  closeTicket(channelId, cevaplayanId, cevap) {
    const now = Date.now();
    this.db.prepare(`
      UPDATE tickets SET durum = 'kapandi', cevaplayan_id = ?, cevap = ?, closed_at = ? WHERE channel_id = ?
    `).run(cevaplayanId, cevap, now, channelId);
  }

  updateTicketStatus(channelId, durum, cevaplayanId = null, cevap = null) {
    const now = Date.now();
    if (cevaplayanId && cevap) {
      this.db.prepare(`
        UPDATE tickets SET durum = ?, cevaplayan_id = ?, cevap = ?, closed_at = ? WHERE channel_id = ?
      `).run(durum, cevaplayanId, cevap, now, channelId);
    } else {
      this.db.prepare("UPDATE tickets SET durum = ? WHERE channel_id = ?").run(durum, channelId);
    }
  }

  // ═══════════════════════════════════════════════
  // SETUP SESSIONS
  // ═══════════════════════════════════════════════

  createSetupSession(guildId, userId, step = "waiting_category", data = {}) {
    const now = Date.now();
    this.db.prepare(`
      INSERT OR REPLACE INTO setup_sessions (guild_id, user_id, step, data, started_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(guildId, userId, step, JSON.stringify(data), now, now);
  }

  getSetupSession(guildId) {
    return this.db.prepare("SELECT * FROM setup_sessions WHERE guild_id = ?").get(guildId);
  }

  updateSetupSession(guildId, updates) {
    const session = this.getSetupSession(guildId);
    if (!session) return false;
    
    const data = { ...JSON.parse(session.data || "{}"), ...updates };
    const now = Date.now();
    this.db.prepare(`
      UPDATE setup_sessions SET step = ?, data = ?, updated_at = ? WHERE guild_id = ?
    `).run(updates.step || session.step, JSON.stringify(data), now, guildId);
    return true;
  }

  deleteSetupSession(guildId) {
    this.db.prepare("DELETE FROM setup_sessions WHERE guild_id = ?").run(guildId);
  }

  // ═══════════════════════════════════════════════
  // AI TRAINING SESSIONS
  // ═══════════════════════════════════════════════

  createTrainingSession(guildId, userId, soru) {
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO ai_training_sessions (guild_id, user_id, asama, soru)
      VALUES (?, ?, 'cevap_bekleniyor', ?)
    `).run(guildId, userId, soru);
    return this.db.prepare("SELECT last_insert_rowid() as id").get().id;
  }

  getTrainingSession(id) {
    return this.db.prepare("SELECT * FROM ai_training_sessions WHERE id = ?").get(id);
  }

  getActiveTrainingSession(guildId, userId) {
    return this.db.prepare(`
      SELECT * FROM ai_training_sessions 
      WHERE guild_id = ? AND user_id = ? AND asama != 'tamamlandi'
      ORDER BY created_at DESC LIMIT 1
    `).get(guildId, userId);
  }

  updateTrainingSession(id, updates) {
    const session = this.getTrainingSession(id);
    if (!session) return false;
    
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    if (fields.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE ai_training_sessions SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return true;
  }

  // ═══════════════════════════════════════════════
  // COMMUNITY ANSWERS
  // ═══════════════════════════════════════════════

  createCommunityAnswer(guildId, messageId, soru, soranId) {
    const stmt = this.db.prepare(`
      INSERT INTO community_answers (guild_id, message_id, soru, soran_id, durum)
      VALUES (?, ?, ?, ?, 'bekliyor')
    `);
    const result = stmt.run(guildId, messageId, soru, soranId);
    return result.lastInsertRowid;
  }

  getCommunityAnswerByMessage(messageId) {
    return this.db.prepare("SELECT * FROM community_answers WHERE message_id = ?").get(messageId);
  }

  updateCommunityAnswer(messageId, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    if (fields.length === 0) return;
    values.push(messageId);
    this.db.prepare(`UPDATE community_answers SET ${fields.join(", ")} WHERE message_id = ?`).run(...values);
  }

  // ═══════════════════════════════════════════════
  // KULLANICI DİLİ
  // ═══════════════════════════════════════════════

  getUserLanguage(userId) {
    const row = this.db.prepare("SELECT language FROM user_languages WHERE user_id = ?").get(userId);
    return row?.language;
  }

  setUserLanguage(userId, language) {
    this.db.prepare(`
      INSERT OR REPLACE INTO user_languages (user_id, language, updated_at)
      VALUES (?, ?, ?)
    `).run(userId, language, Date.now());
  }

  // ═══════════════════════════════════════════════
  // KAPATMA
  // ═══════════════════════════════════════════════

  close() {
    this.db.close();
  }
}

module.exports = DatabaseManager;