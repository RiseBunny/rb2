/**
 * AI Veri Taşıma Scripti
 * cevaplar.json'dan croxydb'ye veri aktarır
 */
const fs = require("fs");
const path = require("path");
const croxydb = require("croxydb");

const jsonPath = path.join(__dirname, "cevaplar.json");

console.log("🔄 AI veri taşıma başlıyor...");

try {
  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);
  
  let count = 0;
  
  for (const kayit of data.cevaplar) {
    const kategori = kayit.kategori || "genel";
    
    for (const soru of kayit.sorular) {
      const id = `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      croxydb.set(`ai_qa_${id}`, {
        soru: soru,
        cevap: kayit.cevap,
        kategori: kategori,
        kaynak: "manual",
        ekleyen: "system_migration",
        kullanim: 0,
        faydali: 0,
        created_at: Date.now()
      });
      count++;
    }
  }
  
  console.log(`✅ ${count} soru-cevap çifti croxydb'ye aktarıldı!`);
  
} catch (err) {
  console.error("❌ Hata:", err.message);
}