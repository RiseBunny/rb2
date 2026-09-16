/**
 * RiseBunny — Bug bildirimi
 *
 * Kullanıcı `r!bug <açıklama>` yazar. Bildirim sahibin DM'ine (ve yedek olarak
 * sahip log kanalına) Kabul Et / Reddet butonlarıyla düşer.
 *   • Kabul  → bildirenin bakiyesine 250.000 💸 eklenir + teşekkür DM'i.
 *   • Reddet → hiçbir şey olmaz (bildirene mesaj gitmez).
 *
 * Kabul/red işleme events/interactionCreate.js içinde yapılır; ödül miktarı ve
 * embed buradan export edilir ki tek kaynak kalsın.
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { SAHIP_ID, ownerLog, PREFIX } = require("../utils");
const { t, getLang } = require("../dil");
const db = require("croxydb");

const BUG_ODUL = 250000;

function yeniId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function bugKaydet(userId, aciklama, kaynak) {
  const kayit = {
    id: yeniId(),
    userId: String(userId),
    aciklama: String(aciklama).slice(0, 1500),
    durum: "bekliyor",
    at: Date.now(),
    kaynak: kaynak || ""
  };
  db.set(`bug_${kayit.id}`, kayit);
  return kayit;
}

/** Sahip logu/DM için embed (durum: bekliyor | kabul | red). */
function bugEmbed(kayit, lang, durum) {
  const EN = lang === "en";
  const baslik =
    durum === "kabul" ? (EN ? "🐞 Bug Report — ACCEPTED" : "🐞 Bug Bildirimi — KABUL EDİLDİ")
      : durum === "red" ? (EN ? "🐞 Bug Report — REJECTED" : "🐞 Bug Bildirimi — REDDEDİLDİ")
        : (EN ? "🐞 New Bug Report" : "🐞 Yeni Bug Bildirimi");
  const satirlar = [
    `**${EN ? "Reporter" : "Bildiren"}:** <@${kayit.userId}> (\`${kayit.userId}\`)`,
    `**${EN ? "Report id" : "Kayıt"}:** \`${kayit.id}\``
  ];
  if (kayit.kaynak) satirlar.push(`**${EN ? "Where" : "Nerede"}:** ${kayit.kaynak}`);
  satirlar.push("", kayit.aciklama);
  if (durum === "bekliyor") {
    satirlar.push(
      "",
      EN
        ? `Accept = **+${BUG_ODUL.toLocaleString()} 💸** for the reporter, reject = nothing happens.`
        : `Kabul = bildirene **+${BUG_ODUL.toLocaleString()} 💸**, red = hiçbir şey olmaz.`
    );
  }
  return new EmbedBuilder()
    .setColor(durum === "kabul" ? "Green" : durum === "red" ? "Red" : "Orange")
    .setTitle(baslik)
    .setDescription(satirlar.join("\n").slice(0, 3900))
    .setFooter({ text: "RiseBunny • bug" })
    .setTimestamp();
}

function bugButonlari(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bug_kabul_${id}`).setLabel("Kabul Et").setStyle(ButtonStyle.Success).setEmoji("✅"),
    new ButtonBuilder().setCustomId(`bug_red_${id}`).setLabel("Reddet").setStyle(ButtonStyle.Danger).setEmoji("✖️")
  );
}

/** Bekleyen bildirimi var mı? (spam engeli) */
function bekleyenBildirim(userId) {
  try {
    const tum = db.all() || {};
    for (const anahtar of Object.keys(tum)) {
      if (!anahtar.startsWith("bug_")) continue;
      const k = tum[anahtar];
      if (k && String(k.userId) === String(userId) && k.durum === "bekliyor") return k;
    }
  } catch {}
  return null;
}

exports.run = async (client, message, args) => {
  const lang = await getLang(message.author.id);
  const EN = lang === "en";
  const aciklama = (args || []).join(" ").trim();

  if (aciklama.length < 15) {
    return message.reply(
      EN
        ? `Please describe the bug in at least 15 characters.\n**Usage:** \`${PREFIX}bug <what happened, how to reproduce>\``
        : `Bug'ı en az 15 karakterle açıkla.\n**Kullanım:** \`${PREFIX}bug <ne oldu, nasıl tekrarlanır>\``
    ).catch(() => {});
  }

  const mevcut = bekleyenBildirim(message.author.id);
  if (mevcut) {
    return message.reply(
      EN
        ? "You already have a pending bug report. Please wait for the owner's decision."
        : "Zaten bekleyen bir bug bildirimin var. Sahibin kararını beklemelisin."
    ).catch(() => {});
  }

  const kaynak = message.guild ? `${message.guild.name} (#${message.channel?.name || "-"})` : (EN ? "Direct message" : "Direkt mesaj");
  const kayit = bugKaydet(message.author.id, aciklama, kaynak);
  const embed = bugEmbed(kayit, "tr", "bekliyor");
  const row = bugButonlari(kayit.id);

  /* 1) Sahibin DM'i (asıl bildirim) */
  let dmGitti = false;
  try {
    const sahip = await client.users.fetch(SAHIP_ID).catch(() => null);
    if (sahip) {
      await sahip.send({ embeds: [embed], components: [row] }).then(() => { dmGitti = true; }).catch(() => {});
    }
  } catch {}

  /* 2) Sahip log kanalı (DM kapalıysa bildirim kaybolmasın) */
  try {
    await ownerLog(client, { embeds: [embed], components: [row] });
  } catch {}

  await ownerLog(client, `🐞 **Yeni bug bildirimi** \`${kayit.id}\` — ${message.author.tag} (\`${message.author.id}\`)${dmGitti ? "" : " *(DM ulaşmadı, log üzerinden)*"}`).catch(() => {});

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("Orange")
        .setTitle(EN ? "🐞 Bug report received" : "🐞 Bug bildirimin alındı")
        .setDescription(
          EN
            ? `Thanks! Your report was sent to the owner.\nIf it is accepted you get **${BUG_ODUL.toLocaleString()} 💸**.\n\n**Report id:** \`${kayit.id}\``
            : `Teşekkürler! Bildirimin sahibe iletildi.\nKabul edilirse **${BUG_ODUL.toLocaleString()} 💸** kazanırsın.\n\n**Kayıt:** \`${kayit.id}\``
        )
        .setTimestamp()
    ]
  }).catch(() => {});
};

exports.BUG_ODUL = BUG_ODUL;
exports.bugEmbed = bugEmbed;
exports.bugButonlari = bugButonlari;
exports.conf = { enabled: true, guildOnly: false, aliases: ["bugbildir", "hatabildir"], permLevel: 0, kategori: "genel" };
exports.help = { name: "bug", description: "Bug bildirir; sahip kabul ederse 250.000 💸 kazanırsın.", usage: "bug <açıklama>" };
