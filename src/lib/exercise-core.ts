// Language-agnostic exercise rules shared by the German and English engines.
//
// Design (agreed with the PM 2026-10-16, based on retrieval-practice research):
// - ~10 words per session, ONE item per word, difficulty matched to the word:
//   new/weak → recognise (multiple choice), medium → recall (type it),
//   strong → use it in a sentence.
// - Correct on the first try → done for today. Wrong → the word comes back
//   3–5 questions later until answered correctly once (capped).
// - Weak/strong is judged on the last 5 answers, not the whole history, so
//   one bad early week doesn't keep a word in every session forever.
// - Distractors are random learned words from the same Lektion/topic first,
//   re-drawn every time.
// - The newest words also get a "write your own sentence" task, checked and
//   corrected by AI.

export var SESSION_WORDS = 10;
export var SENTENCE_TASKS_PER_SESSION = 2;
export var RECENT_WINDOW = 5;
var MAX_ATTEMPTS = 3;               // first try + 2 retries
var MAX_SENTENCE_ATTEMPTS = 2;      // AI-checked, so keep cost bounded
var WEAK_ACCURACY = 0.6;

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

// Accuracy over the last RECENT_WINDOW answers. Records from before
// `recent` existed fall back to lifetime accuracy, but only while the
// current streak is 0 — a word answered right last time isn't "weak".
export function recentAccuracy(ep) {
  if (!ep || !ep.attempts) return null;
  if (ep.recent && ep.recent.length) {
    var sum = 0;
    ep.recent.forEach(function(r) { sum += r ? 1 : 0; });
    return sum / ep.recent.length;
  }
  if ((ep.streak || 0) > 0) return null;
  return ep.correct / ep.attempts;
}

export function isWeak(ep) {
  var acc = recentAccuracy(ep);
  return acc !== null && acc < WEAK_ACCURACY;
}

// 'new' → recognition, 'medium' → typed recall, 'strong' → use in context
export function wordStrength(ep) {
  if (!ep || !ep.attempts || isWeak(ep)) return 'new';
  if ((ep.streak || 0) >= 3) return 'strong';
  return 'medium';
}

// entries: [{wi, ep, stage, type, cat, isDue}] for every learned, eligible word.
// todayKey: 'YYYY-MM-DD'. Returns up to `count` entries, or null if < 5 learned.
export function selectSessionWords(entries, todayKey, count) {
  if (entries.length < 5) return null;
  count = count || SESSION_WORDS;

  // Answered correctly today already → done for today (unless that would
  // leave too few words to run a session at all).
  var fresh = entries.filter(function(e) {
    var ep = e.ep || {};
    var lastOk = ep.recent && ep.recent.length ? ep.recent[ep.recent.length - 1] : (ep.streak || 0) > 0;
    return !(ep.lastExercise === todayKey && lastOk);
  });
  var pool = fresh.length >= 5 ? fresh : entries;

  pool.forEach(function(e) {
    var ep = e.ep || {};
    var acc = recentAccuracy(ep);
    var weak = acc !== null && acc < WEAK_ACCURACY;
    e.isWeak = weak;
    e.neverPracticed = !ep.attempts;
    e.streak = ep.streak || 0;
    if (weak) e.priority = 200 + (1 - acc) * 100;                 // 200-300
    else if (e.isDue) e.priority = 100 + (5 - e.stage) * 15;      // 100-175
    else if (e.neverPracticed) e.priority = 50 + (5 - e.stage) * 5; // 50-75
    else e.priority = Math.max(0, 20 - e.streak * 3);             // 0-20
    e.priority += Math.random(); // break ties differently each session
  });
  pool.sort(function(a, b) { return b.priority - a.priority; });

  // Take top candidates, keeping word types mixed
  var candidates = pool.slice(0, Math.min(40, pool.length));
  var selected = [];
  var usedTypes = {};
  for (var i = 0; i < candidates.length && selected.length < count; i++) {
    var t = candidates[i].type;
    if (!usedTypes[t] || Object.keys(usedTypes).length >= 5) {
      selected.push(candidates[i]);
      usedTypes[t] = true;
      candidates.splice(i, 1);
      i--;
    }
  }
  for (var k = 0; k < candidates.length && selected.length < count; k++) {
    selected.push(candidates[k]);
  }
  return shuffle(selected);
}

