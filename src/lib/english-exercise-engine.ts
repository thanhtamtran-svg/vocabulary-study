import { SUPABASE_URL } from './supabase';
import { ENGLISH_SENTENCE_TEMPLATES } from './english-constants';
import { getMemoryStage } from './memory-stages';
import { parseDate } from './dates';

// Select words for exercise: prioritize mistakes, then due, then new
export function selectExerciseWords(progress, exerciseProgress, words, today) {
  var learned = [];
  Object.keys(progress).forEach(function(k) {
    if (progress[k] && progress[k].learned) {
      var wi = parseInt(k);
      var w = words[wi];
      var ep = exerciseProgress[wi] || {};
      var stage = getMemoryStage(progress[k]);
      var nextReview = ep.nextReview ? parseDate(ep.nextReview) : new Date(0);
      var isDue = today >= nextReview;
      var accuracy = ep.attempts > 0 ? ep.correct / ep.attempts : null;
      var isWeak = accuracy !== null && accuracy < 0.6;
      var neverPracticed = !ep.attempts;

      var priority = 0;
      if (isWeak) priority = 200 + (1 - (accuracy || 0)) * 100;
      else if (isDue) priority = 100 + (5 - stage) * 15;
      else if (neverPracticed) priority = 50 + (5 - stage) * 5;
      else priority = Math.max(0, 20 - (ep.streak || 0) * 3);

      learned.push({
        wi: wi, stage: stage, type: w[3], cat: w[2],
        confidence: progress[k].confidence || 0,
        streak: ep.streak || 0, isDue: isDue,
        isWeak: isWeak, neverPracticed: neverPracticed,
        accuracy: accuracy, priority: priority
      });
    }
  });
  if (learned.length < 5) return null;

  learned.sort(function(a, b) { return b.priority - a.priority; });

  var candidates = learned.slice(0, Math.min(30, learned.length));
  var selected = [];
  var usedTypes = {};
  for (var i = 0; i < candidates.length && selected.length < 6; i++) {
    var t = candidates[i].type;
    if (!usedTypes[t] || Object.keys(usedTypes).length >= 5) {
      selected.push(candidates[i]);
      usedTypes[t] = true;
      candidates.splice(i, 1);
      i--;
    }
  }
  for (var i = 0; i < candidates.length && selected.length < 6; i++) {
    selected.push(candidates[i]);
  }
  for (var i = selected.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = selected[i]; selected[i] = selected[j]; selected[j] = tmp;
  }
  return selected;
}

// Generate distractors for multiple choice (same type preferred)
export function getDistractors(targetWi, count, progress, words) {
  var targetWord = words[targetWi];
  var targetType = targetWord[3];
  var targetCat = targetWord[2];
  var all = [];
  Object.keys(progress).forEach(function(k) {
    var wi = parseInt(k);
    if (wi !== targetWi && progress[k] && progress[k].learned) {
      // Prefer same type, then same category for harder distractors
      var sameType = words[wi][3] === targetType;
      var sameCat = words[wi][2] === targetCat;
      all.push({wi: wi, score: (sameType ? 2 : 0) + (sameCat ? 1 : 0)});
    }
  });
  all.sort(function(a, b) { return b.score - a.score; });
  var result = [];
  for (var i = 0; i < all.length && result.length < count; i++) {
    result.push(all[i].wi);
  }
  for (var i = result.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = result[i]; result[i] = result[j]; result[j] = tmp;
  }
  return result;
}

// Make options: show definitions, pick correct one
export function makeDefinitionOptions(targetWi, targetText, distractorCount, progress, words) {
  var dists = getDistractors(targetWi, distractorCount, progress, words);
  var opts = dists.map(function(di) { return {wi: di, text: words[di][1]}; });
  opts.push({wi: targetWi, text: targetText});
  for (var i = opts.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
  }
  return opts;
}

