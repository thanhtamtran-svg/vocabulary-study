// One-off generator for src/patterns-a1-data.ts (Hören & Sprechen A1 sentence
// patterns) and src/patterns-a1-migration.ts. Not a build step: run it, read
// the review report it prints, hand-fix the overrides below, commit the output.
//
//   node scripts/build-patterns-data.mjs <path/to/unzipped/word/document.xml>
//
// Sources:
//  1. The Word doc "Hören & Sprechen A1 – Sentence Patterns" (sections 1–18 =
//     situation tables, section 19 = grammar traps + everyday alternatives).
//  2. Every sentence / interjection row of src/vocab-a11-data.ts (type
//     Expression). On the first run those rows are cut out of the A1 file and
//     cached in scripts/data/a11-moved-rows.json, so re-runs stay idempotent.
//
// Output rows: [german, english, catIdx, typeIdx, meta]. `german` is the
// permanent progress key — never reword a shipped row (see file header).
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const A11_FILE = path.join(ROOT, 'src', 'vocab-a11-data.ts');
const CACHE = path.join(ROOT, 'scripts', 'data', 'a11-moved-rows.json');
const OUT = path.join(ROOT, 'src', 'patterns-a1-data.ts');
const OUT_MIG = path.join(ROOT, 'src', 'patterns-a1-migration.ts');

const CATS = [
  'Sich vorstellen',            // 0  doc §1
  'Namen & Buchstabieren',      // 1  doc §2
  'Nach dem Weg fragen',        // 2  doc §3
  'Lebensmittel einkaufen',     // 3  doc §4
  'Kleidung & Kaufhaus',        // 4  doc §5
  'Zug & Bus',                  // 5  doc §6
  'Café & Restaurant',          // 6  doc §7
  'Uhrzeit & Verabredungen',    // 7  doc §8
  'Telefon & Nachrichten',      // 8  doc §9
  'Gesundheit & Arzt',          // 9  doc §10
  'Wohnung & Möbel',            // 10 doc §11
  'Bei der Arbeit',             // 11 doc §12
  'Im Hotel',                   // 12 doc §13
  'Wetter & Urlaub',            // 13 doc §14
  'Geburtstag & Feste',         // 14 doc §15
  'Sport & Freizeit',           // 15 doc §16
  'Das Wochenende (Perfekt)',   // 16 doc §17
  'Kurz gefragt (Prüfung)',     // 17 doc §18
  'Durchsagen (nur hören)',     // 18 doc §6 note — listen-only, excluded from exercises/reviews
  'Begrüßen & Reagieren',       // 19 greetings, reactions, small talk (mostly from Schritte A1)
  'Familie & Persönliches',     // 20 Schritte L2
  'Im Deutschkurs',             // 21 Schritte L7 + classroom phrases
];
const LISTEN_ONLY_CAT = 18;
// Learning order (batch order). Everyday basics first, listen-only last.
const LEARN_ORDER = [0, 19, 20, 1, 21, 7, 3, 6, 10, 2, 5, 9, 4, 8, 11, 12, 13, 14, 15, 16, 17, 18];
const TYPES = ['Statement', 'Question', 'Reply', 'Dialogue', 'Request', 'Formula'];
const T = Object.fromEntries(TYPES.map((t, i) => [t, i]));

