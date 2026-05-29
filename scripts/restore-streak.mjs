// One-off: backfill May 25-28 study days into the A1.1 cloud record.
import fs from 'fs';

const SYNC_URL = 'https://qpzepnbqdscshylcwvhr.supabase.co/functions/v1/sync-progress';
const EMAIL = 'thanhtam2006@gmail.com';
const LANG = 'german_a11';
const DAYS_TO_ADD = ['2026-05-25', '2026-05-26', '2026-05-27', '2026-05-28'];

const pullRes = await fetch(SYNC_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'pull', email: EMAIL, lang: LANG }),
});
const pulled = await pullRes.json();
if (!pulled.data) { console.error('No cloud data found'); process.exit(1); }

const data = pulled.data;
const before = (data.studyDates || []).slice();
const union = [...new Set([...(data.studyDates || []), ...DAYS_TO_ADD])].sort();
data.studyDates = union;

console.log('Before: ' + before.length + ' dates, last 5:', before.slice(-5));
console.log('After:  ' + union.length + ' dates, last 8:', union.slice(-8));

const pushRes = await fetch(SYNC_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'push', email: EMAIL, lang: LANG, data }),
});
const pushed = await pushRes.json();
console.log('Push result:', pushed);