// Make options: show phrases, pick correct one
export function makePhraseOptions(targetWi, targetText, progress, words) {
  var dists = getDistractors(targetWi, 3, progress, words);
  var opts = dists.map(function(di) { return {wi: di, text: words[di][0]}; });
  opts.push({wi: targetWi, text: targetText});
  for (var i = opts.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
  }
  return opts;
}

// Get AI sentence for a phrase, or fall back to template
export function getAiSentence(w, wordType, aiSentences) {
  var wordKey = w.german.toLowerCase();
  var aiSents = aiSentences && aiSentences[wordKey] ? aiSentences[wordKey].sentences : null;
  if (aiSents && aiSents.length > 0) {
    var pick = aiSents[Math.floor(Math.random() * aiSents.length)];
    // Try to blank out the phrase in the sentence
    var phrase = w.german;
    var regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(pick.de)) {
      return {template: pick.de.replace(regex, '___'), full: pick.de, ai: true};
    }
    // Try without "something/somebody" placeholders
    var simplified = phrase.replace(/\s*(somebody|something|sb|sth|one's)\s*/gi, ' ').trim();
    if (simplified.length > 3) {
      var simpleRegex = new RegExp(simplified.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (simpleRegex.test(pick.de)) {
        return {template: pick.de.replace(simpleRegex, '___'), full: pick.de, ai: true};
      }
    }
    // Can't blank it out — still use the sentence as context
    return {template: '___', full: pick.de, ai: true};
  }
  var templates = ENGLISH_SENTENCE_TEMPLATES[wordType] || ENGLISH_SENTENCE_TEMPLATES[0];
  var t = templates[Math.floor(Math.random() * templates.length)];
  return {template: t, full: t.replace('___', w.german), ai: false};
}

// Generate exercise items for English IELTS vocabulary
export function generateExerciseItems(selectedWords, aiSentences, aiPassage, getWord, words, exerciseProgress, progress) {
  var items = [];

  selectedWords.forEach(function(sw) {
    var wi = sw.wi;
    var w = getWord(wi);
    var wordType = words[wi][3];
    var ep = exerciseProgress[wi] || {};
    var isStrong = ep.streak >= 4;
    var sent = getAiSentence(w, wordType, aiSentences);

    // === ROUND 1 (Remember): Definition → Phrase recall ===
    if (isStrong && Math.random() > 0.5) {
      // Reverse: see definition, pick the phrase
      var revOpts = makePhraseOptions(wi, w.german, progress, words);
      items.push({
        type: 'reverse_choice', level: 'Remember', wordIdx: wi,
        prompt: 'Which phrase means "' + w.english + '"?',
        options: revOpts, correctAnswer: w.german,
        germanWord: w.german, wordInfo: w
      });
    } else if (isStrong && Math.random() > 0.3) {
      // Listening: hear the phrase, pick the definition
      items.push({
        type: 'listening', level: 'Remember', wordIdx: wi,
        prompt: 'Listen and choose the correct definition:',
        options: makeDefinitionOptions(wi, w.english, 3, progress, words), correctAnswer: w.english,
        germanWord: w.german, wordInfo: w
      });
    } else {
      // Multiple choice: see phrase, pick definition
      items.push({
        type: 'multiple_choice', level: 'Remember', wordIdx: wi,
        prompt: 'What does "' + w.german + '" mean?',
        options: makeDefinitionOptions(wi, w.english, 3, progress, words), correctAnswer: w.english,
        germanWord: w.german, wordInfo: w
      });
    }

    // === ROUND 2 (Understand): Contextual usage ===
    if (isStrong && Math.random() > 0.5 && sent.ai) {
      // See a sentence with the phrase, identify its meaning
      items.push({
        type: 'fill_english', level: 'Understand', wordIdx: wi,
        prompt: 'What does "' + w.german + '" mean in this sentence?\n' + sent.full,
        correctAnswer: w.english.toLowerCase(),
        fullAnswer: w.english,
        sentence: sent.full,
        germanWord: w.german, wordInfo: w
      });
    } else {
      // Type the phrase from its definition
      items.push({
        type: 'fill_blank', level: 'Understand', wordIdx: wi,
        prompt: 'Type the phrase that means:\n' + w.english,
        correctAnswer: w.german.toLowerCase().replace(/\s*(somebody|something|sb|sth)\s*/gi, '').trim(),
        fullAnswer: w.german, germanWord: w.german, wordInfo: w
      });
    }

    // === ROUND 3 (Apply): Use in context ===
    items.push({
      type: 'sentence_complete', level: 'Apply', wordIdx: wi,
      prompt: sent.ai ? sent.template : sent.template.replace('___', '______'),
      hint: w.english,
      correctAnswer: w.german.toLowerCase().replace(/\s*(somebody|something|sb|sth)\s*/gi, '').trim(),
      fullAnswer: w.german, sentence: sent.full,
      germanWord: w.german, wordInfo: w
    });
  });

  // Round 4 (Analyze): Reading comprehension with IELTS-style passage
  if (aiPassage) {
    try {
      var passage = typeof aiPassage === 'string' ? JSON.parse(aiPassage) : aiPassage;
      if (passage && passage.text) {
        var firstWord = selectedWords[0] ? getWord(selectedWords[0].wi) : {german:'', wordInfo:{}};

        var topicOpts;
        var promptText;
        var correctText;

        if (passage.question && passage.options && Array.isArray(passage.options) && passage.options.length >= 4) {
          promptText = passage.question;
          var aiOpts = passage.options.slice(0, 4);
          var correctOpt = aiOpts.find(function(o) { return o.correct; });
          correctText = correctOpt ? correctOpt.text : aiOpts[0].text;
          topicOpts = aiOpts.map(function(o, i) {
            return {text: o.text, isCorrect: !!o.correct, wi: -(10 + i)};
          });
        } else {
          promptText = 'What is the main point of this passage?';
          correctText = (passage.text || '').split('.')[0].trim().substring(0, 80);
          topicOpts = [{text: correctText, isCorrect: true, wi: -10}];
        }

        for (var i = topicOpts.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = topicOpts[i]; topicOpts[i] = topicOpts[j]; topicOpts[j] = tmp;
        }

        items.push({
          type: 'reading_comprehension', level: 'Analyze', wordIdx: selectedWords[0] ? selectedWords[0].wi : 0,
          prompt: promptText,
          passage: passage.text,
          passageTitle: passage.title || 'Reading',
          passageTranslation: '',
          options: topicOpts,
          correctIdx: topicOpts.findIndex(function(o) { return o.isCorrect; }),
          correctAnswer: correctText,
          germanWord: firstWord.german,
          wordInfo: firstWord
        });
      }
    } catch(e) { console.warn('Failed to parse passage:', e); }
  }

  // Interleave rounds
  var round1 = items.filter(function(it) { return it.level === 'Remember'; });
  var round2 = items.filter(function(it) { return it.level === 'Understand'; });
  var round3 = items.filter(function(it) { return it.level === 'Apply'; });
  var round4 = items.filter(function(it) { return it.level === 'Analyze'; });
  [round1, round2, round3, round4].forEach(function(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  });

  return round1.concat(round2).concat(round3).concat(round4);
}

// Fetch AI sentences for English phrases
export async function fetchExerciseSentences(selectedWords, getWord) {
  var wordsPayload = selectedWords.map(function(sw) {
    var w = getWord(sw.wi);
    return {german: w.german, english: w.english, type: w.type, category: w.cat};
  });

  try {
    var response = await fetch(SUPABASE_URL + '/functions/v1/generate-sentences', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({words: wordsPayload, lang: 'en'})
    });
    if (!response.ok) return null;
    var result = await response.json();
    return result.data || null;
  } catch(e) {
    console.warn('Failed to fetch AI sentences:', e);
    return null;
  }
}