// Inline " / " alternatives that are not whole sentences: rewrite as an
// explicit [slot] so the generic parser can handle them.
const INLINE_OVERRIDES = {
  "Es ist halb fünf / Viertel nach vier / kurz vor fünf / zwanzig vor fünf.": "Es ist [halb fünf / Viertel nach vier / kurz vor fünf / zwanzig vor fünf].",
  'Gehen Sie geradeaus und dann links / rechts.': 'Gehen Sie geradeaus und dann [links / rechts].',
  "Wie geht's? / Wie geht es dir / Ihnen?": "Wie geht's? / Wie geht es [dir / Ihnen]?",
  'Möchten Sie auch etwas trinken / essen?': 'Möchten Sie auch etwas [trinken / essen]?',
  'Hast du heute / am Wochenende / am Samstag Zeit?': 'Hast du [heute / am Wochenende / am Samstag] Zeit?',
  'Wie war dein / Ihr Wochenende? — Schön war\'s.': 'Wie war [dein / Ihr] Wochenende? — Schön war\'s.',
  'Wie war die Party / das Essen / die Musik?': 'Wie war [die Party / das Essen / die Musik]?',
  'Ich habe [ein T-Shirt] gekauft / [ein Buch] gelesen / [Fußball] gespielt.': 'Ich habe [ein T-Shirt] gekauft. / Ich habe [ein Buch] gelesen. / Ich habe [Fußball] gespielt.',
  'Dann bin ich [in den Park / ins Kino] gegangen. / Dann bin ich nach Hause gefahren.': 'Dann bin ich [in den Park / ins Kino] gegangen. / Dann bin ich nach Hause gefahren.',
  'Mein [Kopf / Bauch / Rücken / Zahn] tut weh.': 'Mein [Kopf / Bauch / Rücken / Zahn] tut weh.',
  'Wie buchstabiert man Ihren Vornamen / Nachnamen?': 'Wie buchstabiert man Ihren [Vornamen / Nachnamen]?',
  'Ich kann dich leider nicht (vom Bahnhof) abholen. Mein Auto ist kaputt.': 'Ich kann dich leider nicht vom Bahnhof abholen. Mein Auto ist kaputt.',
  'Nimm einfach den Bus / die U-Bahn.': 'Nimm einfach [den Bus / die U-Bahn].',
  'Ruf mich mal (zurück)! / Ruf mich doch mal im Büro an. Die Nummer ist …': 'Ruf mich mal zurück! / Ruf mich doch mal im Büro an.',
  'Wie geht\'s? / Wie geht es dir / Ihnen?': "Wie geht's? / Wie geht es [dir / Ihnen]?",
  'Kann ich die mal (an)probieren? — Ja, gern!': 'Kann ich die mal anprobieren? — Ja, gern!',
  'Ja, mache ich (gleich). / Kein Problem, mache ich später.': 'Ja, mache ich gleich. / Kein Problem, mache ich später.',
  'Herzlichen Glückwunsch (zum Geburtstag)!': 'Herzlichen Glückwunsch zum Geburtstag! / Herzlichen Glückwunsch!',
  'Möchtest du etwas trinken? / Möchtest du ein Stück Kuchen?': 'Möchtest du etwas trinken? / Möchtest du ein Stück Kuchen?',
  'Hast du morgen Zeit? Melde dich. / Ich melde mich bald.': 'Hast du morgen Zeit? Melde dich. / Ich melde mich bald.',
  'Wie ist der Urlaub? / Gefällt es euch in [Hamburg]?': 'Wie ist der Urlaub? / Gefällt es euch in [Hamburg]?',
  'Wo wohnst du? / Wohnst du hier in [Berlin]?': 'Wo wohnst du? / Wohnst du hier in [Berlin]?',
  'Hallo, hier ist [Jakob].': 'Hallo, hier ist [Jakob].',
};

// Section 6 listen-only announcements: the doc lists them in one paragraph
// without glosses, so they are written out here.
const ANNOUNCEMENTS = [
  ['Achtung auf Gleis 4, der Zug fährt ein.', 'Attention on platform 4, the train is arriving.'],
  ['Bitte Vorsicht bei der Einfahrt.', 'Please take care as the train comes in.'],
  ['Liebe Fahrgäste!', 'Dear passengers!'],
  ['Wir bitten um Entschuldigung.', 'We apologise.'],
  ['Unser Zugrestaurant ist heute leider geschlossen.', 'Unfortunately our restaurant car is closed today.'],
  ['Frau Meier, bitte kommen Sie zur Information.', 'Ms Meier, please come to the information desk.', ['Frau Meier, bitte kommen Sie zur Kasse.']],
  ['Liebe Kunden, unser Geschäft schließt in fünf Minuten.', 'Dear customers, our shop closes in five minutes.'],
  ['Morgen sind wir ab 7 Uhr wieder für Sie da.', 'Tomorrow we are open again from 7 o\'clock.'],
];
const ANNOUNCEMENT_TRACKS = [25, 104, 106, 108];

// Section 19 "(paying — not in audio)" row, written out as cards.
const EXTRA_CARDS = [
  { de: 'Zahlen, bitte!', en: 'The bill, please!', cat: 6, alts: ['Die Rechnung, bitte.'] },
  { de: 'Zusammen oder getrennt?', en: 'Together or separately?', cat: 6 },
  { de: 'Stimmt so.', en: 'Keep the change.', cat: 6 },
];

// Section-19 grammar traps the substring matcher cannot place.
const NOTE_OVERRIDES = {
  "Die Wohnung hat einen Balkon.": "Die Wohnung hat drei Zimmer, Küche, Bad und einen Balkon.",
  "Ich bin ins Kino gegangen.": "Dann bin ich in den Park gegangen.",
  'vom 4. bis zum 6. Mai': 'Wann möchten Sie kommen? — Vom 4. Mai bis zum 6. Mai.',
  'Ruf mich an! / Trink …!': 'Ruf mich mal zurück!',
};

// Everyday alternatives whose audio wording was corrected above.
const ALSO_OVERRIDES = {
  "Kann ich die mal probieren?": "Kann ich die mal anprobieren? — Ja, gern!",
};

