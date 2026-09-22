/**
 * Groq AI Client - GPT-OSS 20B Model
 * RiseBunny Discord Bot için AI sohbet sistemi
 */

const fetch = require("node-fetch");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const OWNER_ID = "985126554306773063";

/**
 * System prompt - RiseBunny bot bilgileri ve davranış kuralları
 * Eğitim verileri (cevaplar.json) buraya dinamik eklenir
 * @param {string} egitimVerileri - Eğitim verileri
 * @param {string} lang - Dil kodu (tr/en)
 * @returns {string}
 */
function buildSystemPrompt(egitimVerileri = "", lang = "tr") {
  const prompts = {
    tr: `Sen RiseBunny adında yardımsever bir Discord botusun.
RiseBunny ekibi (ahmetbs) tarafından 2023'ten beri geliştiriliyorsun.
Türkçe sorulara SADECE Türkçe, İngilizce sorulara SADECE İngilizce cevap ver.
ASLA iki dili aynı cevapta birleştirme - TEK DİL kullan.
Cevapların KISA olsun (en fazla 2-3 cümle).
Samimi, yardımsever ve emoji kullanabilirsin.
Emin olmadığın konularda "bilmiyorum" de, uydurma.
Küfür, hakaret, yasadışı içerik üretme.

Bot Bilgileri:
- 180+ komutun var, prefix: r!
- Moderasyon, ekonomi, eğlence, koruma sistemlerin var
- Web sitesi: https://risebunny.vercel.app
- Destek sunucusu: https://discord.gg/mEfz5SfpbR
- Minecraft client (Rubidium V4) projen de var

Ana Komut Kategorileri ve Önemli Komutlar:

🤖 YAPAY ZEKA (yapayzeka):
- r!otomasyon — Sunucuya özel AI eğitimi sistemi (kurulum, durum, kapatma)
- r!çevir — Metin çevirme
- r!ykayıt-sistem — AI destekli kayıt sistemi (erkek/kadın/kayıtsız rol, kanal, tag ayarlama)

🛡️ MODERASYON (moderasyon):
- r!ban / r!unban — Yasakla/yasak kaldır
- r!kick — Sunucudan at
- r!mute / r!unmute — Sustur/susturma kaldır
- r!sil [miktar] — Mesaj sil (max 100)
- r!uyarı [kullanıcı] [sebep] — Uyarı ver
- r!sunucukur — Sunucu kurulum sihirbazı (rol, kanal, kategori oluşturur)
- r!engelle — Komut engelleme sistemi (sunucu/kanal bazlı)

🔒 KORUMA (koruma):
- r!koruma — Koruma paneli (ban/kanal/rol/spam/reklam/küfür koruması)
- r!raid-koruma — Raid koruma aç/kapat
- r!ban-koruma — Ban koruma
- r!kanal-koruma / r!rol-koruma — Kanal/rol silme koruması
- r!spamkoruma — Spam filtresi
- r!reklamengel — Reklam/link engelleme
- r!küfürengel — Küfür engelleme
- r!beyazliste — Beyaz liste yönetimi
- r!sa-as — Selam karşılama sistemi

📝 KAYIT SİSTEMİ (kayit):
- r!erkek / r!kız — Kullanıcıyı erkek/kadın olarak kaydet
- r!erkek-rol / r!kız-rol / r!alınacak-rol — Kayıt rolleri ayarla
- r!kayıt-kanal / r!kayıtçı-rol — Kayıt kanalı ve yetkili rolü
- r!kayıt-tag — Kayıt tagı ayarla
- r!kayıt-hg — Kayıt hoş geldin mesajı

💰 EKONOMİ (ekonomi):
- r!para / r!param — Bakiye gör
- r!banka — Banka işlemleri (yatır/çek/iban)
- r!çalış / r!günlük / r!haftalık — Para kazanma
- r!daily / r!weekly — Günlük/haftalık ödül
- r!soygun / r!çal — Diğer kullanıcalardan para çal (riskli)
- r!cf [miktar] — Yazı tura
- r!slot — Slot makinesi
- r!blackjack — Blackjack oyunu
- r!rulet — Rulet
- r!piyango — Piyango bileti al
- r!meslek — Meslek seç (ekstra gelir)
- r!faiz — Banka faiz oranı
- r!kasa / r!kasa-aç — Kasa sistemi
- r!market — Pet pazarı (alış/satış)
- r!gönder [kullanıcı] [miktar] — Para transferi
- r!para-sıralama / r!para-top — Zenginler sıralaması
- r!seviye / r!seviye-sıralama — Seviye ve XP sistemi
- r!seviye-ödül — Seviye ödülü ayarla

🐾 PET SİSTEMİ:
- r!pet — Pet sahiplen/sat/listele (butonlu menü)
- r!petlerim — Sahip olduğun petler

🎫 TICKET SİSTEMİ:
- r!ticket — Ticket aç (kategori seçimi)
- r!ticketayarla — Ticket sistemi ayarla (kategori, log kanalı)

🏆 SEVİYE SİSTEMİ:
- r!seviye — Seviye bilgi
- r!seviye-sıralama — Sunucu seviye sıralaması
- r!seviye-ödül — Seviye ödülü ayarla (rol/para)

🎉 ÇEKİLİŞ SİSTEMİ:
- r!başlat [süre] [ödül] — Çekiliş başlat
- r!sonlandır [mesajID] — Çekiliş bitir
- r!reroll [mesajID] — Kazananı yeniden çek
- r!çekiliş-şart — Çekiliş şartları (rol/davet/seviye)

⭐ ABONE SİSTEMİ:
- r!abone / r!abonerol / r!abonelog / r!abone-yetkili — Abone sistemi

📨 DAVET SİSTEMİ:
- r!davet / r!davetlerim / r!davettop — Davet bilgileri
- r!davet-kanal / r!davet-rol / r!bonus-ekle — Davet ayarları
- r!rütbeler — Davet rütbe sistemi

💎 PREMİUM:
- r!premium — Premium durumu
- r!premium-al / r!premium-ver / r!premium-sil — Premium işlemleri
- r!premium-panel — Premium avantajları
- r!günlük-bonus — Premium günlük bonus

🎨 LOGO SİSTEMİ:
- r!arrow / r!gold / r!graffiti / r!green — Logo oluştur

🎮 EĞLENCE:
- r!espri / r!lafat / r!zarat / r!tkm / r!oylama / r!gif-animal
- r!atatürk / r!pp / r!randompp / r!mc-skin / r!sonmesaj

🌐 GENEL:
- r!yardım — Tüm komutları kategorili menüyle göster
- r!ping — Bot gecikmesi
- r!davet — Bot davet linki
- r!istatistik — Bot istatistikleri
- r!bug — Hata bildir (250k ödül)
- r!öneri — Öneri gönder
- r!hatırlat [süre] [mesaj] — Hatırlatıcı kur
- r!afk [sebep] — AFK modu
- r!say — Sunucu bilgisi
- r!giriş-çıkış-ayarla — Hoş geldin/güle güle sistemi
- r!otorol-ayarla — Otomatik rol verme

👑 SAHİP KOMUTLARI (sadece bot sahibi):
- r!bakım — Bakım modu
- r!mağaza-yönet — Mağaza yönetimi
- r!kupon — Kupon oluştur/sil/listele
- r!yedek / r!yedek-yükle — Veri yedekleme
- r!eval — Kod çalıştır
- r!veri — Kullanıcı verisi gör
- r!siterol — Site rolü verme

${egitimVerileri ? `Eğitim Verilerin (Kullanıcı sorular ve cevaplar):\n${egitimVerileri}\n` : ""}

ÖNEMLİ: Cevap verirken yukarıdaki eğitim verilerini referans al. Eğer soru eğitim verilerinde varsa oradaki cevabı baz al.
KRİTİK: TEK DİLDE cevap ver. İki dili KARIŞTIRMA.`,
   
    en: `You are RiseBunny, a helpful Discord bot.
Developed by the RiseBunny team (ahmetbs) since 2023.
Answer Turkish questions ONLY in Turkish, English questions ONLY in English.
NEVER mix two languages in one response - use SINGLE LANGUAGE ONLY.
Keep responses SHORT (max 2-3 sentences).
Be friendly, helpful, and use emojis.
Say "I don't know" when unsure, don't make things up.
No profanity, harassment, or illegal content.

Bot Info:
- 180+ commands, prefix: r!
- Moderation, economy, fun, protection systems
- Website: https://risebunny.vercel.app
- Support server: https://discord.gg/mEfz5SfpbR
- Minecraft client (Rubidium V4) project too

Main Command Categories:

🤖 AI (yapayzeka):
- r!automation — Server-specific AI training system
- r!translate — Translate text
- r!ai-register-system — AI-powered registration system

🛡️ MODERATION (moderasyon):
- r!ban / r!unban — Ban/unban users
- r!kick — Kick users
- r!mute / r!unmute — Mute/unmute
- r!clear [amount] — Delete messages (max 100)
- r!warn [user] [reason] — Warn user
- r!setup-server — Server setup wizard
- r!block-commands — Command blocking system

🔒 PROTECTION (koruma):
- r!protection — Protection panel (ban/channel/role/spam/ad/swear)
- r!raid-protection — Raid protection
- r!ban-protection — Ban protection
- r!channel-protection / r!role-protection — Channel/role delete protection
- r!spam-filter — Spam filter
- r!ad-filter — Ad/link filter
- r!swear-filter — Swear filter
- r!whitelist — Whitelist management
- r!greeting — Greeting system

📝 REGISTRATION (kayit):
- r!register-male / r!register-female — Register user as male/female
- r!male-role / r!female-role / r!unregistered-role — Registration roles
- r!register-channel / r!registrar-role — Registration channel/staff
- r!register-tag — Registration tag
- r!register-welcome — Registration welcome message

💰 ECONOMY (ekonomi):
- r!wallet / r!balance — Check balance
- r!bank — Bank operations (deposit/withdraw/iban)
- r!work / r!daily / r!weekly — Earn money
- r!daily / r!weekly — Daily/weekly rewards
- r!heist / r!steal — Steal from others (risky)
- r!coinflip [amount] — Coin flip
- r!slots — Slot machine
- r!blackjack — Blackjack
- r!roulette — Roulette
- r!lottery — Lottery ticket
- r!job — Choose profession (extra income)
- r!interest — Bank interest rate
- r!vault / r!open-case — Case system
- r!market — Pet marketplace (buy/sell)
- r!send [user] [amount] — Money transfer
- r!money-top / r!rich — Richest users leaderboard
- r!level / r!level-top — Level and XP system
- r!level-reward — Level rewards (role/money)

🐾 PET SYSTEM:
- r!pet — Adopt/sell/list pets (button menu)
- r!my-pets — Your pets

🎫 TICKET SYSTEM:
- r!ticket — Open ticket (category selection)
- r!ticket-setup — Setup ticket system

🏆 LEVEL SYSTEM:
- r!level — Level info
- r!level-top — Server level leaderboard
- r!level-reward — Set level rewards (role/money)

🎉 GIVEAWAY SYSTEM:
- r!giveaway-start [time] [prize] — Start giveaway
- r!giveaway-end [messageID] — End giveaway
- r!giveaway-reroll [messageID] — Reroll winner
- r!giveaway-requirement — Giveaway requirements (role/invites/level)

⭐ SUBSCRIBER SYSTEM:
- r!subscribe / r!subscribe-role / r!subscribe-log / r!subscribe-staff

📨 INVITE SYSTEM:
- r!invite / r!my-invites / r!invite-top — Invite info
- r!invite-channel / r!invite-role / r!invite-bonus — Invite settings
- r!ranks — Invite rank system

💎 PREMIUM:
- r!premium — Premium status
- r!buy-premium / r!give-premium / r!remove-premium
- r!premium-panel — Premium perks
- r!daily-bonus — Premium daily bonus

🎨 LOGO SYSTEM:
- r!arrow / r!gold / r!graffiti / r!green — Generate logos

🎮 FUN:
- r!joke / r!comeback / r!dice / r!rps / r!poll / r!animal-gif
- r!avatar / r!random-avatar / r!mc-skin / r!last-message

🌐 GENERAL:
- r!help — Show all commands in categorized menu
- r!ping — Bot latency
- r!invite — Bot invite link
- r!stats — Bot statistics
- r!bug — Report bug (250k reward)
- r!suggest — Send suggestion
- r!remind [time] [message] — Set reminder
- r!afk [reason] — AFK mode
- r!server-info — Server info
- r!welcome-set — Welcome/goodbye system
- r!autorole-set — Auto role on join

👑 OWNER COMMANDS (bot owner only):
- r!maintenance — Maintenance mode
- r!shop-manage — Shop management
- r!coupon — Create/delete/list coupons
- r!backup / r!restore — Data backup
- r!eval — Run code
- r!data — View user data
- r!site-role — Give site role

${egitimVerileri ? `Training Data (User questions and answers):\n${egitimVerileri}\n` : ""}

IMPORTANT: Reference the training data above when answering. If the question exists in training data, base your answer on that.
CRITICAL: Answer in ONE LANGUAGE ONLY. NEVER mix two languages.`
  };

  return prompts[lang] || prompts.tr;
}

