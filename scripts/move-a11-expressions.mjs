// One-off (2026-11-05, PM decision): move EVERY remaining Expression row of
// Schritte A1 into the Hören & Sprechen A1 patterns course, and keep only the
// base (singular) form of nouns in Schritte A1.
//
//   node scripts/move-a11-expressions.mjs          # dry run: prints the report
//   node scripts/move-a11-expressions.mjs --write  # edits the data files
//
// Edits (with --write):
//   src/vocab-a11-data.ts         expressions cut; plural twins dropped; 3 renames
//   src/patterns-a1-data.ts       new Formula cards appended to their situation
//   src/patterns-a1-migration.ts  A11_TO_PATTERNS entries for every moved row
//   src/a11-renames.ts            A11_RENAMES (old Schritte key -> new key)
//   scripts/data/a11-moved-rows.json  appended, so build-patterns-data stays in step
//
// Progress is never rewritten here: the app folds old keys into new ones on
// load and after each cloud pull (lib/patterns-migration.ts), same as 2026-10-20.
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const A11 = path.join(ROOT, 'src', 'vocab-a11-data.ts');
const PAT = path.join(ROOT, 'src', 'patterns-a1-data.ts');
const MIG = path.join(ROOT, 'src', 'patterns-a1-migration.ts');
const REN = path.join(ROOT, 'src', 'a11-renames.ts');
const CACHE = path.join(ROOT, 'scripts', 'data', 'a11-moved-rows.json');
const WRITE = process.argv.includes('--write');

// ---- PM decisions 2026-11-05 ----
// Plural twin -> singular kept. The singular takes the EARLIER Lektion of the two
// (it moves into the plural's slot when the plural came first).
const PLURAL_TWINS = {
  'die Speisen': 'die Speise',
  'die Getränke': 'das Getränk',
  'die Nachrichten': 'die Nachricht',
  'die Hausaufgaben': 'die Hausaufgabe',
  'die Schmerzen': 'der Schmerz',
  'die Haare': 'das Haar',
  'die Medikamente': 'das Medikament',
};
// Plural-only rows rewritten to the singular. Kept plural on purpose:
// die Leute / Ferien / Nebenkosten / Spaghetti (no singular), die Kleider /
// Papiere (different meaning), and the -schmerzen compounds (natural usage).
const TO_SINGULAR = {
  'die Nudeln': ['die Nudel', 'noodle (pasta)'],
  'die Süßigkeiten': ['die Süßigkeit', 'sweet, candy'],
  'die High Heels': ['der High Heel', 'high heel (shoe)'],
};
// Expressions that already exist in the patterns course under another wording.
const MATCH_OVERRIDES = {
  'ach': 'Ach, …',
  'na ja': 'Na ja, …',
  'willkommen': 'Herzlich willkommen!',
};
// Never match these to an existing card (an alt of a different card would win).
const NO_MATCH = new Set(['die sonne scheint']);
// A1 spelling variants of one phrase -> the wording the new card uses.
const SAME_AS = { 'von...bis': 'von … bis …' };
// Category picked by hand where the keyword/Lektion rule lands badly.
const CAT_OVERRIDES = { 'von Beruf': 11, 'dreimal pro Tag': 9 };

// Same category rules as scripts/build-patterns-data.mjs.
const LEKTION_DEFAULT = { 0: 21, 1: 0, 2: 20, 3: 3, 4: 10, 5: 7, 6: 15, 7: 21, 8: 11, 9: 17, 10: 9, 11: 2, 12: 8, 13: 4, 14: 14, 15: 17 };
const KEYWORD_CATS = [
  [/Besserung|krank|Arzt|weh\b|Fieber|Schmerzen|Tabletten|Medikament|Termin|erkältet|Erkältung|im Bett/, 9],
  [/Party|Geburtstag/, 14],
  [/Wetter|Sonne|regnet|schneit|windig|bewölkt|Grad|Null|kalt\b|warm\b/, 13],
  [/Uhr\b|Viertel|kurz (vor|nach)|^von\b|Morgen|Vormittag|Mittag|Abend|Nacht|Woche|Tag\b|Jahr/, 7],
  [/Bus\b|Zug\b|U-Bahn|Auto\b|Fahrrad|Flugzeug|hin und zurück|nur hin/, 5],
  [/Ski|Sport|Kino|Theater|Picknick|Musik|schwimmen|Freunde treffen|Geige/, 15],
];
const FORMULA = 5;

const norm = s => String(s).toLowerCase().replace(/\.\.\./g, '…').replace(/\s*…\s*/g, ' … ')
  .replace(/[.!?]+$/g, '').replace(/\s+/g, ' ').trim();

