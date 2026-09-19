# RiseBunny AI Sistemi - Kurulum ve Kullanım Rehberi

## 📋 Genel Bakış

RiseBunny AI sistemi, Discord sunucularında doğal dil işleme yeteneği sağlayan bir yapay zeka sohbet sistemidir. Sistem iki katmanlı çalışır:

1. **Local DB (croxydb)** - Hızlı, ücretsiz, çevrimdışı cevaplar
2. **Groq AI (GPT-OSS 20B)** - Gelişmiş, ücretsiz API ile gelişmiş cevaplar

## 🚀 Kurulum

### 1. Gereksinimler

```bash
# Gerekli paketler (package.json'da zaten mevcut)
npm install node-fetch croxydb discord.js
```

### 2. Environment Variables

`.env` dosyasına şu değişkenleri ekleyin:

```env
# Discord Bot Token
DISCORD_BOT_TOKEN=your_bot_token_here

# Groq API Key (https://console.groq.com/keys adresinden alınabilir)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx

# Sahip ID (Owner log butonları için)
OWNER_ID=985126554306773063

# Owner Log Kanal ID
OWNER_LOG=1192951046012670204
```

### 3. AI Verilerini Yükleme

İlk kurulumda ve `cevaplar.json` güncellendiğinde:

```bash
node migrate-ai-data.js
```

Bu komut `cevaplar.json` dosyasındaki tüm soru-cevap çiftlerini croxydb'ye `ai_qa_*` anahtarlarıyla kaydeder.

## 🤖 Kullanım

### Temel Komutlar

| Komut | Açıklama |
|-------|----------|
| `rise <soru>` | AI'ya soru sor |
| `rise` | Karşılama mesajı |

### Örnekler

```
Kullanıcı: rise nasılsın
Bot: Sistemlerim tıkır tıkır çalışıyor! ⚡ Sen nasılsın Ahmet? Bugün nasıl yardımcı olabilirim?

Kullanıcı: rise adın ne
Bot: Ben **RiseBunny**! 🐰 Bu sunucuyu yönetmeye, eğlendirmeye ve size yardımcı olmaya gelmiş bir Discord botuyum.

Kullanıcı: rise quantum computing nedir
Bot: [Groq AI cevabı] + "🧠 RiseBunny'ye öğret" butonu
```

## 🧠 AI Sistemi Nasıl Çalışır?

### Akış Şeması

```
Kullanıcı: "rise <soru>"
         ↓
1. Local DB (croxydb) ara → matcher.bul()
   ↓ ✅ Bulundu (skor ≥ %50)
2. Cevap ver + "yazıyor..." efekti
   ↓ ❌ Bulunamadı
3. Groq AI'ye sor (system prompt + eğitim verileri + dil)
   ↓ ✅ Cevap geldi
4. Cevap ver + "🧠 RiseBunny'ye öğret" butonu
   ↓ Kullanıcı butona basar
5. learnCache'ten al → croxydb'ye kaydet + cache temizle
   ↓ Owner log'a gönder (💾 Kaydet / 🗑️ Sil butonları)
   ↓ ❌ Groq hata/limit
5. Hata mesajı + Owner log (✅ Anlaşıldı butonu)
   ↓ ❌ Groq cevap veremezse
5. "Anlayamadım" mesajı + Owner log (🧠 Öğret butonu)
   ↓ Sahip butona basar → Modal açılır → Cevap yazar → Kaydeder
```

### Veri Kaynakları

| Kaynak | Öncelik | Açıklama |
|--------|---------|----------|
| `cevaplar.json` | 1 | 22 kategori, 197+ soru-cevap çifti (TR/EN) |
| `ai_qa_*` (croxydb) | 2 | Kullanıcı/sahip tarafından öğretilenler |
| Groq AI | 3 | Bilinmeyen sorular için |

### Dil Desteği

- **TR/EN** otomatik algılama (kullanıcı diline göre)
- `cevaplar.json`: `cevap` (TR) + `cevap_en` (EN) alanları
- Groq system prompt: Kullanıcı diline göre TR/EN
- Tüm kullanıcı arayüzü: TR/EN desteği

## 🎯 "RiseBunny'ye öğret" Sistemi

### Kullanıcı Tarafından Öğretme

1. Kullanıcı `rise <bilinmeyen soru>` sorar
2. Groq cevap verir + **"🧠 RiseBunny'ye öğret"** butonu
3. Kullanıcı butona basar → `learnCache`'ten alınır
3. Local DB'ye kaydedilir (`kaynak: "groq_learned"`)
4. Matcher cache temizlenir
5. Owner log'a gönderilir (**💾 Kaydet** / **🗑️ Sil** butonları)

### Sahip Tarafından Yönetim

