const db = require('croxydb');
const { getLangSync } = require("../dil");
const U = require("../utils");

exports.run = async (client, message) => {
  const lang = getLangSync(message.author.id);
  const EN = lang === "en";
  if (message.author.id !== U.SAHIP_ID)
    return message.channel.send({ content: EN ? " Only **my owner** can restore backups." : " Yedeği sadece **sahibim** yükleyebilir." });

  const ek = message.attachments.first();
  const sonArg = (message.content || "").trim().split(/\s+/).slice(1).join(" ").toLowerCase();
  // Dosyasız kullanım: kayıtlı son snapshot'tan geri yükle
  if (!ek && (sonArg === "son" || sonArg === "last")) {
    const snap = db.fetch(`yedek_veri_${message.author.id}`);
    if (!snap || !snap.data) return message.channel.send(EN ? "No saved snapshot." : "Kayıtlı snapshot yok.");
    let n = 0;
    for (const [k, v] of Object.entries(snap.data)) {
      if (typeof k !== "string" || !k || k.startsWith("yedek_veri_")) continue;
      try { db.set(k, v); n++; } catch {}
    }
    U.ownerLog(client, `💾 **Snapshot geri yüklendi:** ${n} kayıt (${message.author.tag})`).catch(() => {});
    return message.channel.send(EN ? `✅ Snapshot restored: **${n}** keys.` : `✅ Snapshot geri yüklendi: **${n}** kayıt.`);
  }
  if (!ek) return message.channel.send(EN
    ? "Attach the backup `.json` file with this command: `r!yedek-yükle` + file (or `r!yedek-yükle son` for saved snapshot)."
    : "Yedek `.json` dosyasını bu komutla birlikte ekle: `r!yedek-yükle` + dosya (veya kayıtlı snapshot için `r!yedek-yükle son`).");

  try {
    const r = await fetch(ek.url);
    if (!r.ok) throw new Error("dosya indirilemedi");
    const j = await r.json();

    // v2 tam-yedek formatı: { __risebunny: {...}, data: {...} } — yoksa eski düz format
    const veri = (j && j.data && typeof j.data === "object" && !Array.isArray(j.data) && j.__risebunny) ? j.data : j;
    if (!veri || typeof veri !== "object" || Array.isArray(veri)) throw new Error("geçersiz yedek formatı");

    let n = 0, atlandi = 0;
    for (const [k, v] of Object.entries(veri)) {
      if (typeof k !== "string" || !k) { atlandi++; continue; }
      try { db.set(k, v); n++; } catch { atlandi++; }
    }
    U.ownerLog(client, `💾 **Tam yedek geri yüklendi:** ${n} kayıt (${message.author.tag})${atlandi ? `, ${atlandi} atlandı` : ""}`).catch(() => {});
    return message.channel.send(EN
      ? `✅ Backup restored: **${n}** keys${atlandi ? `, ${atlandi} skipped` : ""}.`
      : `✅ Yedek geri yüklendi: **${n}** kayıt${atlandi ? `, ${atlandi} atlandı` : ""}.`);
  } catch (e) {
    return message.channel.send((EN ? "Restore failed: " : "Yükleme başarısız: ") + e.message);
  }
};

exports.conf = { enabled: true, guildOnly: false, aliases: ["yedek-yukle", "yedekgeri-yukle", "restore"], permLevel: 4, kategori: "sahip" };
exports.help = { name: "yedek-yükle", description: "Tam yedek dosyasını croxydb'ye geri yükler (sahip).", usage: "yedek-yükle + dosya eki" };
