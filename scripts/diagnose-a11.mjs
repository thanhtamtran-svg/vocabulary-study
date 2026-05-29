import fs from 'fs';

const cloud = JSON.parse(fs.readFileSync('cloud-a11.json','utf8')).data;
const src = fs.readFileSync('src/vocab-a11-data.ts','utf8');

const wordsStart = src.indexOf('words: [');
const wordsEnd = src.indexOf('],\n  // Batches');
const wordsBlock = src.substring(wordsStart, wordsEnd);

// Use a simpler line-by-line parser
const words = [];
for (const line of wordsBlock.split('\n')) {
  const m = line.match(/^\s*\["((?:[^"\\]|\\.)*)","((?:[^"\\]|\\.)*)",(\d+),(\d+)\]/);
  if (m) words.push([m[1], m[2], parseInt(m[3]), parseInt(m[4])]);
}
console.log('Parsed', words.length, 'words');

// Reproduce batch-building from vocab-a11-data.ts
const anweisungen = [], byCat = {};
words.forEach((w, i) => {
  const ci = w[2];
  if (ci === 0) { anweisungen.push(i); return; }
  if (!byCat[ci]) byCat[ci] = [];
  byCat[ci].push(i);
});
const batches = [];
Object.keys(byCat).sort((a,b) => +a - +b).forEach(ci => {
  const indices = byCat[+ci];
  for (let i = 0; i < indices.length; i += 8) batches.push(indices.slice(i, i+8));
});
anweisungen.forEach((wi, k) => { if (batches[k]) batches[k].push(wi); });
console.log('Built', batches.length, 'batches');

const progress = cloud.progress || {};
const isLearned = (wi) => {
  const key = String(words[wi][0]).toLowerCase().trim();
  return progress[key]?.learned;
};

let firstIncomplete = -1;
const incompleteList = [];
for (let i = 0; i < batches.length; i++) {
  const total = batches[i].length;
  const learnedCount = batches[i].filter(isLearned).length;
  if (learnedCount < total) {
    if (firstIncomplete === -1) firstIncomplete = i;
    incompleteList.push({
      batch: i+1,
      learned: learnedCount,
      total,
      missing: batches[i].filter(wi => !isLearned(wi)).map(wi => words[wi][0])
    });
  }
}

console.log('');
console.log('===== DIAGNOSIS =====');
console.log('First incomplete batch:', firstIncomplete + 1);
console.log('batchesCompleted (current code):', firstIncomplete);
console.log('Fully-learned batches anywhere:', batches.length - incompleteList.length);
console.log('Total learned words:', batches.flat().filter(isLearned).length);
console.log('');
console.log('===== INCOMPLETE BATCHES (first 20) =====');
incompleteList.slice(0,20).forEach(x => {
  console.log('Batch', String(x.batch).padStart(3), '-', x.learned + '/' + x.total, 'learned. Missing:', x.missing.join(', '));
});