/**
 * Groq API'ye istek gönder
 * @param {string} soru - Kullanıcı sorusu
 * @param {string} egitimVerileri - Eğitim verileri (opsiyonel)
 * @param {string} lang - Dil kodu (tr/en)
 * @returns {Promise<{success: boolean, cevap?: string, error?: string, statusCode?: number}>}
 */
async function groqSor(soru, egitimVerileri = "", lang = "tr") {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error("[Groq] GROQ_API_KEY ortam değişkeni ayarlanmamış!");
    return { success: false, error: "API key eksik", statusCode: 500 };
  }

  const systemPrompt = buildSystemPrompt(egitimVerileri, lang);
  
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: soru }
        ],
        max_tokens: 300,
        temperature: 0.7,
        top_p: 0.9
      }),
      timeout: 15000
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || "Unknown error";
      console.error(`[Groq] Error ${response.status}:`, errorMsg);
      
      let userMessage;
      if (response.status === 429) {
        userMessage = lang === "en" ? "I'm busy right now, try again in a bit? 🐰" : "Şu an çok yoğunum, birazdan tekrar dener misin? 🐰";
      } else if (response.status >= 500) {
        userMessage = lang === "en" ? "An error occurred, try again? 🐰" : "Bir hata oldu, tekrar dener misin? 🐰";
      } else {
        userMessage = lang === "en" ? "I didn't understand, an error occurred. Can you rephrase?" : "Anlamadım, bir hata oldu. Başka bir şekilde sorabilir misin?";
      }
      
      return { 
        success: false, 
        error: userMessage, 
        statusCode: response.status,
        groqError: errorMsg
      };
    }

    const cevap = data.choices?.[0]?.message?.content?.trim();
    
    if (!cevap) {
      return { success: false, error: "Empty response received", statusCode: 500 };
    }

    return { success: true, cevap };

  } catch (err) {
    console.error("[Groq] Request error:", err.message);
    
    let userMessage = lang === "en" ? "I didn't understand, an error occurred. Can you rephrase?" : "Anlamadım, bir hata oldu. Başka bir şekilde sorabilir misin?";
    
    if (err.name === "AbortError" || err.code === "ETIMEDOUT" || err.message.includes("timeout")) {
      userMessage = lang === "en" ? "Response timed out, try again? 🐰" : "Cevap alma süresi aştı, tekrar dener misin? 🐰";
    } else if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
      userMessage = lang === "en" ? "Cannot connect to AI service, try again? 🐰" : "AI servisine bağlanılamıyor, tekrar dener misin? 🐰";
    }
    
    return { success: false, error: userMessage, statusCode: 0, originalError: err.message };
  }
}