// Hand-written English where the doc's English lists several options inline
// ("I have a headache / sore throat / …"). Value = cue; the gloss is the cue
// without brackets.
const EN_OVERRIDES = {
  'Ich lese gern.': 'I like [reading].',
  'Guten Tag': 'Hello / Good day',
  'Wie buchstabiert man Ihren Vornamen?': 'How do you spell your [first name]?',
  'Es ist halb fünf.': "It's [half past four].",
  'Hast du heute Zeit?': 'Are you free [today]?',
  'Was möchten Sie?': 'What would you like? (shop assistant)',
  'Was möchten Sie trinken?': 'What would you like to drink?',
  'Möchten Sie auch etwas trinken?': 'Would you also like something to [drink]?',
  'Die Wohnung hat drei Zimmer, Küche, Bad und einen Balkon.': 'The flat has [three rooms], [kitchen, bathroom] and [a balcony].',
  'Wie findest du das Sofa?': 'What do you think of [the sofa]?',
  'Es gibt …': 'There is / there are …',
  'Gehen Sie geradeaus und dann links.': 'Go straight ahead and then [left].',
  'Der Zug fährt um 18:21 ab und kommt um 20:09 in Köln an.': 'The train leaves at [18:21] and arrives in [Köln] at [20:09].',
  'Ich fahre am Sonntag nach Regensburg. Kommst du mit?': "I'm going to [Regensburg] on [Sunday]. Are you coming?",
  'Ich habe Kopfschmerzen.': 'I have [a headache].',
  'Mein Kopf tut weh.': 'My [head] hurts.',
  'Du musst viel Wasser trinken.': 'You must [drink lots of water].',
  'Gibt es diesen Pullover auch in Blau? — Nein, tut mir leid, nur in Grau.': 'Is [this pullover] also available in [blue]? — Sorry, only in grey.',
  'Nimm einfach den Bus.': 'Just take [the bus].',
  'Ich habe am Montag um 15 Uhr einen Termin bei Ihnen. Geht es vielleicht am Dienstag?': 'I have an appointment with you on [Monday] at [3 pm]. Would [Tuesday] work instead?',
  'Wie war die Party?': 'How was [the party]?',
  'Dann bin ich in den Park gegangen.': 'Then I went [to the park].',
  'Ich habe ein T-Shirt gekauft.': 'I bought [a T-shirt].',
};

// Doc rows moved to another situation after review.
const DOC_CAT_OVERRIDES = { "Wie geht's?": 19, 'Gut, danke. Und dir?': 19, 'Danke.': 19 };

const GREETINGS_NO_PUNCT = new Set(['Guten Tag', 'Hallo', 'Auf Wiedersehen', 'Tschüs', 'Guten Abend', 'Guten Morgen',
  'Gute Nacht', 'Entschuldigung', 'Vielen Dank', 'Auf Wiederhören', 'Viele Grüße', 'Herzliche Grüße',
  'Mit freundlichen Grüßen', 'Liebe Grüße']);

// Schritte Lektion -> default situation, then keyword overrides (first match wins).
const LEKTION_DEFAULT = { 1: 0, 2: 20, 3: 3, 4: 10, 5: 7, 6: 15, 7: 21, 8: 11, 9: 17, 10: 9, 11: 2, 12: 8, 13: 4, 14: 14, 15: 17 };
const KEYWORD_CATS = [
  [/^Wie geht|^(Sehr gut|Gut|Auch gut), danke|^(Na ja|Ach), |^Und (Ihnen|dir)\?/, 19],
  [/Grüße/, 8],
  [/Besserung|krank|Arzt|weh\b|Fieber|Schmerzen|Tabletten|Medikament|Termin/, 9],
  [/Glückwunsch|Alles (Gute|Liebe)|Frohe|[Gg]utes neues|Ostern|Weihnacht|Party|Datum|Wievielte|Geburtstag/, 14],
  [/Wetter|Sonne|regnet|schneit|windig|bewölkt|Wolken|Grad|heiß(?!t)|kalt\b|kalte|warme|Wind|Regen|Sommer|Es ist warm/, 13],
  [/gemacht|gearbeitet|gefahren|gegangen|gekommen|[Gg]estern/, 16],
  [/Deutschkurs|Unterricht|Lehrer|auf Deutsch|noch Fragen|lernen|Worum geht|Wie sagt man|Was bedeutet/, 21],
  [/Rechnung|zahlen|Stimmt so|Trinken|empfehlen|bringen|bringe|Essen\?|Für mich|Ich nehme|Kommt sofort|Machen Sie/, 6],
  [/Uhr\b|spät|halb |Viertel|kurz (vor|nach)|gleich zwölf|geöffnet|Zeit|^Von .* bis|Wann fängt|früh auf|Wie lange|Wie oft|Das passt|Ich komme gern|Wollen wir|Ist es schon/, 7],
  [/Fahrkarte|Zug\b|Bus\b|Gleis|U-Bahn/, 5],
  [/Ski|Sport|schwimme|tanze|Hobbys|Freizeit|Lieblings|Krimis|Spaß/, 15],
];

