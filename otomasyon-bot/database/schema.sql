-- ═══════════════════════════════════════════════
-- OTOMASYON BOT - VERİTABANI ŞEMASI
-- SQLite ile uyumlu, tek dosya, offline çalışır
-- ═══════════════════════════════════════════════

-- Sunucu ayarları
CREATE TABLE IF NOT EXISTS guilds (
    guild_id TEXT PRIMARY KEY,
    guild_name TEXT,
    language TEXT DEFAULT 'tr',
    ticket_category_id TEXT,
    no_answer_channel_id TEXT,
    admin_role_id TEXT,
    setup_completed INTEGER DEFAULT 0,
    premium_active INTEGER DEFAULT 0,
    premium_expires_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Eğitim verisi (Soru-Cevap)
CREATE TABLE IF NOT EXISTS egitim_verisi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    soru TEXT NOT NULL,
    soru_normalized TEXT NOT NULL,
    cevap TEXT NOT NULL,
    kaynak TEXT DEFAULT 'manual',
    ekleyen_user_id TEXT,
    onaylayan_user_id TEXT,
    kullanim_sayisi INTEGER DEFAULT 0,
    faydali_sayisi INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_egitim_guild ON egitim_verisi(guild_id);
CREATE INDEX IF NOT EXISTS idx_egitim_normalized ON egitim_verisi(guild_id, soru_normalized);

-- Ticket'lar
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    kullanici_id TEXT NOT NULL,
    soru TEXT NOT NULL,
    durum TEXT DEFAULT 'acik',
    cevaplayan_id TEXT,
    cevap TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    closed_at INTEGER,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id, durum);
CREATE INDEX IF NOT EXISTS idx_tickets_channel ON tickets(channel_id);

-- Setup oturumları (Kurulum state machine)
CREATE TABLE IF NOT EXISTS setup_sessions (
    guild_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    step TEXT NOT NULL,
    data TEXT,
    started_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

-- AI Eğitim oturumları (Yetkili ile diyalog)
CREATE TABLE IF NOT EXISTS ai_training_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    asama TEXT NOT NULL,
    soru TEXT,
    ham_cevap TEXT,
    ai_cevap TEXT,
    onay_mesaji_id TEXT,
    red_sayisi INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_training_guild_user ON ai_training_sessions(guild_id, user_id, asama);

-- Topluluk cevapları (no_answer kanalı için)
CREATE TABLE IF NOT EXISTS community_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    soru TEXT NOT NULL,
    soran_id TEXT NOT NULL,
    cevaplayan_id TEXT,
    cevap TEXT,
    durum TEXT DEFAULT 'bekliyor',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_community_message ON community_answers(message_id);
CREATE INDEX IF NOT EXISTS idx_community_guild ON community_answers(guild_id, durum);

-- Kullanıcı dilleri
CREATE TABLE IF NOT EXISTS user_languages (
    user_id TEXT PRIMARY KEY,
    language TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Premium log kayıtları
CREATE TABLE IF NOT EXISTS premium_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

-- Bot istatistikleri
CREATE TABLE IF NOT EXISTS bot_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    event_type TEXT NOT NULL,
    event_data TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
);