import { SUPABASE_URL } from './supabase';
import { PRONOUNS, PRONOUN_KEYS, SENTENCE_TEMPLATES } from './constants';
import { getMemoryStage } from './memory-stages';
import { parseDate } from './dates';
import { getConjugation } from './conjugations';

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

      // Priority scoring: weak > due > never practiced > strong
      var priority = 0;
      if (isWeak) priority = 200 + (1 - (accuracy || 0)) * 100; // 200-300
      else if (isDue) priority = 100 + (5 - stage) * 15; // 100-175
      else if (neverPracticed) priority = 50 + (5 - stage) * 5; // 50-75
      else priority = Math.max(0, 20 - (ep.streak || 0) * 3); // 0-20

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

  // Sort by priority (highest first)
  learned.sort(function(a, b) { return b.priority - a.priority; });

  // Take top candidates, pick 6 ensuring type diversity
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
  // Shuffle
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
  var all = [];
  Object.keys(progress).forEach(function(k) {
    var wi = parseInt(k);
    if (wi !== targetWi && progress[k] && progress[k].learned) {
      all.push({wi: wi, sameType: words[wi][3] === targetType});
    }
  });
  // Prefer same type
  all.sort(function(a, b) { return (b.sameType ? 1 : 0) - (a.sameType ? 1 : 0); });
  var result = [];
  for (var i = 0; i < all.length && result.length < count; i++) {
    result.push(all[i].wi);
  }
  // Shuffle
  for (var i = result.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = result[i]; result[i] = result[j]; result[j] = tmp;
  }
  return result;
}

// Helper: make shuffled multiple choice options
export function makeOptions(targetWi, targetText, distractorCount, progress, words) {
  var dists = getDistractors(targetWi, distractorCount, progress, words);
  var opts = dists.map(function(di) { return {wi: di, text: words[di][1]}; });
  opts.push({wi: targetWi, text: targetText});
  for (var i = opts.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
  }
  return opts;
}

// Helper: make reverse options (show English, pick German)
export function makeReverseOptions(targetWi, targetText, progress, words) {
  var dists = getDistractors(targetWi, 3, progress, words);
  var opts = dists.map(function(di) { return {wi: di, text: words[di][0]}; });
  opts.push({wi: targetWi, text: targetText});
  for (var i = opts.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
  }
  return opts;
}

