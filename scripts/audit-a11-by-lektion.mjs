// Break down A1 words missing a word-image, grouped by Lektion.
import { readFileSync } from 'fs';
const SUPABASE_URL = 'https://qpzepnbqdscshylcwvhr.supabase.co';
const KEY = 'sb_publishable_jHgz4-egQIk9dYaV7HhR5w_MK3AYdC0';

async function allKeys() {
  const set = new Set(); let from = 0; const size = 1000;
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vocab_images?select=word&image_base64=not.is.null&limit=${size}&offset=${from}`, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) break;
    for (const r of rows) set.add(r.word);
    from += rows.length; if (rows.length < size) break;
  }
  return set;
}

const present = await allKeys();
const s = readFileSync('src/vocab-a11-data.ts', 'utf-8');
const catBlock = s.match(/cats:\s*\[([^\]]*)\]/s)[1];
const cats = [...catBlock.matchAll(/"([^"]*)"/g)].map(m => m[1]);
const body = s.slice(s.indexOf('words: [') + 7, s.indexOf('\n];', s.indexOf('words: [')));
const byCat = {};
for (const line of body.split('\n')) {
  const m = line.match(/^\s*\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"(?:[^"\\]|\\.)*"\s*,\s*(\d+)/);
  if (!m) continue;
  const word = m[1].toLowerCase().trim();
  const cat = Number(m[2]);
  if (!present.has(word)) byCat[cat] = (byCat[cat] || 0) + 1;
}
console.log('Tu A1 thieu anh theo Lektion:');
Object.keys(byCat).sort((a, b) => a - b).forEach(c => console.log(`  ${cats[c] || ('cat ' + c)}: ${byCat[c]}`));
console.log('Tong:', Object.values(byCat).reduce((a, b) => a + b, 0));
