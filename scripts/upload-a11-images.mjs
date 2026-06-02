// Upload A1.1 word images to Supabase.
//
// Mirrors upload-english-images.mjs but:
//   1. Source folder: a11-images/ (Cowork writes here)
//   2. Word lookup: VOCAB_A11_DATA.words[idx][0] (the filename IS the
//      global A1.1 index, so no per-batch math)
//   3. Upload key: bare lowercase German word — same key namespace as
//      the main German images, so A1.1 and main share the image pool.
//
// Run dry first:
//   node scripts/upload-a11-images.mjs --dry
// Then real:
//   node scripts/upload-a11-images.mjs

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://qpzepnbqdscshylcwvhr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jHgz4-egQIk9dYaV7HhR5w_MK3AYdC0';
const UPLOAD_ENDPOINT = SUPABASE_URL + '/functions/v1/upload-image';
const IMAGE_ROOT = 'C:/Users/ASUS/Documents/Claude/Projects/Image Gen/a11-images';
const DELAY_MS = 4000; // 15/min, well under the 20/min cap
const DRY_RUN = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force'); // skip the "already uploaded" check
const ONLY_BATCH_ARG = process.argv.find(a => a.startsWith('--only-batch='));
const ONLY_BATCH = ONLY_BATCH_ARG ? parseInt(ONLY_BATCH_ARG.split('=')[1]) : null;

// Query vocab_images for which lowercase German keys already have an image.
// Returns a Set of present keys. Empty set on failure (caller falls back to
// uploading everything — same as old behavior).
async function fetchExistingKeys(allKeys) {
  const present = new Set();
  const CHUNK = 50;
  for (let i = 0; i < allKeys.length; i += CHUNK) {
    const slice = allKeys.slice(i, i + CHUNK);
    const inFilter = slice.map(k => '"' + k.replace(/"/g, '\\"') + '"').join(',');
    const url = `${SUPABASE_URL}/rest/v1/vocab_images?word=in.(${encodeURIComponent(inFilter)})&select=word,image_base64`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
    });
    if (!res.ok) continue;
    const rows = await res.json().catch(() => []);
    for (const row of rows) if (row.image_base64) present.add(row.word);
  }
  return present;
}

function loadA11Words() {
  const src = readFileSync('src/vocab-a11-data.ts', 'utf-8');
  const wordsStart = src.indexOf('words: [');
  const wordsEnd = src.indexOf('],\n  // Batches');
  const wordsBlock = src.substring(wordsStart, wordsEnd);
  const words = [];
  for (const line of wordsBlock.split('\n')) {
    const m = line.match(/^\s*\["((?:[^"\\]|\\.)*)"/);
    if (m) words.push(m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
  }
  return words;
}

async function uploadOne({ idx, word, filePath }) {
  const base64 = readFileSync(filePath).toString('base64');
  const uploadKey = word.toLowerCase().trim();
  if (DRY_RUN) return { ok: true, dry: true, uploadKey };
  const res = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word: uploadKey, image: base64 }),
  });
  if (res.status === 429) return { ok: false, rateLimited: true, status: 429 };
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: text };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: true, uploadKey, url: data.url };
}

async function main() {
  if (!existsSync(IMAGE_ROOT)) {
    console.error('Image root does not exist: ' + IMAGE_ROOT);
    console.error('Has Cowork generated any images yet?');
    process.exit(1);
  }

  const words = loadA11Words();
  console.log('Loaded ' + words.length + ' A1.1 words');
  console.log(DRY_RUN ? '\n*** DRY RUN ***\n' : '\n*** LIVE RUN ***\n');

  const allEntries = readdirSync(IMAGE_ROOT, { withFileTypes: true });
  const batchDirs = allEntries
    .filter(e => e.isDirectory() && /^batch-\d+$/.test(e.name))
    .map(e => ({ name: e.name, num: parseInt(e.name.replace('batch-', '')) }))
    .sort((a, b) => a.num - b.num);

  const plan = [];
  for (const bd of batchDirs) {
    if (ONLY_BATCH !== null && bd.num !== ONLY_BATCH) continue;
    const dir = join(IMAGE_ROOT, bd.name);
    const files = readdirSync(dir).filter(f => /^\d+\.png$/.test(f))
      .sort((a, b) => parseInt(a) - parseInt(b));
    for (const file of files) {
      const idx = parseInt(file.replace('.png', ''));
      const word = words[idx];
      if (!word) {
        console.log(bd.name + '/' + file + ': NO WORD AT INDEX ' + idx + ' — skipping');
        continue;
      }
      plan.push({ batch: bd.num, idx, word, filePath: join(dir, file) });
    }
  }

  console.log('Discovered ' + plan.length + ' image files across ' + batchDirs.length + ' batch folders');

  // Skip already-uploaded keys unless --force was passed. Bulk-queries
  // vocab_images table for which keys already have an image.
  let skipped = 0;
  if (!FORCE && plan.length > 0) {
    process.stdout.write('Checking Supabase for already-uploaded images... ');
    const allKeys = [...new Set(plan.map(p => p.word.toLowerCase().trim()))];
    const present = await fetchExistingKeys(allKeys);
    console.log(present.size + ' of ' + allKeys.length + ' keys already have images.');
    const before = plan.length;
    for (let i = plan.length - 1; i >= 0; i--) {
      if (present.has(plan[i].word.toLowerCase().trim())) plan.splice(i, 1);
    }
    skipped = before - plan.length;
  }

  console.log('Planned ' + plan.length + ' uploads (' + skipped + ' skipped as already uploaded)');
  if (plan.length === 0) {
    console.log('Nothing to upload.');
    return;
  }
  console.log('First 5 mappings:');
  for (const p of plan.slice(0, 5)) {
    console.log('  batch-' + p.batch + '/' + p.idx + '.png → "' + p.word.toLowerCase() + '"');
  }
  console.log('Last 3 mappings:');
  for (const p of plan.slice(-3)) {
    console.log('  batch-' + p.batch + '/' + p.idx + '.png → "' + p.word.toLowerCase() + '"');
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Re-run without --dry to upload.');
    return;
  }

  let ok = 0, failed = 0, rateLimitHits = 0;
  const failures = [];
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    process.stdout.write('[' + (i + 1) + '/' + plan.length + '] batch-' + p.batch + '/' + p.idx + '.png → ' + p.word.toLowerCase() + ' ... ');
    let result = await uploadOne(p);
    if (result.rateLimited) {
      rateLimitHits++;
      process.stdout.write('429, waiting 65s and retrying... ');
      await new Promise(r => setTimeout(r, 65000));
      result = await uploadOne(p);
    }
    if (result.ok) { ok++; console.log('OK'); }
    else {
      failed++;
      failures.push({ ...p, error: result.error || ('status ' + result.status) });
      console.log('FAIL (' + (result.status || 'unknown') + ') ' + (result.error || ''));
    }
    if (i < plan.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log('\n=== Done ===');
  console.log('Uploaded: ' + ok + ' / ' + plan.length);
  console.log('Failed: ' + failed);
  console.log('Rate-limit hits (auto-retried): ' + rateLimitHits);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log('  batch-' + f.batch + '/' + f.idx + '.png ("' + f.word.toLowerCase() + '"): ' + f.error);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