// ---------- Schritte A1 ----------
const rowRe = /^(\s*)\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*(\d+)\s*,\s*(\d+)\s*\](,?)(\s*\/\/.*)?$/;
const a11Lines = fs.readFileSync(A11, 'utf8').split('\n');
const parsed = a11Lines.map(line => {
  const m = line.match(rowRe);
  return m ? { line, indent: m[1], de: JSON.parse('"' + m[2] + '"'), en: JSON.parse('"' + m[3] + '"'), cat: +m[4], type: +m[5], comma: m[6], tail: m[7] || '' } : { line };
});
const rows = parsed.filter(p => p.de !== undefined);
const byDe = new Map(rows.map(r => [r.de, r]));
const fmt = r => `${r.indent}${JSON.stringify([r.de, r.en, r.cat, r.type])}${r.comma}${r.tail}`;

const renames = {};       // old a11 key -> new a11 key
const report = { moved: [], matched: [], twins: [], singular: [] };

for (const [pl, sg] of Object.entries(PLURAL_TWINS)) {
  const p = byDe.get(pl), s = byDe.get(sg);
  if (!p || !s) throw new Error(`Missing twin row: ${pl} / ${sg}`);
  if (p.cat < s.cat) { // singular moves into the plural's (earlier) slot
    Object.assign(p, { de: s.de, en: s.en, type: s.type });
    s.drop = true;
    report.twins.push(`${pl} -> ${sg} (now Lektion ${p.cat})`);
  } else {
    p.drop = true;
    report.twins.push(`${pl} -> ${sg} (stays Lektion ${s.cat})`);
  }
  renames[pl.toLowerCase()] = sg.toLowerCase();
}
for (const [pl, [sg, en]] of Object.entries(TO_SINGULAR)) {
  const r = byDe.get(pl);
  if (!r) throw new Error(`Missing row: ${pl}`);
  if (byDe.has(sg)) throw new Error(`Singular already exists: ${sg}`);
  Object.assign(r, { de: sg, en });
  renames[pl.toLowerCase()] = sg.toLowerCase();
  report.singular.push(`${pl} -> ${sg}`);
}

// ---------- Patterns ----------
const patSrc = fs.readFileSync(PAT, 'utf8');
const patLines = patSrc.split('\n');
const wordsStart = patLines.findIndex(l => /^\s*words: \[/.test(l));
const wordsEnd = patLines.findIndex((l, i) => i > wordsStart && /^\s*\] as PatternRow\[\],/.test(l));
const patRows = [];
for (let i = wordsStart + 1; i < wordsEnd; i++) {
  const t = patLines[i].trim();
  if (!t.startsWith('[')) continue;
  patRows.push({ i, row: JSON.parse(t.replace(/,$/, '')) });
}
const patIndex = new Map();
patRows.forEach(({ row }) => {
  patIndex.set(norm(row[0]), row[0]);
  (row[4].alts || []).forEach(a => { if (!patIndex.has(norm(a))) patIndex.set(norm(a), row[0]); });
});

