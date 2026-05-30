// Generate Cowork prompt files for A1.1 missing-image batches.
//
// Reads scripts/a11-missing-words.json (produced by audit-a11-images.mjs),
// groups missing words into batches of 8 (preserving global A1.1 index as
// the filename target), and writes one batch-N.txt per batch into
// C:\Users\ASUS\Documents\Claude\Projects\Image Gen\a11-image-prompts\.
//
// The filename {idx}.png inside each batch refers to the GLOBAL A1.1 word
// index (mirrors the English flow). The upload script later maps
// {idx}.png → VOCAB_A11_DATA.words[idx][0] → lowercase German upload key.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PROMPT_ROOT = 'C:/Users/ASUS/Documents/Claude/Projects/Image Gen/a11-image-prompts';
const BATCH_SIZE = 8;

// Load A1.1 words (need global index)
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

const TYPE_LABELS = ['Noun', 'Verb', 'Adjective', 'Grammar word', 'Phrase/Expression', 'Foundational word'];

// Per-type hint to nudge the model toward a more concrete illustration
function styleHint(typeIdx) {
  switch (typeIdx) {
    case 0: return 'Show the object or thing being described.';
    case 1: return 'Show a character performing the action.';
    case 2: return 'Show a character or object embodying the quality (e.g. contrast big vs small).';
    case 3: return 'Show a simple visual metaphor for this grammar concept.';
    case 4: return 'Depict a scene where someone would naturally say this phrase.';
    case 5: return 'Show a simple visual that captures the concept.';
    default: return '';
  }
}

function buildPrompt(word) {
  const hint = styleHint(word.typeIdx);
  const base =
    'Generate a simple cartoon illustration for the German word "' + word.german +
    '" (meaning: ' + word.english + '). ' +
    'Style requirements: simple cartoon scene on a clean white background, ' +
    'colorful comic style like an educational vocabulary flashcard, exaggerated ' +
    'funny and memorable, the image should help a learner understand and ' +
    'remember the word. ABSOLUTELY NO TEXT no labels no letters no words anywhere in the image.';
  return hint ? base + ' ' + hint : base;
}

const allWords = loadA11Words();
const missing = JSON.parse(readFileSync('scripts/a11-missing-words.json', 'utf-8'));

// Re-derive global indices for the missing words by matching german+english pairs.
// (The audit script wrote the word objects without indices.)
const indexByPair = new Map();
allWords.forEach((w, i) => {
  indexByPair.set(w.german + '|' + w.english, i);
});
const missingWithIdx = missing.map(w => {
  const idx = indexByPair.get(w.german + '|' + w.english);
  return { ...w, globalIdx: idx };
}).filter(w => w.globalIdx !== undefined);

console.log('Missing entries with resolved global index: ' + missingWithIdx.length);

// Group into batches of 8 by SOURCE ORDER (so a batch is a contiguous slice of the
// missing list — keeps batches manageable, doesn't try to align with main batches).
if (!existsSync(PROMPT_ROOT)) mkdirSync(PROMPT_ROOT, { recursive: true });

const batches = [];
for (let i = 0; i < missingWithIdx.length; i += BATCH_SIZE) {
  batches.push(missingWithIdx.slice(i, i + BATCH_SIZE));
}
console.log('Producing ' + batches.length + ' batch files...');

for (let b = 0; b < batches.length; b++) {
  const batchNum = b + 1;
  const items = batches[b];
  const lines = [];
  lines.push('Batch ' + batchNum + ' - Save images to: a11-images/batch-' + batchNum + '/');
  lines.push('');
  for (const item of items) {
    lines.push('--- Image ' + item.globalIdx + '.png ---');
    lines.push('German: ' + item.german);
    lines.push('English: ' + item.english);
    lines.push('Type: ' + (TYPE_LABELS[item.typeIdx] || 'Word'));
    lines.push('Prompt: ' + buildPrompt(item));
    lines.push('');
  }
  const outPath = join(PROMPT_ROOT, 'batch-' + batchNum + '.txt');
  writeFileSync(outPath, lines.join('\n'));
}

console.log('Done. Prompt files written to:');
console.log('  ' + PROMPT_ROOT);
console.log('Total: ' + batches.length + ' files, ' + missingWithIdx.length + ' images.');
