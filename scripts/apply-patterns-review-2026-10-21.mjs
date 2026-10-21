// One-off: naturalness review of the Hören & Sprechen A1 patterns (PM-approved
// 2026-10-21). Edits src/patterns-a1-data.ts in place and records every
// renamed / merged / dropped row in src/patterns-a1-migration.ts so learner
// progress follows the new wording (lib/patterns-migration.ts applies it).
//
//   node scripts/apply-patterns-review-2026-10-21.mjs
//
// Idempotent: a second run finds nothing left to change and exits.
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const DATA = path.join(ROOT, 'src', 'patterns-a1-data.ts');
const MIG = path.join(ROOT, 'src', 'patterns-a1-migration.ts');
const LISTEN_ONLY_CAT = 18;
const T = { Statement: 0, Question: 1, Reply: 2, Dialogue: 3, Request: 4, Formula: 5 };

// old german -> new row fields (german is the new progress key)
const REWORD = {
  'Buchstabieren Sie, bitte.': { de: 'Können Sie das bitte buchstabieren?', en: 'Can you spell that, please?', cue: 'Can you spell that, please?', type: T.Request },
  '(Herzlich) Willkommen.': { de: 'Herzlich willkommen!', en: 'Welcome!', cue: 'Welcome!' },
  'Ich freue mich. — Ich mich auch.': {
    de: 'Ich freue mich schon darauf. — Ich mich auch.',
    turns: ['Ich freue mich schon darauf.', 'Ich mich auch.'],
  },
  'Haben Sie Oliven? — Tut mir leid, Fisch haben wir nicht.': {
    de: 'Haben Sie Oliven? — Tut mir leid, Oliven haben wir nicht.',
    pattern: 'Haben Sie [Oliven / Fleisch / Fisch]? — Tut mir leid, [Oliven / Fleisch / Fisch] haben wir nicht.',
    cue: 'Do you have [olives]? — Sorry, we don\'t have [olives].',
    slots: [{ value: 'Oliven', alts: ['Fleisch', 'Fisch'] }, { value: 'Oliven', alts: ['Fleisch', 'Fisch'] }],
    turns: ['Haben Sie Oliven?', 'Tut mir leid, Oliven haben wir nicht.'],
  },
  'Ist hier auch ein Arbeitszimmer?': { de: 'Gibt es hier auch ein Arbeitszimmer?' },
  'Gehen Sie hier geradeaus und dann bei dem Hotel links.': {
    de: 'Gehen Sie hier geradeaus und dann beim Hotel links.', dropAlso: true,
  },
  'Ich möchte 1 Kilo Birnen, bitte.': {
    de: 'Ich möchte ein Kilo Birnen, bitte.',
    pattern: 'Ich möchte [ein Kilo Birnen], bitte.',
    cue: 'I\'d like [a kilo of pears], please.',
    slots: [{ value: 'ein Kilo Birnen', alts: ['100 Gramm Schinken', 'zwei Äpfel'] }],
  },
  'Oh, wie dumm!': { de: 'Oh, wie blöd!', en: 'Oh, how annoying!', cue: 'Oh, how annoying!', addAlts: ['Oh, wie dumm!'] },
  'Achtung auf Gleis 4, der Zug fährt ein.': { de: 'Achtung an Gleis 4, ein Zug fährt ein.', en: 'Attention at platform 4, a train is arriving.', cue: 'Attention at platform 4, a train is arriving.' },
  'Wenden Sie!': {
    de: 'Bitte wenden.', en: 'Please turn around. (sat nav)', cue: 'Please turn around. (sat nav)',
    type: T.Request, cat: LISTEN_ONLY_CAT, listenOnly: true,
  },
};
const DROP = ['Fahren Sie zurück!'];
const MOVE = {
  'Heute im Angebot: …': { cat: LISTEN_ONLY_CAT, listenOnly: true },
  'Was kostet das?': { cat: 3 },
};
// old german -> target german; addAlt: keep the old wording as an accepted alternative
const MERGE = {
  'Was sprechen Sie?': { to: 'Welche Sprachen sprechen Sie?' },
  'Was sprichst du?': { to: 'Welche Sprachen sprichst du?' },
  'Stimmt.': { to: 'Das stimmt.', addAlt: true },
  'Ja, stimmt.': { to: 'Das stimmt.', addAlt: true },
  'Ich weiß nicht.': { to: 'Ich weiß es nicht.', addAlt: true },
  'Das tut mir leid.': { to: 'Tut mir leid.', addAlt: true },
  'Aber natürlich.': { to: 'Natürlich.', addAlt: true },
  'oder?': { to: '…, oder?' },
  'Es ist … Uhr': { to: 'Es ist sieben Uhr.' },
  'Das macht 2 Euro 50.': { to: 'Das macht 1,50 Euro.' },
  'Es gibt viele Wolken.': { to: 'Es ist bewölkt.' },
  'Ich kann sehr gut Ski fahren.': { to: 'Ja, ich kann sehr gut Ski fahren.', addAlt: true },
};
const ENGLISH = {
  '…, oder?': { en: '…, right?', cue: '…, right?' },
  'Auf welchem Gleis fährt der Zug? — Auf Gleis 13.': {
    en: 'Which platform does the train leave from? — From platform 13.',
    cue: 'Which platform does the train leave from? — From platform [13].',
  },
  'Entschuldigung, ich suche Sportschuhe. Wo finde ich die? — Im dritten Stock.': {
    en: 'Excuse me, I\'m looking for sports shoes. Where can I find them? — On the third floor.',
    cue: 'Excuse me, I\'m looking for [sports shoes]. Where can I find them? — On the third floor.',
  },
  'Was kostet diese Hose?': { en: 'How much are these trousers?' },
  'Möchtest du etwas trinken?': { en: 'Would you like something to drink?' },
};
const NO_FORMAL = ['Der Wievielte ist heute?'];
const TONE = {
  'Wer bist du?': { rule: 'Can sound abrupt ("Who are you?!"). To ask a name, say "Wie heißt du?".', example: 'Und wer bist du? — Ich bin Lena, die Schwester von Max.' },
  'Wer sind Sie?': { rule: 'Can sound abrupt ("Who are you?!"). To ask a name, say "Wie heißen Sie?".', example: 'Und wer sind Sie? — Ich bin die neue Nachbarin.' },
  'Na und?': { rule: 'Dismissive — can sound rude. Use only with friends.', example: 'Ich bin zu spät. — Na und?' },
  'Nein, falsch.': { rule: 'Blunt. More polite: "Nein, das stimmt nicht."', example: 'Ist das richtig? — Nein, das stimmt nicht.' },
};

