// Upload German definition images to Supabase Storage.
//
// Walks every batch folder under IMAGE_ROOT, maps each filename
// "{index}.png" to the corresponding word in VOCAB_DATA (formula:
// wordIdx = (batch - 1) * 8 + index), and POSTs to the public
// upload-image edge function with key "def {german_lowercase}".
//
// Run dry-first to preview what would happen:
//   node scripts/upload-def-images.mjs --dry
// Then for real:
//   node scripts/upload-def-images.mjs
//
// Rate limit: the edge function caps at 20 uploads/min per IP, so we
// pace at ~600ms between requests (≈100/min headroom is unsafe — sticking
// well under the limit with explicit waits and back-off on 429).

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://qpzepnbqdscshylcwvhr.supabase.co';
const UPLOAD_ENDPOINT = SUPABASE_URL + '/functions/v1/upload-image';
const IMAGE_ROOT = 'C:/Users/ASUS/Documents/Claude/Projects/Image Gen/german-defimages';
const BATCH_NUMBERS = [1, 3, 4, 5, 6, 7, 8, 9, 10, 21, 22, 23, 24, 25, 26, 27, 29, 31, 87, 88, 89, 90, 91, 105, 106, 107];
const DELAY_MS = 4000; // 4s between uploads → 15/min, well under the 20/min cap
const DRY_RUN = process.argv.includes('--dry');

// Load VOCAB_DATA.words by lightly parsing vocab-data.ts.
// We avoid a full TypeScript import here (no toolchain) — instead we
// regex-extract the words array. The data is a stable, well-formed
// array of [german, english, catIdx, typeIdx] tuples.
function loadWords() {
  const src = readFileSync('src/vocab-data.ts', 'utf-8');
  const startMarker = 'words: [';
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error('Could not find words array in vocab-data.ts');
  const sliceStart = start + startMarker.length;
  // Find the matching close — assume words array ends before the
  // line containing "  ],\n  batches:" (the next top-level field).
  const batchesIdx = src.indexOf('batches:', sliceStart);
  if (batchesIdx < 0) throw new Error('Could not find batches marker after words');
  // Step back to the closing ] of the words array
  const closeIdx = src.lastIndexOf(']', batchesIdx);
  const arrayBody = src.substring(sliceStart, closeIdx);

  // Each line looks like:  ["der Apfel","apple",8,0],
  // We only need the first string (the German word).
  const lines = arrayBody.split('\n');
  const words = [];
  for (const line of lines) {
    const m = line.match(/^\s*\[\s*"((?:[^"\\]|\\.)*)"/);
    if (m) words.push(m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
  }
  return words;
}

async function uploadOne({ batch, idx, word, filePath }) {
  const base64 = readFileSync(filePath).toString('base64');
  const uploadKey = 'def ' + word.toLowerCase();
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
  const words = loadWords();
  console.log('Loaded ' + words.length + ' words from vocab-data.ts');
  console.log(DRY_RUN ? '\n*** DRY RUN — no uploads will happen ***\n' : '\n*** LIVE RUN ***\n');

  const plan = [];
  for (const batch of BATCH_NUMBERS) {
    const dir = join(IMAGE_ROOT, 'batch-' + batch);
    if (!existsSync(dir)) {
      console.log('batch-' + batch + ': MISSING — skipping');
      continue;
    }
    const files = readdirSync(dir).filter(f => /^\d+\.png$/.test(f))
      .sort((a, b) => parseInt(a) - parseInt(b));
    for (const file of files) {
      const idx = parseInt(file.replace('.png', ''));
      const wordIdx = (batch - 1) * 8 + idx;
      const word = words[wordIdx];
      if (!word) {
        console.log('batch-' + batch + '/' + file + ': NO WORD AT INDEX ' + wordIdx + ' — skipping');
        continue;
      }
      plan.push({ batch, idx, word, filePath: join(dir, file), wordIdx });
    }
  }

  console.log('Planned ' + plan.length + ' uploads');
  console.log('First 5 mappings:');
  for (const p of plan.slice(0, 5)) {
    console.log('  batch-' + p.batch + '/' + p.idx + '.png → "def ' + p.word.toLowerCase() + '" (word #' + p.wordIdx + ')');
  }
  console.log('Last 3 mappings:');
  for (const p of plan.slice(-3)) {
    console.log('  batch-' + p.batch + '/' + p.idx + '.png → "def ' + p.word.toLowerCase() + '" (word #' + p.wordIdx + ')');
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Re-run without --dry to upload for real.');
    return;
  }

  let ok = 0, failed = 0, rateLimitHits = 0;
  const failures = [];
  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    process.stdout.write('[' + (i + 1) + '/' + plan.length + '] batch-' + p.batch + '/' + p.idx + '.png → def ' + p.word.toLowerCase() + ' ... ');
    let result = await uploadOne(p);
    // Simple backoff on rate limit: wait 65s and retry once
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
      console.log('  batch-' + f.batch + '/' + f.idx + '.png ("def ' + f.word.toLowerCase() + '"): ' + f.error);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
