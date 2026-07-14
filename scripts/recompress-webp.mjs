// Recompress all in-use vocab images to WebP to shrink Supabase storage.
//
// For each file the app actually uses (from used_files.json):
//   1. Download current bytes from Supabase Storage
//   2. If already small (< MIN_BYTES) or already webp+small, skip
//   3. Recompress to WebP q80, keeping the SAME filename (.png name, webp body)
//   4. Upload back with contentType image/webp (browsers read by content-type)
//
// Filename is unchanged, so the DB rows (which point to these filenames) need
// NO update — zero risk of broken links.
//
// Requires SERVICE_ROLE_KEY in .env at repo root.
//
// Usage:
//   node scripts/recompress-webp.mjs --limit=20   # test on first 20
//   node scripts/recompress-webp.mjs              # all

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://qpzepnbqdscshylcwvhr.supabase.co';
const BUCKET = 'vocab-images';
const QUALITY = 80;
const MIN_BYTES = 30 * 1024; // don't bother recompressing files already under 30 KB
const CONCURRENCY = 6;

const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : null;
const SCRATCH = process.env.SCRATCH || '.';

function getServiceKey() {
  const line = readFileSync('.env', 'utf-8').split(/\r?\n/).find(l => l.startsWith('SERVICE_ROLE_KEY='));
  if (!line) throw new Error('SERVICE_ROLE_KEY not found in .env');
  return line.slice('SERVICE_ROLE_KEY='.length).trim();
}

const KEY = getServiceKey();
const authHeaders = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function processOne(name) {
  // Download
  const dl = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(name)}`);
  if (!dl.ok) return { name, status: 'download-fail-' + dl.status };
  const orig = Buffer.from(await dl.arrayBuffer());
  const origKB = orig.length / 1024;

  if (orig.length < MIN_BYTES) return { name, status: 'skip-small', origKB, savedKB: 0 };

  // Detect if already webp
  const isWebp = orig.slice(0, 4).toString('ascii') === 'RIFF' && orig.slice(8, 12).toString('ascii') === 'WEBP';

  // Recompress to webp
  let webp;
  try {
    webp = await sharp(orig).webp({ quality: QUALITY }).toBuffer();
  } catch (e) {
    return { name, status: 'compress-fail', origKB, error: e.message };
  }

  // If recompression didn't help (already-webp or tiny gain), skip re-upload
  if (webp.length >= orig.length * 0.95) {
    return { name, status: isWebp ? 'skip-already-webp' : 'skip-no-gain', origKB, savedKB: 0 };
  }

  // Upload back, same name, webp content-type
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'image/webp', 'x-upsert': 'true' },
    body: webp,
  });
  if (!up.ok) return { name, status: 'upload-fail-' + up.status, origKB };

  return { name, status: 'ok', origKB, newKB: webp.length / 1024, savedKB: origKB - webp.length / 1024 };
}

async function main() {
  let files = JSON.parse(readFileSync(join(SCRATCH, 'used_files.json'), 'utf-8'));
  if (LIMIT) files = files.slice(0, LIMIT);
  console.log(`Recompressing ${files.length} files (quality ${QUALITY}, min ${MIN_BYTES / 1024} KB)...\n`);

  let done = 0, ok = 0, skipped = 0, failed = 0, savedTotal = 0;
  const failures = [];

  // Simple concurrency pool
  let idx = 0;
  async function worker() {
    while (idx < files.length) {
      const my = idx++;
      const r = await processOne(files[my]);
      done++;
      if (r.status === 'ok') { ok++; savedTotal += r.savedKB; }
      else if (r.status.startsWith('skip')) skipped++;
      else { failed++; failures.push(r); }
      if (done % 50 === 0 || done === files.length) {
        process.stdout.write(`\r[${done}/${files.length}] ok=${ok} skip=${skipped} fail=${failed} saved=${Math.round(savedTotal / 1024)}MB   `);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log('\n\n=== Done ===');
  console.log(`Recompressed: ${ok}`);
  console.log(`Skipped (already small/webp): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total saved: ~${Math.round(savedTotal / 1024)} MB`);
  if (failures.length) {
    console.log('\nFirst 10 failures:');
    for (const f of failures.slice(0, 10)) console.log('  ' + f.name + ': ' + f.status + (f.error ? ' (' + f.error + ')' : ''));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