// ---------- helpers ----------
function splitTop(s, sep) {
  const out = []; let depth = 0, buf = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (depth === 0 && s.startsWith(sep, i)) { out.push(buf); buf = ''; i += sep.length - 1; continue; }
    buf += ch;
  }
  out.push(buf);
  return out.map(x => x.trim()).filter(Boolean);
}
const SENT_END = /[.?!…]["')]?$/;
function sentenceAlts(turn, report) {
  const parts = splitTop(turn, ' / ');
  if (parts.length > 1 && !parts.slice(0, -1).every(p => SENT_END.test(p))) report.inline.push(turn);
  return parts;
}
function slotsOf(p) {
  const slots = []; p.replace(/\[([^\]]+)\]/g, (_, inner) => {
    const xs = inner.split(' / ').map(x => x.trim());
    slots.push({ value: xs[0] === '…' ? '' : xs[0], alts: xs.slice(1) });
    return '';
  });
  return slots;
}
function canonical(p) {
  return p.replace(/\[([^\]]+)\]/g, (_, inner) => inner.split(' / ')[0].trim())
    .replace(/\s+([,.?!])/g, '$1').replace(/\s+/g, ' ').trim();
}
function slotVariants(p) {
  const out = [];
  const re = /\[([^\]]+)\]/g; let m;
  while ((m = re.exec(p))) {
    const xs = m[1].split(' / ').map(x => x.trim());
    xs.slice(1).forEach(alt => out.push(canonical(p.slice(0, m.index) + alt + p.slice(m.index + m[0].length))));
  }
  return out;
}
function norm(s) {
  return s.toLowerCase().replace(/\.\.\./g, '…').replace(/[.,!?;:„“"()—–]/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
}
function frame(p) { return norm(p.replace(/\[[^\]]*\]/g, '…').replace(/\.\.\./g, '…')).replace(/\s*…\s*/g, ' … ').trim(); }
function tracksOf(s) { return (s.match(/\d+/g) || []).map(Number); }
function wordCount(s) { return s.replace(/\.\.\.|…/g, ' ').split(/\s+/).filter(w => /\p{L}/u.test(w)).length; }

const FORMULA_RE = /^(\(?Herzlich|Glückwunsch|Alles (Gute|Liebe)|Frohe|[Gg]utes neues|Ein (gutes|schönes) neues|(Oh, )?(Das )?[Tt]ut mir leid\.|Kein Problem|Alles klar|Bis (später|dann|morgen)|Danke schön|Vielen Dank|Bitte schön|Ich weiß (es )?nicht\.|Oh, wie dumm|Oh schön|Keine Lust|Na klar|Na gut)/;
function classify(de, nTurns) {
  if (nTurns > 1) return T.Dialogue;
  const d = de.trim(); const wc = wordCount(d);
  // A "…" slot inside the sentence makes it a frame, not a fixed formula;
  // a trailing ", …" / leading "…," is just a filler ("Na ja, …", "…, oder?").
  const frameSlot = /…/.test(d) && !/,\s*…$/.test(d) && !/^…,/.test(d) && !/^…\s+und\b/.test(d);
  if (GREETINGS_NO_PUNCT.has(d) || FORMULA_RE.test(d) || (!frameSlot && wc <= 2)) return T.Formula;
  if (/^(Ja|Nein|Doch)\b/.test(d)) return T.Reply;
  if (!/\?$/.test(d) && /^(Um|Von|Seit|In|Am|Im|Mit|Für|Ungefähr|Genau|Nur|Schon)\b/.test(d) && (wc <= 4 || /^(Von|Um|Seit)\b/.test(d) && !/\b(ist|sind|bin|habe|hat|war)\b/.test(d))) return T.Reply;
  if (/^(\p{Lu}\p{Ll}+en) Sie\b/u.test(d) && !/\?$/.test(d)) return T.Request;
  if (/^(Bitte|Gehen Sie|Nehmen Sie|Biegen Sie|Fahren Sie|Rufen Sie|Bringen Sie|Reservieren Sie|Nimm|Trink|Leg|Bring|Ruf|Komm|Warte|Buchstabieren Sie)\b/.test(d)) return T.Request;
  if (/^(Können|Könnten) Sie (bitte|mir)\b/.test(d) || (/bitte[.!]$/.test(d) && !/\?/.test(d))) return T.Request;
  if (/\?$/.test(d)) return T.Question;
  return T.Statement;
}
function formalOf(de) {
  const du = /\b(du|dir|dich|dein\w*|euch|ihr)\b/.test(de);
  const sie = /\s(Sie|Ihnen|Ihr\w*)\b/.test(de);
  return du && !sie ? 'du' : sie && !du ? 'Sie' : undefined;
}

// ---------- 1. Word doc ----------
function readDocx(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const body = xml.slice(xml.indexOf('<w:body'));
  const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const text = frag => (frag.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [])
    .map(p => dec((p.match(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('')))
    .filter(x => x.trim()).join('\n');
  const blocks = [];
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const f = m[0];
    if (f.startsWith('<w:tbl')) {
      const rows = (f.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).map(tr => (tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map(text));
      blocks.push({ t: 'table', rows });
    } else { const t = text(f); if (t.trim()) blocks.push({ t: 'p', text: t }); }
  }
  return blocks;
}

const report = { inline: [], unmatchedNotes: [], unmatchedAlso: [], long: [], merged: [], newFromA11: 0 };
const cards = [];          // {de, en, cat, type, meta, order}
const byFrame = new Map(); // frame -> card

function addFrames(card, patterns) {
  patterns.forEach(p => { const f = frame(p); if (!byFrame.has(f)) byFrame.set(f, card); });
}

function cardFromPattern(rawDe, rawEn, tracks, cat, extra = {}) {
  const de0 = INLINE_OVERRIDES[rawDe] || rawDe;
  const turns = splitTop(de0, ' — ');
  const turnAlts = turns.map(t => sentenceAlts(t, report));
  const patternTurns = turnAlts.map(a => a[0]);
  const pattern = patternTurns.join(' — ');
  const german = canonical(pattern);
  // English: take the first " / " alternative only when the German turn has
  // the same number of sentence alternatives ("My name is … / I'm called …");
  // otherwise the slashes are inline ("My head / stomach … hurts") — keep all.
  const enTurns = splitTop(rawEn, ' — ').map((t, i) => {
    const parts = splitTop(t, ' / ');
    return parts.length > 1 && turnAlts[i] && parts.length === turnAlts[i].length ? parts[0] : t;
  });
  const english = enTurns.join(' — ');
  const slots = slotsOf(pattern);
  // Cue: English with each "…" replaced by the German slot value, in order.
  // "the [das Wohnzimmer]" -> "[das Wohnzimmer]" (the German value has its article).
  const dots = (english.match(/…/g) || []).length;
  let cue = english;
  if (slots.length && dots === slots.length) {
    let i = 0;
    cue = english.replace(/(\b(?:the|a|an) )?…/g, (m, art) => {
      const v = slots[i++].value;
      if (!v) return m;
      return (art && /^(der|die|das|den|dem|des|ein|eine|einen|einem|einer|diese[nmrs]?|meine?)\b/i.test(v) ? '' : (art || '')) + '[' + v + ']';
    });
  }
  const endP = german.match(/[.?!]$/);
  if (endP && !/[.?!)]$/.test(cue)) cue += endP[0];
  const alts = turns.length === 1 ? turnAlts[0].slice(1).map(canonical) : [];
  const meta = { pattern, tracks, cue };
  if (slots.length) meta.slots = slots;
  if (alts.length) meta.alts = alts;
  if (turns.length > 1) { meta.turns = patternTurns.map(canonical); const ta = turnAlts.map(a => a.slice(1).map(canonical)); if (ta.some(a => a.length)) meta.turnAlts = ta; }
  Object.assign(meta, extra);
  if (DOC_CAT_OVERRIDES[german] !== undefined) cat = DOC_CAT_OVERRIDES[german];
  if (EN_OVERRIDES[german]) meta.cue = EN_OVERRIDES[german];
  const card = { de: german, en: EN_OVERRIDES[german] ? EN_OVERRIDES[german].replace(/[\[\]]/g, '') : english, cat, type: classify(german, turns.length), meta };
  if (german.length > 160) report.long.push(german);
  cards.push(card);
  // Only the first turn of a dialogue is matchable: a generic reply such as
  // "Ja, gern." must not be swallowed by one dialogue that happens to end with it.
  addFrames(card, turnAlts[0]);
  card.search = [canonical(turnAlts[0][0]), ...turnAlts[0].slice(1).map(canonical), ...turnAlts[0].flatMap(slotVariants)].map(norm);
  card.searchAll = [...card.search, ...turnAlts.flat().map(canonical).map(norm), ...patternTurns.flatMap(slotVariants).map(norm)];
  return card;
}

function buildFromDocx(blocks) {
  let section = 0, notes = [], also = [];
  for (const b of blocks) {
    if (b.t === 'p') {
      const m = b.text.match(/^(\d+)\.\s/); if (m) section = +m[1];
      continue;
    }
    const head = b.rows[0].map(c => c.toLowerCase());
    const rows = b.rows.slice(1);
    if (section >= 1 && section <= 18 && head[0].startsWith('german pattern')) {
      rows.forEach(r => cardFromPattern(r[0], r[1], tracksOf(r[2]), section - 1, { source: 'audio' }));
    } else if (section === 1 && head[0].startsWith('du')) {
      rows.forEach(r => {
        const du = cardFromPattern(r[0], r[2], tracksOf(r[3]), 0, { source: 'audio', formal: 'du' });
        const sie = cardFromPattern(r[1], r[2], tracksOf(r[3]), 0, { source: 'audio', formal: 'Sie' });
        du.meta.partner = sie.de; sie.meta.partner = du.de;
      });
    } else if (section === 19 && head[0] === 'section') notes = rows;
    else if (section === 19 && head[0].startsWith('audio pattern')) also = rows;
  }
  ANNOUNCEMENTS.forEach(([de, en, alts]) => {
    const c = cardFromPattern(de, en, ANNOUNCEMENT_TRACKS, LISTEN_ONLY_CAT, { source: 'audio', listenOnly: true });
    if (alts) { c.meta.alts = alts; addFrames(c, alts); }
  });
  EXTRA_CARDS.forEach(x => {
    const c = cardFromPattern(x.de, x.en, [], x.cat, { source: 'extra' });
    if (x.alts) { c.meta.alts = x.alts; addFrames(c, x.alts); c.search.push(...x.alts.map(norm)); c.searchAll.push(...x.alts.map(norm)); }
  });
  // Grammar traps -> meta.note
  notes.forEach(([sec, pat, rule, example]) => {
    const secs = tracksOf(sec).map(n => n - 1);
    let target = null;
    if (NOTE_OVERRIDES[pat]) target = cards.find(c => c.de === NOTE_OVERRIDES[pat]);
    else {
      const needles = splitTop(pat, ' / ').map(p => norm(p.replace(/^…,?\s*/, '')));
      target = cards.find(c => secs.includes(c.cat) && c.meta.source === 'audio' && needles.some(n => c.searchAll.some(s => s.includes(n))));
    }
    if (target && !target.meta.note) target.meta.note = { rule, example };
    else report.unmatchedNotes.push(pat);
  });
  // Everyday alternatives -> meta.also
  also.forEach(([pat, alt, note]) => {
    if (/^\(/.test(pat)) return; // the paying row -> EXTRA_CARDS
    const n = norm(pat);
    const target = ALSO_OVERRIDES[pat] ? cards.find(c => c.de === ALSO_OVERRIDES[pat]) : cards.find(c => c.searchAll && c.searchAll.some(s => s.includes(n)));
    if (target) target.meta.also = { text: alt, note };
    else report.unmatchedAlso.push(pat);
  });
}

// ---------- 2. Schritte A1 sentence rows ----------
function loadA11Rows() {
  if (fs.existsSync(CACHE)) return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  const lines = fs.readFileSync(A11_FILE, 'utf8').split('\n');
  const re = /^\s*\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*(\d+)\s*,\s*(\d+)\s*\],?\s*(\/\/.*)?$/;
  const moved = [], keep = [];
  lines.forEach(line => {
    const m = line.match(re);
    if (m && +m[4] === 4) {
      const d = m[1].trim();
      const isSentence = /[.?!]\)?$/.test(d) || (/(\.\.\.|…)/.test(d) && /^[A-ZÄÖÜ(„…]/.test(d)) || GREETINGS_NO_PUNCT.has(d);
      if (isSentence) { moved.push({ de: m[1], en: m[2], lektion: +m[3] }); return; }
    }
    keep.push(line);
  });
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(moved, null, 1) + '\n');
  fs.writeFileSync(A11_FILE, keep.join('\n'));
  console.log(`Cut ${moved.length} sentence rows out of vocab-a11-data.ts (cached in scripts/data/a11-moved-rows.json)`);
  return moved;
}

function a11Cat(de, lektion, type) {
  for (const [re, cat] of KEYWORD_CATS) if (re.test(de)) return cat;
  if (type === T.Formula) return 19;
  return LEKTION_DEFAULT[lektion] ?? 17;
}

const migration = {}; // a11 key (lowercased) -> patterns german
function mergeA11(rows) {
  rows.forEach(r => {
    const raw = r.de.trim();
    const f = frame(raw);
    const key = raw.toLowerCase().trim();
    const n = norm(raw);
    let card = cards.find(c => c.search && c.search.includes(n)) || byFrame.get(f);
    if (card) {
      if (card.meta.source !== 'schritte') report.merged.push(raw + '  ->  ' + card.de);
      (card.meta.lektion = card.meta.lektion || []).includes(r.lektion) || card.meta.lektion.push(r.lektion);
      migration[key] = card.de;
      return;
    }
    // New card from A1: "..." becomes an empty slot "[…]".
    const formalTag = (r.en.match(/\((formal|informal|plural)\)/) || [])[1];
    const en = r.en.replace(/\s*\((formal|informal|plural)\)\s*/g, ' ').trim();
    const de = raw.replace(/\s*(\.\.\.|…)\s*/g, ' … ').replace(/\s+([,.?!])/g, '$1').replace(/\s+/g, ' ').trim();
    const pattern = de.replace(/…/g, '[…]');
    const type = classify(de, 1);
    const meta = { pattern, tracks: [], cue: en.replace(/\.\.\./g, '…'), source: 'schritte', lektion: [r.lektion] };
    const slots = slotsOf(pattern); if (slots.length) meta.slots = slots;
    const formal = formalTag === 'formal' ? 'Sie' : formalTag === 'informal' ? 'du' : formalTag === 'plural' ? 'ihr' : undefined;
    if (formal) meta.formal = formal;
    card = { de, en, cat: a11Cat(raw, r.lektion, type), type, meta, search: [norm(de)] };
    cards.push(card); byFrame.set(f, card); byFrame.set(frame(de), card);
    migration[key] = de;
    report.newFromA11++;
  });
  // du/Sie partners among Schritte cards: same cat, same gloss, one du + one Sie.
  const sch = cards.filter(c => c.meta.source === 'schritte' && !c.meta.partner);
  sch.forEach(a => {
    if (a.meta.partner) return;
    const fa = a.meta.formal || formalOf(a.de); if (fa !== 'du') return;
    const b = sch.find(x => x !== a && !x.meta.partner && x.cat === a.cat && x.en === a.en && (x.meta.formal || formalOf(x.de)) === 'Sie');
    if (b) { a.meta.formal = 'du'; b.meta.formal = 'Sie'; a.meta.partner = b.de; b.meta.partner = a.de; }
  });
}

// ---------- 3. Order + write ----------
function ordered() {
  const out = [];
  LEARN_ORDER.forEach(cat => {
    const inCat = cards.filter(c => c.cat === cat);
    const seen = new Set();
    inCat.forEach(c => {
      if (seen.has(c)) return;
      out.push(c); seen.add(c);
      const p = c.meta.partner && inCat.find(x => x.de === c.meta.partner);
      if (p && !seen.has(p)) { out.push(p); seen.add(p); }
    });
  });
  return out;
}

function writeOut(list) {
  const dup = new Map();
  list.forEach(c => { const k = c.de.toLowerCase(); if (dup.has(k)) throw new Error('Duplicate key: ' + c.de); dup.set(k, c); });
  const row = c => '    ' + JSON.stringify([c.de, c.en, c.cat, c.type, c.meta]) + ',';
  const ts = `// Hören & Sprechen A1 — Sentence Patterns course data.
// GENERATED by scripts/build-patterns-data.mjs, then hand-reviewed. Edit here
// for small fixes, but NEVER reword the first element (german) of a shipped
// row: it is the progress key, and a new wording orphans the learner's progress.
//
// Row: [german, english, catIdx, typeIdx, meta]
//   german  speakable sentence (slots filled with their first value)
//   english plain gloss
//   meta.pattern  german with [slot] brackets; meta.slots [{value, alts}]
//   meta.cue      English front for the en→de direction
//   meta.tracks   Hören & Sprechen A1 audio track numbers ([] = not in audio)
//   meta.alts     other accepted whole-sentence wordings
//   meta.turns    Q — A dialogue turns; meta.turnAlts per-turn alternatives
//   meta.formal   'du' | 'Sie' | 'ihr'; meta.partner = german of the du/Sie twin
//   meta.note     grammar trap {rule, example}; meta.also everyday alternative {text, note}
//   meta.listenOnly  announcement: learn de→en only, no exercises/reviews
//   meta.source   'audio' (doc) | 'extra' (doc §19, not in audio) | 'schritte' (moved from Schritte A1)
//   meta.lektion  Schritte A1 Lektion(s) the pattern also appears in

export type PatternSlot = { value: string; alts: string[] };
export type PatternMeta = {
  pattern: string; tracks: number[]; cue: string;
  slots?: PatternSlot[]; alts?: string[]; turns?: string[]; turnAlts?: string[][];
  formal?: 'du' | 'Sie' | 'ihr'; partner?: string;
  note?: { rule: string; example: string }; also?: { text: string; note: string };
  listenOnly?: boolean; source: 'audio' | 'extra' | 'schritte'; lektion?: number[];
};
export type PatternRow = [string, string, number, number, PatternMeta];

export const PATTERN_LISTEN_ONLY_CAT = ${LISTEN_ONLY_CAT};
// Batch order: everyday basics first, listen-only announcements last.
export const PATTERN_LEARN_ORDER = ${JSON.stringify(LEARN_ORDER)};

export const VOCAB_PATTERNS_DATA = {
  cats: ${JSON.stringify(CATS, null, 4).replace(/\n\]/, '\n  ]')},
  types: ${JSON.stringify(TYPES)},
  words: [
${list.map(row).join('\n')}
  ] as PatternRow[],
  // Batches are auto-generated below.
  batches: [] as number[][],
};

// Build batches: per situation in PATTERN_LEARN_ORDER, even groups of 6–8
// (k = ceil(n/8) groups), never splitting a du/Sie pair across batches.
(function buildBatches() {
  var words = VOCAB_PATTERNS_DATA.words;
  var byCat: {[k: number]: number[]} = {};
  words.forEach(function(w, i) { (byCat[w[2]] = byCat[w[2]] || []).push(i); });
  var batches: number[][] = [];
  PATTERN_LEARN_ORDER.forEach(function(ci) {
    var idx = byCat[ci] || [];
    if (!idx.length) return;
    var k = Math.ceil(idx.length / 8);
    var start = 0, made = 0;
    while (start < idx.length) {
      // Size of this batch = remaining words spread over remaining batches.
      var left = Math.max(1, k - made);
      var end = Math.min(start + Math.ceil((idx.length - start) / left), idx.length);
      made++;
      // Keep a du/Sie twin in the same batch as its partner.
      if (end < idx.length && words[idx[end]][4].partner === words[idx[end - 1]][0]) end++;
      batches.push(idx.slice(start, end));
      start = end;
    }
  });
  VOCAB_PATTERNS_DATA.batches = batches;
})();

// german -> index, and the du/Sie twin of a row (or -1).
var PATTERN_INDEX: {[k: string]: number} = {};
VOCAB_PATTERNS_DATA.words.forEach(function(w, i) { PATTERN_INDEX[w[0]] = i; });
export function patternPartner(wi: number): number {
  var p = VOCAB_PATTERNS_DATA.words[wi] && VOCAB_PATTERNS_DATA.words[wi][4].partner;
  return p && PATTERN_INDEX[p] !== undefined ? PATTERN_INDEX[p] : -1;
}
`;
  fs.writeFileSync(OUT, ts);
  const keys = Object.keys(migration).sort();
  const mig = `// One-time progress migration (2026-10-20): sentence/interjection rows moved
// from Schritte A1 into the Hören & Sprechen A1 patterns course. Maps the old
// Schritte progress key (lowercased) to the patterns german (progress key is
// its lowercase). Several old keys can point at one pattern (merged duplicates).
// GENERATED by scripts/build-patterns-data.mjs.
export const A11_TO_PATTERNS: {[a11Key: string]: string} = {
${keys.map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(migration[k]) + ',').join('\n')}
};
`;
  fs.writeFileSync(OUT_MIG, mig);
}

// ---------- main ----------
const xmlPath = process.argv[2];
if (!xmlPath) { console.error('usage: node scripts/build-patterns-data.mjs <word/document.xml>'); process.exit(1); }
buildFromDocx(readDocx(xmlPath));
const docCount = cards.length;
mergeA11(loadA11Rows());
const list = ordered();
writeOut(list);

const perCat = CATS.map((n, i) => `${i} ${n}: ${list.filter(c => c.cat === i).length}`);
const perType = TYPES.map((n, i) => `${n}: ${list.filter(c => c.type === i).length}`);
console.log(`\nDoc cards: ${docCount}, Schritte merged into doc cards: ${report.merged.length}, new from Schritte: ${report.newFromA11}, total: ${list.length}`);
console.log('Per situation:\n  ' + perCat.join('\n  '));
console.log('Per type: ' + perType.join(', '));
console.log('Pairs (du/Sie): ' + list.filter(c => c.meta.partner).length / 2);
console.log('\nInline " / " alternatives NOT covered by INLINE_OVERRIDES (fix these):'); report.inline.filter(x => !Object.values(INLINE_OVERRIDES).includes(x)).forEach(x => console.log('  ' + x));
console.log('\nUnmatched grammar notes:'); report.unmatchedNotes.forEach(x => console.log('  ' + x));
console.log('Unmatched everyday alternatives:'); report.unmatchedAlso.forEach(x => console.log('  ' + x));
console.log('Cues still needing EN_OVERRIDES (" / " or unfilled … with a slot value):');
list.filter(c => !EN_OVERRIDES[c.de] && (/ \/ /.test(c.meta.cue) || (/…/.test(c.meta.cue) && (c.meta.slots || []).some(x => x.value))))
  .forEach(c => console.log('  ' + JSON.stringify(c.de) + ': ' + JSON.stringify(c.meta.cue) + ','));
console.log('Rows > 160 chars:'); report.long.forEach(x => console.log('  ' + x));
console.log('\nSchritte rows merged into doc cards:'); report.merged.forEach(x => console.log('  ' + x));
