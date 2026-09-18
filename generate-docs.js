const { KOMUTLAR, KATEGORILER } = require('./dil/komutlar');
const { diller } = require('./dil');
const fs = require('fs');

const tr = diller.tr;
const en = diller.en;
const PREFIX = 'r!';

function esc(str) {
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, ''');
}

let html = '';
for (const kat of KATEGORILER) {
  const cmds = Object.entries(KOMUTLAR).filter(([k,v]) => v.kat === kat.id).sort((a,b) => a[0].localeCompare(b[0]));
  if (!cmds.length) continue;
  html += '<details>\n<summary><span class="category-title"><span class="emoji">' + kat.emoji + '</span> <span data-i18n="tr">' + kat.tr + '</span><span data-i18n="en">' + kat.en + '</span> <span class="category-count">(' + cmds.length + ')</span></span></summary>\n';
  html += '<table><tr><th data-i18n="tr">Komut</th><th data-i18n="en">Command</th><th data-i18n="tr">Açıklama</th><th data-i18n="en">Description</th><th data-i18n="tr">Kullanım</th><th data-i18n="en">Usage</th></tr>\n';
  for (const [canonical, info] of cmds) {
    const ti = tr.komutlar[canonical] || { aciklama: '', kullanim: canonical };
    const ei = en.komutlar[canonical] || { aciklama: '', kullanim: info.en };
    const trUse = ti.kullanim ? PREFIX + ti.kullanim : PREFIX + canonical;
    const enUse = ei.kullanim ? PREFIX + ei.kullanim : PREFIX + info.en;
    html += '<tr><td><code>' + esc(canonical) + '</code></td><td><code>' + esc(info.en) + '</code></td><td>' + esc(ti.aciklama || '-') + '</td><td>' + esc(ei.aciklama || '-') + '</td><td><code>' + esc(trUse) + '</code></td><td><code>' + esc(enUse) + '</code></tr>\n';
  }
  html += '</table>\n</details>\n\n';
}

const docsPath = 'C:/Users/enesi/OneDrive/Desktop/risebunny-main/docs.html';
let docs = fs.readFileSync(docsPath, 'utf8');
docs = docs.replace('<div id="command-categories"></div>', html);
fs.writeFileSync(docsPath, docs);
console.log('docs.html updated with', KATEGORILER.length, 'categories');
