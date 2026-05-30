// Audit which A1.1 word images are missing in Supabase.
//
// Pulls every German word from vocab-a11-data.ts, then bulk-queries the
// vocab_images table to find which ones already have an image_base64
// (i.e. were uploaded by a previous Cowork run). Outputs:
//   - The full missing list (printed and saved to scripts/a11-missing-words.json)
//   - A summary by Lektion
//
// Run:  node scripts/audit-a11-images.mjs

import { readFileSync, writeFileSync } from 'fs';

const SUPABASE_URL = 'https://qpzepnbqdscshylcwvhr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jHgz4-egQIk9dYaV7HhR5w_MK3AYdC0';

function loadA11Words() {
  const src = readFileSync('src/vocab-a11-data.ts', 'utf-8');
  const wordsStart = src.indexOf('words: [');
  const wordsEnd = src.indexOf('],\n  // Batches');
  const wordsBlock = src.substring(wordsStart, wordsEnd);
  const words = [];
  for (const line of wordsBlock.split('\n')) {
    const m = line.match(/^\s*\["((?:[^"\\]|\\.)*)","((?:[^"\\]|\\.)*)",(\d+),(\d+)\]/);
    if (m) words.push({
      german: m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
      english: m[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
      catIdx: parseInt(m[3]),
      typeIdx: parseInt(m[4]),
    });
  }
  return words;
}

// Bulk lookup: query vocab_images for all keys in chunks, return set of keys present.
async function fetchExistingKeys(allKeys) {
  const present = new Set();
  const CHUNK = 50; // keep URL length under 2k
  for (let i = 0; i < allKeys.length; i += CHUNK) {
    const slice = allKeys.slice(i, i + CHUNK);
    // PostgREST in.() filter — values quoted and comma-separated
    const inFilter = slice.map(k => '"' + k.replace(/"/g, '\\"') + '"').join(',');
    const url = `${SUPABASE_URL}/rest/v1/vocab_images?word=in.(${encodeURIComponent(inFilter)})&select=word,image_base64`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
    });
    if (!res.ok) {
      console.error('Lookup failed at chunk', i, '-', res.status, await res.text());
      continue;
    }
    const rows = await res.json();
    for (const row of rows) {
      if (row.image_base64) present.add(row.word);
    }
    process.stdout.write('.');
  }
  console.log('');
  return present;
}

const CATS = [
  'Anweisungen im Kurs',
  'Lektion 1: Guten Tag',
  'Lektion 2: Meine Familie',
  'Lektion 3: Einkaufen',
  'Lektion 4: Meine Wohnung',
  'Lektion 5: Mein Tag',
  'Lektion 6: Freizeit',
  'Lektion 7: Kinder und Schule',
];

const words = loadA11Words();
console.log('Loaded ' + words.length + ' A1.1 words');

const keys = words.map(w => w.german.toLowerCase().trim());
console.log('Querying Supabase for existing images...');
const present = await fetchExistingKeys(keys);
console.log('Found ' + present.size + ' words with images.');

const missing = words.filter(w => !present.has(w.german.toLowerCase().trim()));
console.log('Missing: ' + missing.length + ' words.');
console.log('');
console.log('Missing by Lektion:');
const byCat = {};
for (const w of missing) {
  if (!byCat[w.catIdx]) byCat[w.catIdx] = [];
  byCat[w.catIdx].push(w);
}
Object.keys(byCat).sort((a, b) => +a - +b).forEach(ci => {
  console.log('  ' + CATS[ci] + ': ' + byCat[ci].length);
});

const outPath = 'scripts/a11-missing-words.json';
writeFileSync(outPath, JSON.stringify(missing, null, 2));
console.log('');
console.log('Wrote full missing list to ' + outPath);