// Random distractor word indices: same Lektion/topic first, then same word
// type, then anything learned. Skips words whose shown text equals the
// target's (two words can share a meaning).
export function pickDistractors(targetWi, count, learnedWis, words, textCol) {
  var target = words[targetWi];
  var targetText = String(target[textCol]).toLowerCase().trim();
  var seen = {};
  seen[targetText] = true;
  var sameCat = [], sameType = [], rest = [];
  learnedWis.forEach(function(wi) {
    if (wi === targetWi) return;
    var w = words[wi];
    if (w[2] === target[2]) sameCat.push(wi);
    else if (w[3] === target[3]) sameType.push(wi);
    else rest.push(wi);
  });
  var ordered = shuffle(sameCat).concat(shuffle(sameType), shuffle(rest));
  var result = [];
  for (var i = 0; i < ordered.length && result.length < count; i++) {
    var text = String(words[ordered[i]][textCol]).toLowerCase().trim();
    if (seen[text]) continue;
    seen[text] = true;
    result.push(ordered[i]);
  }
  return result;
}

// 4 shuffled options {wi, text}: the target plus 3 distractors.
export function makeChoiceOptions(targetWi, targetText, learnedWis, words, textCol, display) {
  var show = display || function(s) { return s; };
  var opts = pickDistractors(targetWi, 3, learnedWis, words, textCol).map(function(di) {
    return {wi: di, text: show(words[di][textCol])};
  });
  opts.push({wi: targetWi, text: show(targetText)});
  return shuffle(opts);
}

// The newest words in this session get a "write your own sentence" task.
export function pickSentenceWords(selectedWords) {
  return selectedWords.slice().sort(function(a, b) {
    if (a.stage !== b.stage) return a.stage - b.stage;
    return (b.neverPracticed ? 1 : 0) - (a.neverPracticed ? 1 : 0);
  }).slice(0, SENTENCE_TASKS_PER_SESSION).map(function(sw) { return sw.wi; });
}

export function writeSentenceItem(wi, w, word, modelSentence) {
  return {
    type: 'write_sentence', level: 'Create', wordIdx: wi,
    prompt: 'Write your own sentence using "' + word + '"',
    hint: w.english,
    targetWord: word,
    // Shown after checking, as one more example.
    sentence: modelSentence || null,
    germanWord: w.german, wordInfo: w
  };
}

// Session order: the per-word items mixed together, then sentence writing,
// then the reading passage.
export function orderSession(mainItems, sentenceItems, readingItems) {
  return shuffle(mainItems.slice()).concat(shuffle(sentenceItems.slice()), readingItems);
}

// Wrong answer → a copy of the item 3–5 questions later, until it is right
// once or the attempt cap is hit. Returns the new items array, or the same
// array when no retry is due.
export function willRetry(item) {
  if (item.type === 'reading_comprehension') return false;
  var cap = item.type === 'write_sentence' ? MAX_SENTENCE_ATTEMPTS : MAX_ATTEMPTS;
  return (item.attempt || 1) < cap;
}

export function scheduleRetry(items, idx, item) {
  if (!willRetry(item)) return items;
  var retry = Object.assign({}, item, {attempt: (item.attempt || 1) + 1, isRetry: true});
  if (retry.options) retry.options = shuffle(retry.options.slice());
  var gap = 3 + Math.floor(Math.random() * 3); // 3, 4 or 5 questions later
  var pos = Math.min(idx + 1 + gap, items.length);
  return items.slice(0, pos).concat([retry], items.slice(pos));
}

// Updated per-word exercise record after a FIRST attempt (retries in the
// same session don't count toward the schedule).
export function nextExerciseRecord(ep, correct, today, addDays, dateKey) {
  ep = ep || {attempts: 0, correct: 0, streak: 0, lastExercise: null, nextReview: null};
  var newStreak = correct ? (ep.streak || 0) + 1 : 0;
  var intervals = [1, 2, 3, 5, 7, 14, 30];
  var nextInterval = intervals[Math.min(newStreak, intervals.length - 1)];
  return Object.assign({}, ep, {
    attempts: (ep.attempts || 0) + 1,
    correct: (ep.correct || 0) + (correct ? 1 : 0),
    streak: newStreak,
    recent: (ep.recent || []).concat([correct ? 1 : 0]).slice(-RECENT_WINDOW),
    lastExercise: dateKey(today),
    nextReview: dateKey(addDays(today, nextInterval))
  });
}
