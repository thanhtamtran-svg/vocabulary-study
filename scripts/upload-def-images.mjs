// Upload German definition images to Supabase Storage.
//
// Walks every batch folder under IMAGE_ROOT, maps each filename
// "{idx}.png" to VOCAB_DATA.words[idx] (the filename IS the global
// word index), and POSTs to the upload-image edge function with
// key "def {german_lowercase}".
//
// By default skips words that already have a def image in Supabase.
// Run dry-first to preview:
//   node scripts/upload-def-images.mjs --dry
// Then for real:
//   node scripts/upload-def-images.mjs
// Force re-upload everything:
//   node scripts/upload-def-images.mjs --force

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://qpzepnbqdscshylcwvhr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jHgz4-egQIk9dYaV7HhR5w_MK3AYdC0';
const UPLOAD_ENDPOINT = SUPABASE_URL + '/functions/v1/upload-image';
const IMAGE_ROOT = 'C:/Users/ASUS/Documents/Claude/Projects/Image Gen/german-defimages';
const DELAY_MS = 4000; // 4s between uploads → 15/min, well under 20/min cap
const DRY_RUN = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const ONLY_BATCH_ARG = process.argv.find(a => a.startsWith('--only-batch='));
const ONLY_BATCH = ONLY_BATCH_ARG ? parseInt(ONLY_BATCH_ARG.split('=')[1]) : null;

// Query vocab_images for which "def {word}" keys already have an image.
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

// Parse VOCAB_DATA.words from vocab-data.ts without a TS toolchain.
function loadWords() {
  const src = readFileSync('src/vocab-data.ts', 'utf-8');
  const startMarker = 'words: [';
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error('Could not find words array in vocab-data.ts');
  const sliceStart = start + startMarker.length;
  const batchesIdx = src.indexOf('batches:', sliceStart);
  if (batchesIdx < 0) throw new Error('Could not find batches marker after words');
  const closeIdx = src.lastIndexOf(']', batchesIdx);
  const arrayBody = src.substring(sliceStart, closeIdx);
  const words = [];
  for (const line of arrayBody.split('\n')) {
    const m = line.match(/^\s*\[\s*"((?:[^"\\]|\\.)*)"/);
    if (m) words.push(m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
  }
  return words;
}

async function uploadOne({ idx, word, filePath }) {
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
      const word = words[idx];
      if (!word) {
        console.log(bd.name + '/' + file + ': NO WORD AT INDEX ' + idx + ' — skipping');
        continue;
      }
      plan.push({ batch: bd.num, idx, word, filePath: join(dir, file) });
    }
  }

  console.log('Discovered ' + plan.length + ' image files across ' + batchDirs.length + ' batches');

  // Skip already-uploaded keys unless --force was passed.
  let skipped = 0;
  if (!FORCE && plan.length > 0) {
    process.stdout.write('Checking Supabase for already-uploaded def images... ');
    const allKeys = [...new Set(plan.map(p => 'def ' + p.word.toLowerCase().trim()))];
    const present = await fetchExistingKeys(allKeys);
    console.log(present.size + ' of ' + allKeys.length + ' keys already have images.');
    const before = plan.length;
    for (let i = plan.length - 1; i >= 0; i--) {
      if (present.has('def ' + plan[i].word.toLowerCase().trim())) plan.splice(i, 1);
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
    console.log('  batch-' + p.batch + '/' + p.idx + '.png → "def ' + p.word.toLowerCase() + '"');
  }
  console.log('Last 3 mappings:');
  for (const p of plan.slice(-3)) {
    console.log('  batch-' + p.batch + '/' + p.idx + '.png → "def ' + p.word.toLowerCase() + '"');
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