// Get AI sentence for a word, or fall back to template
export function getAiSentence(w, wordType, aiSentences) {
  var wordKey = w.german.toLowerCase();
  var aiSents = aiSentences && aiSentences[wordKey] ? aiSentences[wordKey].sentences : null;
  if (aiSents && aiSents.length > 0) {
    var pick = aiSents[Math.floor(Math.random() * aiSents.length)];
    var germanBase = w.german.replace(/^(der|die|das)\s+/i, '');
    var regex = new RegExp('\\b' + germanBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    if (regex.test(pick.de)) {
      return {template: pick.de.replace(regex, '___'), full: pick.de, ai: true};
    }
  }
  var templates = SENTENCE_TEMPLATES[wordType] || SENTENCE_TEMPLATES[5];
  var t = templates[Math.floor(Math.random() * templates.length)];
  return {template: t, full: t.replace('___', w.german), ai: false};
}

// Generate exercise items — varied by word strength
export function generateExerciseItems(selectedWords, aiSentences, aiPassage, getWord, words, exerciseProgress, progress) {
  var items = [];

  selectedWords.forEach(function(sw) {
    var wi = sw.wi;
    var w = getWord(wi);
    var wordType = words[wi][3];
    var ep = exerciseProgress[wi] || {};
    var isWeak = sw.isWeak;
    var isStrong = ep.streak >= 4;
    var sent = getAiSentence(w, wordType, aiSentences);

    // === ROUND 1 (Remember) ===
    if (isStrong && Math.random() > 0.5) {
      var revOpts = makeReverseOptions(wi, w.german, progress, words);
      items.push({
        type: 'reverse_choice', level: 'Remember', wordIdx: wi,
        prompt: 'Which German word means "' + w.english + '"?',
        options: revOpts, correctAnswer: w.german,
        germanWord: w.german, wordInfo: w
      });
    } else if (isStrong && Math.random() > 0.3) {
      items.push({
        type: 'listening', level: 'Remember', wordIdx: wi,
        prompt: 'Listen and choose the correct meaning:',
        options: makeOptions(wi, w.english, 3, progress, words), correctAnswer: w.english,
        germanWord: w.german, wordInfo: w
      });
    } else {
      items.push({
        type: 'multiple_choice', level: 'Remember', wordIdx: wi,
        prompt: 'What does "' + w.german + '" mean?',
        options: makeOptions(wi, w.english, 3, progress, words), correctAnswer: w.english,
        germanWord: w.german, wordInfo: w
      });
    }

    // === ROUND 2 (Understand) ===
    var isVerb = wordType === 1;
    if (isVerb) {
      var conj = getConjugation(w.german);
      var pronIdx = Math.floor(Math.random() * PRONOUNS.length);
      var pronoun = PRONOUNS[pronIdx];
      var pronounKey = PRONOUN_KEYS[pronIdx];
      var conjugated = conj[pronounKey];
      items.push({
        type: 'conjugation', level: 'Understand', wordIdx: wi,
        prompt: 'Conjugate "' + w.german + '" for ' + pronoun + ':',
        pronoun: pronoun,
        pronounKey: pronounKey,
        infinitive: w.german,
        correctAnswer: conjugated,
        fullAnswer: pronoun + ' ' + conjugated,
        fullTable: conj,
        germanWord: w.german, wordInfo: w
      });
    } else if (isStrong && Math.random() > 0.6 && sent.ai) {
      items.push({
        type: 'fill_english', level: 'Understand', wordIdx: wi,
        prompt: 'What does the missing word mean?\n' + sent.template.replace('___', '______'),
        correctAnswer: w.english.toLowerCase(),
        fullAnswer: w.english,
        sentence: sent.full,
        germanWord: w.german, wordInfo: w
      });
    } else {
      items.push({
        type: 'fill_blank', level: 'Understand', wordIdx: wi,
        prompt: 'Type the German word for: ' + w.english,
        correctAnswer: w.german.replace(/^(der|die|das)\s+/i, ''),
        fullAnswer: w.german, germanWord: w.german, wordInfo: w
      });
    }

    // === ROUND 3 (Apply) ===
    var sentCorrectAnswer = w.german.replace(/^(der|die|das)\s+/i, '');
    var sentFullAnswer = w.german;
    var sentPrompt = sent.template.replace('___', '______');
    var sentFull = sent.full;
    if (isVerb && !sent.ai) {
      var verbConj = getConjugation(w.german);
      var templateLower = sent.template.toLowerCase();
      if (templateLower.startsWith('ich ') || templateLower.includes(' ich ')) {
        sentCorrectAnswer = verbConj.ich;
        sentFullAnswer = verbConj.ich;
        sentFull = sent.template.replace('___', verbConj.ich);
      } else if (templateLower.startsWith('wir ') || templateLower.includes(' wir ')) {
        sentCorrectAnswer = verbConj.wir;
        sentFullAnswer = verbConj.wir;
        sentFull = sent.template.replace('___', verbConj.wir);
      } else if (templateLower.startsWith('er') || templateLower.startsWith('sie')) {
        sentCorrectAnswer = verbConj.er;
        sentFullAnswer = verbConj.er;
        sentFull = sent.template.replace('___', verbConj.er);
      } else {
        sentCorrectAnswer = verbConj.ich;
        sentFullAnswer = verbConj.ich;
        sentFull = sent.template.replace('___', verbConj.ich);
      }
    }
    items.push({
      type: 'sentence_complete', level: 'Apply', wordIdx: wi,
      prompt: sentPrompt,
      hint: w.english + (isVerb && !sent.ai ? ' (conjugate!)' : ''),
      correctAnswer: sentCorrectAnswer,
      fullAnswer: sentFullAnswer, sentence: sentFull,
      germanWord: w.german, wordInfo: w
    });
  });

  // Round 4 (Analyze): Reading comprehension
  if (aiPassage) {
    try {
      var passage = typeof aiPassage === 'string' ? JSON.parse(aiPassage) : aiPassage;
      if (passage && passage.text && passage.translation) {
        var firstWord = selectedWords[0] ? getWord(selectedWords[0].wi) : {german:'', wordInfo:{}};

        // Single reading comprehension: "What is this passage mainly about?"
        var allTopicPool = [
          'A day at school', 'Shopping at a store', 'A visit to the doctor',
          'Cooking dinner', 'Traveling by train', 'Playing sports',
          'Working in an office', 'A birthday party', 'Learning to drive',
          'Going to the cinema', 'A trip to the zoo', 'Cleaning the house',
          'Eating at a restaurant', 'Meeting new friends', 'Studying for an exam',
          'Going on vacation', 'A walk in the park', 'Moving to a new city',
          'A job interview', 'Shopping for clothes'
        ];
        // Derive topic keywords from the passage title and first sentence of translation
        var passageHint = ((passage.title || '') + ' ' + (passage.translation || '').split('.')[0]).toLowerCase();
        // Filter out options that are too similar to the real topic
        var filteredTopics = allTopicPool.filter(function(t) {
          var tLower = t.toLowerCase();
          // Remove options that share significant words with the passage
          var tWords = tLower.split(/\s+/);
          for (var tw = 0; tw < tWords.length; tw++) {
            if (tWords[tw].length > 3 && passageHint.indexOf(tWords[tw]) >= 0) return false;
          }
          return true;
        });
        // Shuffle filtered topics
        for (var fi = filteredTopics.length - 1; fi > 0; fi--) {
          var fj = Math.floor(Math.random() * (fi + 1));
          var ftmp = filteredTopics[fi]; filteredTopics[fi] = filteredTopics[fj]; filteredTopics[fj] = ftmp;
        }
        var topicOptions = filteredTopics.slice(0, 4);
        var correctText = passage.translation.split('.')[0].trim().substring(0, 60);
        var correctOpt = {text: correctText, isCorrect: true, wi: -10};
        // Take exactly 3 wrong options
        var wrongOpts = topicOptions.slice(0, 3).map(function(t, i) {
          return {text: t, isCorrect: false, wi: -(11+i)};
        });
        // Combine: 1 correct + 3 wrong = always 4
        var topicOpts = [correctOpt].concat(wrongOpts);
        // Shuffle
        for (var i = topicOpts.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = topicOpts[i]; topicOpts[i] = topicOpts[j]; topicOpts[j] = tmp;
        }

        items.push({
          type: 'reading_comprehension', level: 'Analyze', wordIdx: selectedWords[0] ? selectedWords[0].wi : 0,
          prompt: 'What is this passage mainly about?',
          passage: passage.text,
          passageTitle: passage.title || 'Lesetext',
          passageTranslation: passage.translation || '',
          options: topicOpts,
          correctIdx: topicOpts.findIndex(function(o) { return o.isCorrect; }),
          correctAnswer: correctText,
          germanWord: firstWord.german,
          wordInfo: firstWord
        });
      }
    } catch(e) { console.warn('Failed to parse passage:', e); }
  }

  // Interleave: Round 1 → 2 → 3 → 4, shuffled within each
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

// Fetch or generate AI sentences for exercise words
export async function fetchExerciseSentences(selectedWords, getWord) {
  var wordsPayload = selectedWords.map(function(sw) {
    var w = getWord(sw.wi);
    return {german: w.german, english: w.english, type: w.type, category: w.cat};
  });

  try {
    var response = await fetch(SUPABASE_URL + '/functions/v1/generate-sentences', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({words: wordsPayload})
    });
    if (!response.ok) return null;
    var result = await response.json();
    return result.data || null;
  } catch(e) {
    console.warn('Failed to fetch AI sentences:', e);
    return null;
  }
}
