// Upload English IELTS Speaking phrase images to Supabase Storage.
//
// Walks every batch folder under IMAGE_ROOT, maps each filename
// "{idx}.png" to ENGLISH_VOCAB_DATA[idx] (the filename IS the global
// index — unlike the German batches where idx is per-batch), and POSTs
// to the public upload-image edge function with key = phrase.toLowerCase().
//
// Different from upload-def-images.mjs in three ways:
//   1. Source folder: english-images/ (not german-defimages/)
//   2. Word lookup: ENGLISH_VOCAB_DATA[idx] directly (no batch math)
//   3. Upload key: bare phrase (no "def " prefix)
//
// Run dry-first to preview what would happen:
//   node scripts/upload-english-images.mjs --dry
// Then for real:
//   node scripts/upload-english-images.mjs

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://qpzepnbqdscshylcwvhr.supabase.co';
const UPLOAD_ENDPOINT = SUPABASE_URL + '/functions/v1/upload-image';
const IMAGE_ROOT = 'C:/Users/ASUS/Documents/Claude/Projects/Image Gen/english-images';
const DELAY_MS = 4000; // 4s between uploads → 15/min, well under the 20/min cap
const DRY_RUN = process.argv.includes('--dry');
// --only-batch=N runs uploads for just batch-N (useful for smoke-testing
// a new workflow before committing to a full 200+ upload run).
const ONLY_BATCH_ARG = process.argv.find(a => a.startsWith('--only-batch='));
const ONLY_BATCH = ONLY_BATCH_ARG ? parseInt(ONLY_BATCH_ARG.split('=')[1]) : null;

// Parse ENGLISH_VOCAB_DATA from english-vocab-data.ts without a TS toolchain.
// The array is a stable list of [phrase, definition, catIdx, typeIdx] tuples.
function loadPhrases() {
  const src = readFileSync('src/english-vocab-data.ts', 'utf-8');
  const startMarker = 'ENGLISH_VOCAB_DATA = [';
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error('Could not find ENGLISH_VOCAB_DATA array');
  const sliceStart = start + startMarker.length;
  // Find the closing ]; that ends the array literal.
  const closeIdx = src.indexOf('\n];', sliceStart);
  if (closeIdx < 0) throw new Error('Could not find end of ENGLISH_VOCAB_DATA');
  const arrayBody = src.substring(sliceStart, closeIdx);

  // Each line: ["phrase","definition",catIdx,typeIdx],
  const lines = arrayBody.split('\n');
  const phrases = [];
  for (const line of lines) {
    const m = line.match(/^\s*\[\s*"((?:[^"\\]|\\.)*)"/);
    if (m) phrases.push(m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
  }
  return phrases;
}

async function uploadOne({ idx, phrase, filePath }) {
  const base64 = readFileSync(filePath).toString('base64');
  const uploadKey = phrase.toLowerCase();
  if (DRY_RUN) {
    return { ok: true, dry: true, uploadKey };
  }
  const res = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word: uploadKey, image: base64 }),
  });
  if (res.status === 429) {
    return { ok: false, rateLimited: true, status: 429 };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: text };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: true, uploadKey, url: data.url };
}

async function main() {
  const phrases = loadPhrases();
  console.log('Loaded ' + phrases.length + ' phrases from english-vocab-data.ts');
  console.log(DRY_RUN ? '\n*** DRY RUN — no uploads will happen ***\n' : '\n*** LIVE RUN ***\n');

  // Discover all batch folders dynamically
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
      const phrase = phrases[idx];
      if (!phrase) {
        console.log(bd.name + '/' + file + ': NO PHRASE AT INDEX ' + idx + ' — skipping');
        continue;
      }
      plan.push({ batch: bd.num, idx, phrase, filePath: join(dir, file) });
    }
  }

  console.log('Planned ' + plan.length + ' uploads across ' + batchDirs.length + ' batches');
  console.log('First 5 mappings:');
  for (const p of plan.slice(0, 5)) {
    console.log('  batch-' + p.batch + '/' + p.idx + '.png → "' + p.phrase.toLowerCase() + '"');
  }
  console.log('Last 3 mappings:');
  for (const p of plan.slice(-3)) {
    console.log('  batch-' + p.batch + '/' + p.idx + '.png → "' + p.phrase.toLowerCase() + '"');
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Re-run without --dry to upload for real.');
    return;
  }

  let ok = 0, failed = 0, rateLimitHits = 0;
  const failures = [];
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    process.stdout.write('[' + (i + 1) + '/' + plan.length + '] batch-' + p.batch + '/' + p.idx + '.png → ' + p.phrase.toLowerCase() + ' ... ');
    let result = await uploadOne(p);
    if (result.rateLimited) {
      rateLimitHits++;
      process.stdout.write('429, waiting 65s and retrying... ');
      await new Promise(r => setTimeout(r, 65000));
      result = await uploadOne(p);
    }
    if (result.ok) {
      ok++;
      console.log('OK');
    } else {
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
      console.log('  batch-' + f.batch + '/' + f.idx + '.png ("' + f.phrase.toLowerCase() + '"): ' + f.error);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