// ---------------------------------------------------------------------------
const src = fs.readFileSync(DATA, 'utf8');
const lines = src.split('\n');
const rowIdx = [];
lines.forEach((l, i) => { if (/^ {4}\[".*\],\r?$/.test(l)) rowIdx.push(i); });
let rows = rowIdx.map(i => JSON.parse(lines[i].trim().replace(/,\r?$/, '')));
const byDe = () => new Map(rows.map(r => [r[0], r]));
const renames = {};   // old lowercase key -> new german
const changes = [];

for (const [old, r] of Object.entries(REWORD)) {
  const row = byDe().get(old);
  if (!row) continue;
  const m = row[4];
  row[0] = r.de;
  if (r.en) row[1] = r.en;
  if (r.type !== undefined) row[3] = r.type;
  if (r.cat !== undefined) row[2] = r.cat;
  m.pattern = r.pattern || (old === m.pattern ? r.de : m.pattern.replace(old, r.de));
  if (!r.pattern && m.pattern.includes('[') === false) m.pattern = r.de;
  if (r.cue) m.cue = r.cue;
  if (r.slots) m.slots = r.slots;
  if (r.turns) m.turns = r.turns;
  if (r.listenOnly) m.listenOnly = true;
  if (r.dropAlso) delete m.also;
  if (r.addAlts) m.alts = [...(m.alts || []), ...r.addAlts];
  renames[old.toLowerCase().trim()] = r.de;
  changes.push('reword  ' + old + '  ->  ' + r.de);
}
for (const old of DROP) {
  if (!byDe().get(old)) continue;
  rows = rows.filter(r => r[0] !== old);
  changes.push('drop    ' + old);
}
for (const [de, mv] of Object.entries(MOVE)) {
  const row = byDe().get(de);
  if (!row || (row[2] === mv.cat && !!row[4].listenOnly === !!mv.listenOnly)) continue;
  row[2] = mv.cat;
  if (mv.listenOnly) row[4].listenOnly = true;
  changes.push('move    ' + de + '  -> cat ' + mv.cat);
}
for (const [old, mg] of Object.entries(MERGE)) {
  const map = byDe();
  const row = map.get(old), target = map.get(mg.to);
  if (!row) continue;
  if (!target) throw new Error('merge target missing: ' + mg.to);
  if (mg.addAlt) target[4].alts = [...new Set([...(target[4].alts || []), old])];
  if (row[4].lektion) target[4].lektion = [...new Set([...(target[4].lektion || []), ...row[4].lektion])].sort((a, b) => a - b);
  rows = rows.filter(r => r !== row);
  // the twin of a merged du/Sie row loses its partner link
  rows.forEach(r => { if (r[4].partner === old) delete r[4].partner; });
  renames[old.toLowerCase().trim()] = mg.to;
  changes.push('merge   ' + old + '  ->  ' + mg.to);
}
for (const [de, e] of Object.entries(ENGLISH)) {
  const row = byDe().get(de);
  if (!row || (row[1] === e.en && (!e.cue || row[4].cue === e.cue))) continue;
  row[1] = e.en;
  if (e.cue) row[4].cue = e.cue;
  changes.push('english ' + de);
}
for (const de of NO_FORMAL) {
  const row = byDe().get(de);
  if (row && row[4].formal) { delete row[4].formal; changes.push('unformal ' + de); }
}
for (const [de, note] of Object.entries(TONE)) {
  const row = byDe().get(de);
  if (row && !row[4].note) { row[4].note = note; changes.push('tone    ' + de); }
}
// Partners that pointed at a reworded row follow the new wording
rows.forEach(r => { const p = r[4].partner; if (p && renames[p.toLowerCase()]) r[4].partner = renames[p.toLowerCase()]; });

if (!changes.length) { console.log('Nothing to change (already applied).'); process.exit(0); }

// Keep situation blocks together: rows that changed cat move to the end of their new cat
const order = [];
// Situation blocks in learning order (moved rows join their new block)
const learnOrder = JSON.parse(src.match(/PATTERN_LEARN_ORDER = (\[[^\]]*\])/)[1]);
const cats = learnOrder.filter(c => rows.some(r => r[2] === c));
cats.forEach(c => rows.filter(r => r[2] === c).forEach(r => order.push(r)));
const newRows = order.map(r => '    ' + JSON.stringify(r) + ',');
const out = [...lines.slice(0, rowIdx[0]), ...newRows, ...lines.slice(rowIdx[rowIdx.length - 1] + 1)];
fs.writeFileSync(DATA, out.join('\n'));

// Migration file: retarget A11 entries, append the rename table
let mig = fs.readFileSync(MIG, 'utf8');
mig = mig.replace(/^( {2}".*?": )(".*?"),$/gm, (line, head, val) => {
  const target = renames[JSON.parse(val).toLowerCase().trim()];
  return target ? head + JSON.stringify(target) + ',' : line;
});
// Rows dropped outright: no target, remove their A11 entries
DROP.forEach(d => { mig = mig.split('\n').filter(l => !l.startsWith('  ' + JSON.stringify(d.toLowerCase()) + ':')).join('\n'); });
const prior = (mig.match(/export const PATTERN_RENAMES[\s\S]*?\n\};\n/) || [''])[0];
const priorMap = {};
prior.replace(/^ {2}(".*?"): (".*?"),$/gm, (_, k, v) => { priorMap[JSON.parse(k)] = JSON.parse(v); });
// Chain earlier renames through this round's renames
Object.keys(priorMap).forEach(k => { const t = renames[priorMap[k].toLowerCase()]; if (t) priorMap[k] = t; });
const all = { ...priorMap, ...renames };
const block = `export const PATTERN_RENAMES: {[oldKey: string]: string} = {
  // 2026-10-21 naturalness review (scripts/apply-patterns-review-2026-10-21.mjs)
${Object.keys(all).sort().map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(all[k]) + ',').join('\n')}
};
`;
mig = prior ? mig.replace(prior, block) : mig.trimEnd() + `

// Patterns reworded or merged after release: old progress key (lowercased)
// -> current german. Applied on every load and after every cloud pull.
` + block;
mig = mig.replace(/\/\/ Schritte rows dropped on purpose[\s\S]*?\n\];\n/, '');
mig = mig.trimEnd() + `

// Schritte rows dropped on purpose (no pattern to carry progress to).
export const DROPPED_A11_KEYS: string[] = ${JSON.stringify(DROP.map(d => d.toLowerCase()))};
`;
fs.writeFileSync(MIG, mig);

console.log(changes.join('\n'));
console.log('\nRows: ' + rows.length + ', renames recorded: ' + Object.keys(renames).length);