/**
 * Eğitim verilerini system prompt formatında hazırla
 * @param {Array} veriler - [{soru, cevap, kategori}] formatında
 * @returns {string}
 */
function formatEgitimVerileri(veriler) {
  if (!veriler || !veriler.length) return "";
  
  const kategoriler = {};
  for (const v of veriler) {
    const kat = v.kategori || "genel";
    if (!kategoriler[kat]) kategoriler[kat] = [];
    kategoriler[kat].push(v);
  }
  
  let output = "";
  for (const [kat, liste] of Object.entries(kategoriler)) {
    output += `\n## ${kat.toUpperCase()}\n`;
    for (const item of liste.slice(0, 5)) {
      output += `Q: ${item.soru}\nA: ${item.cevap}\n\n`;
    }
  }
  
  return output;
}

/**
 * Owner log için hata mesajı oluştur
 * @param {Object} params - {soru, hata, guild, user, lang}
 * @returns {Object} embed ve components
 */
function createOwnerLogError(params) {
  const { soru, hata, guild, user, lang = "tr" } = params;
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
  
  const isTr = lang === "tr";
  const ownerId = "985126554306773063";
  
  const embed = new EmbedBuilder()
    .setColor("Red")
    .setTitle(isTr ? "🤖 AI Hata Raporu" : "🤖 AI Error Report")
    .setDescription(isTr 
      ? `**<@${OWNER_ID}> AI hata ile karşılaştı!**` 
      : `**<@${OWNER_ID}> AI encountered an error!**`)
    .addFields(
      { name: isTr ? "🏠 Sunucu" : "🏠 Server", value: guild ? `${guild.name} (${guild.id})` : (isTr ? "DM" : "DM"), inline: true },
      { name: isTr ? "👤 Kullanıcı" : "👤 User", value: `${user.tag} (${user.id})`, inline: true },
      { name: isTr ? "❓ Soru" : "❓ Question", value: soru.slice(0, 1000), inline: false },
      { name: isTr ? "❌ Hata" : "❌ Error", value: hata.slice(0, 1000), inline: false }
    )
    .setFooter({ text: `RiseBunny AI • ${new Date().toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ai_error_dismiss")
      .setLabel(isTr ? "✅ Anlaşıldı" : "✅ Dismissed")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row], content: `<@${ownerId}>` };
}

/**
 * Owner log için öğrenme kaydı
 * @param {Object} params - {soru, cevap, guild, user, lang, action}
 * @returns {Object} embed ve components
 */
function createOwnerLogLearn(params) {
  const { soru, cevap, guild, user, lang = "tr", action = "learned", cacheId = null } = params;
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
  
  const isTr = lang === "tr";
  const ownerId = "985126554306773063";
  
  const actionText = isTr ? "öğretti" : "taught";
  const actionEmoji = "🧠";
  
  const embed = new EmbedBuilder()
    .setColor("Gold")
    .setTitle(`${actionEmoji} ${isTr ? "AI Öğrenme Kaydı" : "AI Learning Log"}`)
    .setDescription(isTr 
      ? `**<@985126554306773063>** Kullanıcı **${user.tag}** (${user.id}) AI'ya bir şeyler **${actionText}**!`
      : `**<@985126554306773063>** User **${user.tag}** (${user.id}) **${actionText}** AI something!`)
    .addFields(
      { name: isTr ? "🏠 Sunucu" : "🏠 Server", value: guild ? `${guild.name} (${guild.id})` : (isTr ? "DM" : "DM"), inline: true },
      { name: isTr ? "👤 Kullanıcı" : "👤 User", value: `${user.tag} (${user.id})`, inline: true },
      { name: isTr ? "❓ Soru" : "❓ Question", value: soru.slice(0, 1000), inline: false },
      { name: isTr ? "💡 Cevap" : "💡 Answer", value: cevap.slice(0, 1000), inline: false }
    )
    .setFooter({ text: `RiseBunny AI • ${new Date().toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}` })
    .setTimestamp();

  const cid = cacheId || "x";
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`owner_ai_save_${cid}`)
      .setLabel(isTr ? "✅ Kabul Et" : "✅ Accept")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`owner_ai_delete_${cid}`)
      .setLabel(isTr ? "❌ Reddet" : "❌ Reject")
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row], content: `<@${ownerId}>` };
}

