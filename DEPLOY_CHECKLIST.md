# Deploy Checklist

## 1. Environment Variables (.env)
```env
GROQ_API_KEY=gsk_...
NVIDIA_API_KEY=nvapi-...
GEMINI_API_KEY=AIza...
CEREBRAS_API_KEY=csk-...
OPENROUTER_API_KEY=sk-or-...
DISCORD_BOT_TOKEN=your_bot_token
SAHIP_ID=985126554306773063
OWNER_LOG=1192951046012670204
PREFIX=r!
DESTEK_SUNUCU_LINK=https://discord.gg/mEfz5SfpbR
```

## 2. Dependencies (already in package.json)
```bash
npm install
```

## 3. AI Data Migration (one-time)
```bash
node migrate-ai-data.js
```

## 4. Start Bot
```bash
node bot.js
```

## 5. Verify in Discord
- `r!otomasyon` → starts interactive setup
- `r!otomasyon öğret soru | cevap` → adds training data
- `rise selam` → tests local AI
- `@admin_user` (in otomasyon server) → greeting message
- `r!engelle aç` → button selection for scope
- `r!veri gör <ID>` (owner only) → view data
- `r!veri sil <ID>` → delete all data

## 5. Verify Logs
- Owner log channel receives:
  - 🧠 AI Learning Log (✅ Kaydet / 🗑️ Sil)
  - ❌ AI Error Report (🛑)
  - ❓ Cevapsız Soru (🧠 Öğret)
  - ✅ Otomasyon kuruldu/kapandı/ayarı değiştirildi
  - 🤖 AI Öğrenme (💾 Kaydet / 🗑️ Sil)
  - 🎫 Ticket açıldı/kapandı