| Buton | İşlem | Yetki |
|-------|-------|-------|
| 💾 **Kaydet** | Onaylı olarak DB'ye kalıcı kaydet | Sadece Sahip |
| 🗑️ **Sil** | İlgili kayıtları DB'den sil | Sadece Sahip |
| 🧠 **Öğret** | Modal ile yeni cevap yazıp kaydet | Sadece Sahip |

### Owner Log Formatı

| Log Türü | Renk | Butonlar | Bilgiler |
|----------|------|----------|----------|
| **Hata** | 🔴 Kırmızı | ✅ Anlaşıldı | Soru, Hata, Sunucu, Kullanıcı, Dil |
| **Öğrenme** | 🟡 Altın | 💾 Kaydet / 🗑️ Sil | Soru, Cevap, Sunucu, Kullanıcı, Eylem |
| **Cevap Yok** | 🟠 Turuncu | 🧠 Öğret | Soru, Sunucu, Kullanıcı |

**Tüm loglarda:** `<@985126554306773063>` etiketi + Sunucu adı+ID + Kullanıcı tag+ID + Zaman damgası

## 🔧 Geliştirici Komutları

| Komut | Açıklama |
|-------|----------|
| `node migrate-ai-data.js` | `cevaplar.json` → croxydb migration |
| `node -e "require('./ai/handler').cacheTemizle()"` | Matcher cache temizle |

## 📁 Dosya Yapısı

```
dc bot/
├── bot.js                    # Ana bot dosyası (AI entegre)
├── AI_SETUP.md              # Bu dosya
├── cevaplar.json            # 22 kategori, 197+ Q&A (TR/EN)
├── migrate-ai-data.js       # Migration script
├── .env                     # Environment variables
├── ai/
│   ├── handler.js           # Ana AI işleyici
│   ├── groq.js              # Groq API client + system prompt
│   ├── matcher.js           # Fuzzy matching (Levenshtein + Jaccard)
│   ├── tokenizer.js         # Türkçe normalize/tokenize/stem
│   └── index.js             # Export
├── events/
│   ├── messageCreate.js     # AI tetikleyici (aiIsle)
│   └── interactionCreate.js # Buton/modal handler'ları
└── utils.js                 # ownerLog (components desteği)
```

## 🔑 Önemli Değişkenler

| Değişken | Değer | Açıklama |
|----------|-------|----------|
| `GROQ_API_KEY` | `gsk_...` | Groq Console'dan alınan API key |
| `OWNER_ID` | `985126554306773063` | Sahip Discord ID |
| `DESTEK_SUNUCU` | `https://discord.gg/mEfz5SfpbR` | Destek sunucusu linki |
| `MODEL` | `openai/gpt-oss-20b` | Groq modeli (ücretsiz, 14.400 req/gün) |

## 🚨 Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| "İşlem sırasında hata oluştu" (Öğren butonu) | `learnCache` süresi dolmuş, tekrar deneyin |
| Groq 404 hatası | Model adı `openai/gpt-oss-20b` olmalı |
| Çift dil cevabı | System prompt'ta "TEK DİL" vurgusu var |
| "rise" tepkisiz | `rise` (boşluksuz) da çalışır artık |
| Owner log gelmiyor | `OWNER_LOG` kanal ID'si doğru mu? |

## 📝 Yeni Soru-Cevap Ekleme

1. `cevaplar.json` dosyasını açın
2. Yeni kategori veya mevcut kategoriye ekleyin:

```json
{
  "kategori": "yeni_kategori",
  "sorular": [
    "soru 1",
    "soru 2 varyasyonu",
    "soru 3 farklı yazım"
  ],
  "cevap": "Türkçe cevap {{user}} için {{time}} zamanında.",
  "cevap_en": "English answer for {{user}} at {{time}}."
}
```

3. Migration çalıştırın: `node migrate-ai-data.js`
4. Cache temizleyin: `require('./ai/handler').cacheTemizle()`

## 📊 Limitler ve Kotalar

| Kaynak | Limit | Not |
|--------|-------|-----|
| Groq GPT-OSS 20B | 14.400 req/gün | Ücretsiz tier |
| Groq dakikalık token | 6.000 |  |
| Karakter limiti | 4000 | Kullanıcı sorusu için |
| Cooldown (spam) | 3 saniye | Kullanıcı başına |
| Cooldown (Groq) | 10 saniye | Kullanıcı başına |
| Learn cache TTL | 10 dakika | Buton süre dolduktan sonra çalışmaz |

## 📞 Destek

- **Destek Sunucusu**: https://discord.gg/mEfz5SfpbR
- **Web Sitesi**: https://risebunny.vercel.app
- **Sahip**: `<@985126554306773063>`

---

*Son güncelleme: 2026 - RiseBunny AI v2.0*