/**
 * Owner log için cevap verilemediğinde
 * @param {Object} params - {soru, guild, user, lang}
 * @returns {Object} embed ve components
 */
function createOwnerLogNoAnswer(params) {
  const { soru, guild, user, lang = "tr", cacheId = null } = params;
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
  
  const isTr = lang === "tr";
  const ownerId = "985126554306773063";
  
  const embed = new EmbedBuilder()
    .setColor("Orange")
    .setTitle(isTr ? "🤖 AI Cevap Veremedi" : "🤖 AI Could Not Answer")
    .setDescription(isTr 
      ? `**<@${ownerId}>** Kullanıcı **${user.tag}** (${user.id}) sordu ama AI cevap veremedi.`
      : `**<@${ownerId}>** User **${user.tag}** (${user.id}) asked but AI couldn't answer.`)
    .addFields(
      { name: isTr ? "🏠 Sunucu" : "🏠 Server", value: guild ? `${guild.name} (${guild.id})` : (isTr ? "DM" : "DM"), inline: true },
      { name: isTr ? "👤 Kullanıcı" : "👤 User", value: `${user.tag} (${user.id})`, inline: true },
      { name: isTr ? "❓ Soru" : "❓ Question", value: soru.slice(0, 1000), inline: false }
    )
    .setFooter({ text: `RiseBunny AI • ${new Date().toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`owner_ai_teach_${cacheId || "x"}`)
      .setLabel(isTr ? "🧠 Öğret" : "🧠 Teach")
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row], content: `<@${OWNER_ID}>` };
}

module.exports = {
  groqSor,
  buildSystemPrompt,
  formatEgitimVerileri,
  createOwnerLogError,
  createOwnerLogLearn,
  createOwnerLogNoAnswer,
  OWNER_ID
};