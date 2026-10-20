// Exercise items for the Hören & Sprechen A1 sentence-pattern course.
//
// Same session rules as the word courses (exercise-core: ~10 items, one per
// pattern, wrong -> comes back 3–5 questions later, first attempt drives the
// schedule). What changes is the ladder, modelled on chunk-based practice
// (receptive -> structured production -> free production):
//   new     -> pick the German for a situation, or listen and pick the meaning
//   medium  -> fill the one swappable slot, or rebuild the sentence from chunks
//   strong  -> du<->Sie switch, answer the dialogue, swap the slot, or say the
//              whole sentence from the English cue
//   newest 2 -> free sentence for the situation, checked by AI (kind 'pattern')
// Formula rows (Aha!, Gute Besserung!) have nothing to rearrange: choice,
// listening and typing only.
import { selectExerciseWords } from './exercise-engine';
import {
  wordStrength, makeChoiceOptions, pickSentenceWords, writeSentenceItem, orderSession
} from './exercise-core';

export { selectExerciseWords };

var FORMULA_TYPE = 5;
var DIALOGUE_TYPE = 3;
var FORMAL_NAME = { du: 'informal (du)', Sie: 'formal (Sie)', ihr: 'plural (ihr)' };

function keyOf(w) { return String(w[0]).toLowerCase().trim(); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
function canonical(p) {
  return String(p).replace(/\[([^\]]*)\]/g, function(_, inner) { return inner.split(' / ')[0].trim(); })
    .replace(/\s+([,.?!])/g, '$1').replace(/\s+/g, ' ').trim();
}
function cueText(meta, w) { return String(meta.cue || w.english).replace(/[[\]]/g, ''); }

// Index of the du/Sie twin, or -1.
function partnerIndex(words, meta) {
  if (!meta || !meta.partner) return -1;
  for (var i = 0; i < words.length; i++) if (words[i][0] === meta.partner) return i;
  return -1;
}

// --- item builders -----------------------------------------------------------

function base(wi, w, type, level, extra) {
  return Object.assign({ type: type, level: level, wordIdx: wi, germanWord: w.german, wordInfo: w, isPattern: true }, extra);
}

function choiceItem(wi, w, meta, learned, words, partner) {
  var pool = partner >= 0 ? learned.filter(function(x) { return x !== partner; }) : learned;
  var formula = words[wi][3] === FORMULA_TYPE;
  return base(wi, w, 'multiple_choice', 'Remember', {
    prompt: (formula ? 'What do you say? ' : 'Which German sentence fits? ') + '“' + cueText(meta, w) + '”',
    options: makeChoiceOptions(wi, w.german, pool, words, 0),
    correctAnswer: w.german
  });
}

function listeningItem(wi, w, learned, words, partner) {
  // Twins share a gloss; keep the partner out so two options aren't equal.
  var pool = partner >= 0 ? learned.filter(function(x) { return x !== partner; }) : learned;
  return base(wi, w, 'listening', 'Remember', {
    prompt: 'Listen and choose the meaning:',
    options: makeChoiceOptions(wi, w.english, pool, words, 1),
    correctAnswer: w.english
  });
}

// Fill ONE slot that has a value; everything else in the sentence is known.
function slotFillItem(wi, w, meta) {
  var slots = meta.slots || [];
  var gloss = String(w.english).toLowerCase();
  var choices = [];
  // Names and numbers read the same in English ("Hi, this is Jakob."):
  // the hint would give them away, so those slots are never blanked.
  slots.forEach(function(s, i) { if (s.value && gloss.indexOf(s.value.toLowerCase()) === -1) choices.push(i); });
  if (!choices.length) return null;
  var si = pick(choices), n = -1;
  var shown = String(meta.pattern).replace(/\[([^\]]*)\]/g, function(m, inner) {
    n++;
    return n === si ? '______' : inner.split(' / ')[0].trim();
  });
  return base(wi, w, 'fill_blank', 'Understand', {
    prompt: 'Fill the gap: ' + shown,
    hint: w.english,
    correctAnswer: slots[si].value,
    accepted: [slots[si].value].concat(slots[si].alts || []),
    sentence: w.german
  });
}

// Chunks of one turn (slot values stay one chunk), shuffled out of order.
export function orderChunks(pattern) {
  var turns = String(pattern).split(/\s+—\s+/);
  var turn = turns.reduce(function(a, b) { return b.length > a.length ? b : a; });
  var chunks = [];
  var re = /\[([^\]]*)\]|(\S+)/g, m;
  while ((m = re.exec(turn)) !== null) {
    if (m[1] !== undefined) {
      var v = m[1].split(' / ')[0].trim();
      // "[…]" placeholder has no value: a "…" chip would only confuse.
      if (v && v !== '…') chunks.push(v);
    } else if (m[2] !== '…' && m[2] !== '...') chunks.push(m[2]);
  }
  // Punctuation glued to the slot ("[Tim]." -> "Tim" + "."): attach it back.
  var merged = [];
  chunks.forEach(function(c) {
    if (/^[.,?!:;]+$/.test(c) && merged.length) merged[merged.length - 1] += c;
    else merged.push(c);
  });
  return { answer: merged.join(' '), chunks: merged };
}