const migration = {}; // a11 key -> patterns german
const newCards = [];  // {cat, row}
const newByNorm = new Map();
const movedCache = [];
for (const r of rows) {
  if (r.type !== 4 || r.drop) continue;
  r.drop = true;
  movedCache.push({ de: r.de, en: r.en, lektion: r.cat });
  const key = r.de.toLowerCase().trim();
  const n = norm(SAME_AS[key] || r.de);
  const hit = MATCH_OVERRIDES[key] || (!NO_MATCH.has(key) && patIndex.get(n));
  if (hit) { migration[key] = hit; report.matched.push(`${r.de}  ->  ${hit}`); continue; }
  if (newByNorm.has(n)) { // A1 listed the same phrase twice ("von...bis" / "von … bis …")
    const c = newByNorm.get(n);
    c.row[4].lektion.includes(r.cat) || c.row[4].lektion.push(r.cat);
    migration[key] = c.row[0];
    report.matched.push(`${r.de}  ->  ${c.row[0]} (A1 duplicate)`);
    continue;
  }
  const de = (SAME_AS[key] || r.de).replace(/\s*(\.\.\.|…)\s*/g, ' … ').replace(/\s+/g, ' ').trim();
  const pattern = de.replace(/…/g, '[…]');
  const cue = r.en.replace(/\.\.\./g, '…');
  let cat = LEKTION_DEFAULT[r.cat] ?? 17;
  for (const [re, c] of KEYWORD_CATS) if (re.test(de)) { cat = c; break; }
  if (CAT_OVERRIDES[de] !== undefined) cat = CAT_OVERRIDES[de];
  const meta = { pattern, tracks: [], cue, source: 'schritte', lektion: [r.cat] };
  const nSlots = (pattern.match(/\[…\]/g) || []).length;
  if (nSlots) meta.slots = Array.from({ length: nSlots }, () => ({ value: '', alts: [] }));
  const card = { cat, row: [de, r.en, cat, FORMULA, meta] };
  newCards.push(card); newByNorm.set(n, card);
  migration[key] = de;
  report.moved.push(`[cat ${cat}] ${de} = ${r.en}`);
}
// Two new cards with the same English cue: accept either German answer.
const byCue = new Map();
newCards.forEach(c => { const k = c.row[4].cue.toLowerCase(); (byCue.get(k) || byCue.set(k, []).get(k)).push(c); });
const sameCue = [];
byCue.forEach(list => {
  if (list.length < 2) return;
  list.forEach(c => { c.row[4].alts = list.filter(x => x !== c).map(x => x.row[0]); });
  sameCue.push(list.map(c => c.row[0]).join(' / '));
});
// Keys must stay unique across the whole course (progress key = lowercase german).
const existingKeys = new Set(patRows.map(p => p.row[0].toLowerCase()));
newCards.forEach(c => { if (existingKeys.has(c.row[0].toLowerCase())) throw new Error('Duplicate key: ' + c.row[0]); });

// ---------- report ----------
const exprCount = rows.filter(r => r.type === 4).length;
console.log(`Expressions in Schritte A1: ${exprCount}`);
console.log(`  matched to existing patterns: ${report.matched.length}`);
report.matched.forEach(s => console.log('    ' + s));
console.log(`  new pattern cards: ${newCards.length}`);
report.moved.forEach(s => console.log('    ' + s));
console.log(`  same-cue pairs (accept either): ${sameCue.length}`);
sameCue.forEach(s => console.log('    ' + s));
console.log(`Plural twins merged: ${report.twins.length}`);
report.twins.forEach(s => console.log('    ' + s));
console.log(`Renamed to singular: ${report.singular.length}`);
report.singular.forEach(s => console.log('    ' + s));
if (!WRITE) { console.log('\nDry run. Re-run with --write to apply.'); process.exit(0); }

// ---------- write ----------
fs.writeFileSync(A11, parsed.filter(p => !p.drop).map(p => p.de !== undefined ? fmt(p) : p.line).join('\n'));

// Insert new cards after the last existing row of their category (learning order
// is the array order, grouped by situation).
const lastOfCat = {};
patRows.forEach(({ i, row }) => { lastOfCat[row[2]] = i; });
const inserts = {};
newCards.forEach(c => {
  const at = lastOfCat[c.cat];
  if (at === undefined) throw new Error('No existing row for category ' + c.cat);
  (inserts[at] = inserts[at] || []).push('    ' + JSON.stringify(c.row) + ',');
});
const outPat = [];
patLines.forEach((l, i) => { outPat.push(l); if (inserts[i]) outPat.push(...inserts[i]); });
fs.writeFileSync(PAT, outPat.join('\n'));

const migSrc = fs.readFileSync(MIG, 'utf8');
const migEnd = migSrc.indexOf('\n};', migSrc.indexOf('export const A11_TO_PATTERNS'));
const migAdd = '\n  // 2026-11-05: every remaining Expression row (scripts/move-a11-expressions.mjs)\n' +
  Object.entries(migration).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
fs.writeFileSync(MIG, migSrc.slice(0, migEnd) + migAdd + migSrc.slice(migEnd));

fs.writeFileSync(REN, `// Schritte A1 words reworded after release: old progress key -> current key.
// Folded in on load and after every cloud pull (applyPatternRenames does the
// merge; old keys stay in the blob but match no row). Never remove an entry:
// a device or cloud copy may still carry the old key.
//
// 2026-11-05 (PM): keep only the base form of nouns. Plural twins fold into the
// singular card; three plural-only rows became singular. Kept plural on purpose:
// die Leute / Ferien / Nebenkosten / Spaghetti (no singular), die Kleider /
// Papiere (other meaning), the -schmerzen compounds (natural usage).
export const A11_RENAMES: {[oldKey: string]: string} = {
${Object.entries(renames).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
};
`);

const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
fs.writeFileSync(CACHE, JSON.stringify(cache.concat(movedCache), null, 1) + '\n');
console.log('\nWritten.');
