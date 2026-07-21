// One-off coverage audit across all 3 courses + both image types.
// Compares each course's word list against image keys present in
// Supabase (word images keyed by bare lowercase word; German def images
// keyed by "def {word}").
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://qpzepnbqdscshylcwvhr.supabase.co';
const KEY = 'sb_publishable_jHgz4-egQIk9dYaV7HhR5w_MK3AYdC0';

function loadWords(file, marker) {
  const s = readFileSync(file, 'utf-8');
  const start = s.indexOf(marker);
  const body = s.slice(start + marker.length, s.indexOf('\n];', start));
  const out = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*\[\s*"((?:[^"\\]|\\.)*)"/);
    if (m) out.push(m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\').toLowerCase().trim());
  }
  return [...new Set(out)];
}

async function allKeys() {
  const set = new Set();
  let from = 0; const size = 1000;
  for (;;) {
    const url = `${SUPABASE_URL}/rest/v1/vocab_images?select=word&image_base64=not.is.null&limit=${size}&offset=${from}`;
    const res = await fetch(url, { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) set.add(r.word);
    from += rows.length;
    if (rows.length < size) break;
  }
  return set;
}

const present = await allKeys();
console.log('Tong anh co tren kho:', present.size);

const courses = [
  ['German 1500', 'src/vocab-data.ts', 'words: [', true],
  ['Schritte A1', 'src/vocab-a11-data.ts', 'words: [', false],
  ['English', 'src/english-vocab-data.ts', 'ENGLISH_VOCAB_DATA = [', false],
];

for (const [name, file, marker, hasDef] of courses) {
  let words;
  try { words = loadWords(file, marker); }
  catch (e) { console.log(name, '- loi doc:', e.message); continue; }
  const missWord = words.filter(w => !present.has(w));
  console.log(`\n=== ${name} (${words.length} tu) ===`);
  console.log(`  Anh thuong: ${words.length - missWord.length}/${words.length} co, THIEU ${missWord.length}`);
  if (hasDef) {
    const missDef = words.filter(w => !present.has('def ' + w));
    console.log(`  Anh def   : ${words.length - missDef.length}/${words.length} co, THIEU ${missDef.length}`);
  }
}