function wordOrderItem(wi, w, meta) {
  var oc = orderChunks(meta.pattern || w.german);
  if (oc.chunks.length < 3 || oc.chunks.length > 12) return null;
  var shuffled = oc.chunks.slice();
  for (var tries = 0; tries < 5 && shuffled.join(' ') === oc.answer; tries++) shuffle(shuffled);
  if (shuffled.join(' ') === oc.answer) shuffled.reverse();
  return base(wi, w, 'word_order', 'Understand', {
    prompt: 'Put the words in order: “' + cueText(meta, w) + '”',
    chunks: shuffled,
    correctAnswer: oc.answer,
    accepted: [oc.answer],
    fullAnswer: oc.answer,
    // Dialogues: the rebuilt turn, then the whole exchange underneath.
    sentence: w.german !== oc.answer ? w.german : null
  });
}

function duSieItem(wi, w, meta, words, partner) {
  if (partner < 0) return null;
  var pm = words[partner][4] || {};
  var target = FORMAL_NAME[pm.formal] || 'the other form';
  return base(wi, w, 'fill_blank', 'Apply', {
    prompt: 'Switch to ' + target + ': ' + w.german,
    hint: cueText(meta, w),
    correctAnswer: words[partner][0],
    accepted: [words[partner][0]].concat(pm.alts || []),
    fullAnswer: words[partner][0],
    sentence: null
  });
}

function replyItem(wi, w, meta) {
  if (!meta.turns || meta.turns.length < 2) return null;
  var cueTurns = String(cueText(meta, w)).split(/\s+—\s+/);
  return base(wi, w, 'fill_blank', 'Apply', {
    prompt: 'Answer in German: ' + meta.turns[0],
    hint: cueTurns[1] || w.english,
    correctAnswer: meta.turns[1],
    accepted: [meta.turns[1]].concat((meta.turnAlts && meta.turnAlts[1]) || []),
    fullAnswer: meta.turns[1],
    sentence: w.german
  });
}

function substituteItem(wi, w, meta) {
  var slots = meta.slots || [];
  var choices = [];
  slots.forEach(function(s, i) { (s.alts || []).forEach(function(a) { if (a && a !== '…') choices.push([i, a]); }); });
  if (!choices.length) return null;
  var c = pick(choices), n = -1;
  var answer = canonical(String(meta.pattern).replace(/\[([^\]]*)\]/g, function(m) {
    n++;
    return n === c[0] ? c[1] : m;
  }));
  // Only the first turn is the frame being changed.
  var answerTurn = answer.split(/\s+—\s+/)[0];
  var givenTurn = w.german.split(/\s+—\s+/)[0];
  return base(wi, w, 'fill_blank', 'Apply', {
    prompt: 'Say it with “' + c[1] + '”: ' + givenTurn,
    hint: 'Change only the swappable part.',
    correctAnswer: answerTurn,
    accepted: [answerTurn],
    fullAnswer: answerTurn,
    sentence: null
  });
}

function sayItItem(wi, w, meta) {
  return base(wi, w, 'fill_blank', 'Apply', {
    prompt: 'Say it in German: “' + cueText(meta, w) + '”',
    hint: meta.formal ? FORMAL_NAME[meta.formal] : null,
    correctAnswer: w.german,
    accepted: [w.german].concat(meta.alts || []),
    fullAnswer: w.german,
    sentence: null
  });
}

function patternItem(wi, w, ep, learned, words) {
  var meta = w.meta || {};
  var partner = partnerIndex(words, meta);
  var strength = wordStrength(ep);
  var formula = words[wi][3] === FORMULA_TYPE;
  if (strength === 'new') {
    return Math.random() < 0.3 ? listeningItem(wi, w, learned, words, partner) : choiceItem(wi, w, meta, learned, words, partner);
  }
  if (formula) return strength === 'strong' ? sayItItem(wi, w, meta) : choiceItem(wi, w, meta, learned, words, partner);
  if (strength === 'medium') {
    var fill = slotFillItem(wi, w, meta), order = wordOrderItem(wi, w, meta);
    if (fill && order) return Math.random() < 0.5 ? fill : order;
    return fill || order || choiceItem(wi, w, meta, learned, words, partner);
  }
  var strong = [duSieItem(wi, w, meta, words, partner),
    words[wi][3] === DIALOGUE_TYPE ? replyItem(wi, w, meta) : null,
    substituteItem(wi, w, meta)].filter(Boolean);
  // Saying the whole sentence is always available; weight it like one option.
  strong.push(sayItItem(wi, w, meta));
  return pick(strong);
}

function patternSentenceItem(wi, w, words) {
  var meta = w.meta || {};
  var item: any = writeSentenceItem(wi, w, w.german, null);
  item.prompt = words[wi][3] === FORMULA_TYPE
    ? 'Write a short exchange (2 lines) where someone says “' + w.german + '”.'
    : 'Situation: “' + cueText(meta, w) + '” — write it in German, in your own words.';
  item.isPattern = true;
  item.kind = 'pattern';
  item.sentence = w.german; // shown after checking as the model answer
  return item;
}

// selected: from selectExerciseWords. Returns ordered items.
export function generatePatternItems(selected, getWord, words, exerciseProgress, progress, excludeCats) {
  var learned = [];
  for (var wi = 0; wi < words.length; wi++) {
    var wp = progress[keyOf(words[wi])];
    if (!wp || !wp.learned) continue;
    if (excludeCats && excludeCats.indexOf(words[wi][2]) !== -1) continue;
    learned.push(wi);
  }
  var main = selected.map(function(sw) {
    var w = getWord(sw.wi);
    return patternItem(sw.wi, w, exerciseProgress[keyOf(words[sw.wi])], learned, words);
  });
  var sentences = pickSentenceWords(selected).map(function(wi2) { return patternSentenceItem(wi2, getWord(wi2), words); });
  return orderSession(main, sentences, []);
}
