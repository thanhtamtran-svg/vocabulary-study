import { SUPABASE_URL } from './supabase';
import { PRONOUNS, PRONOUN_KEYS, SENTENCE_TEMPLATES, TEMPLATE_INCOMPATIBLE_VERBS } from './constants';
import { getMemoryStage } from './memory-stages';
import { parseDate, dateKey } from './dates';
import { getConjugation } from './conjugations';
import {
  selectSessionWords, wordStrength, makeChoiceOptions, pickSentenceWords,
  writeSentenceItem, orderSession
} from './exercise-core';

function wordKeyOf(w) { return String(w[0]).toLowerCase().trim(); }

// Strip annotation parentheticals like "Sie (formal)" → "Sie", used when
// the word is plugged into a sentence template (the parenthetical is a
// disambiguator for the learner, not part of the German word itself).
function stripAnnotation(s) { return String(s).replace(/\s*\([^)]*\)\s*/g, '').trim(); }
function stripArticle(s) { return String(s).replace(/^(der|die|das)\s+/i, ''); }

// Learned word indices eligible for this session (and as distractors).
function learnedIndices(progress, words, excludeCats) {
  var result = [];
  for (var wi = 0; wi < words.length; wi++) {
    var wp = progress[wordKeyOf(words[wi])];
    if (!wp || !wp.learned) continue;
    if (excludeCats && excludeCats.indexOf(words[wi][2]) !== -1) continue;
    result.push(wi);
  }
  return result;
}

// Select words for exercise (rules in exercise-core). progress and
// exerciseProgress are keyed by lowercase word string.
export function selectExerciseWords(progress, exerciseProgress, words, today, excludeCats) {
  var entries = learnedIndices(progress, words, excludeCats).map(function(wi) {
    var key = wordKeyOf(words[wi]);
    var ep = exerciseProgress[key] || {};
    var nextReview = ep.nextReview ? parseDate(ep.nextReview) : new Date(0);
    return {
      wi: wi, ep: ep, stage: getMemoryStage(progress[key]),
      type: words[wi][3], cat: words[wi][2], isDue: today >= nextReview
    };
  });
  return selectSessionWords(entries, dateKey(today));
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
  return {template: t, full: t.replace('___', stripAnnotation(w.german)), ai: false};
}

// --- Item builders ---------------------------------------------------------

function meaningChoiceItem(wi, w, learned, words) {
  // Weak words sometimes come as listening for variety
  var listening = Math.random() < 0.3;
  return {
    type: listening ? 'listening' : 'multiple_choice', level: 'Remember', wordIdx: wi,
    prompt: listening ? 'Listen and choose the correct meaning:' : 'What does "' + stripAnnotation(w.german) + '" mean?',
    options: makeChoiceOptions(wi, w.english, learned, words, 1), correctAnswer: w.english,
    germanWord: w.german, wordInfo: w
  };
}

function typeGermanItem(wi, w) {
  return {
    type: 'fill_blank', level: 'Understand', wordIdx: wi,
    prompt: 'Type the German word for: ' + w.english,
    correctAnswer: stripArticle(w.german),
    fullAnswer: w.german, germanWord: w.german, wordInfo: w
  };
}

function conjugationItem(wi, w) {
  var conj = getConjugation(w.german);
  var pronIdx = Math.floor(Math.random() * PRONOUNS.length);
  var pronounKey = PRONOUN_KEYS[pronIdx];
  return {
    type: 'conjugation', level: 'Understand', wordIdx: wi,
    prompt: 'Conjugate "' + w.german + '" for ' + PRONOUNS[pronIdx] + ':',
    pronoun: PRONOUNS[pronIdx],
    pronounKey: pronounKey,
    infinitive: w.german,
    correctAnswer: conj[pronounKey],
    fullAnswer: PRONOUNS[pronIdx] + ' ' + conj[pronounKey],
    fullTable: conj,
    germanWord: w.german, wordInfo: w
  };
}

// Fill the word into a sentence. Returns null when a template would produce
// broken German and no AI sentence is cached: verbs that need a complement
// ("heißen", "haben") and grammar words (pronouns, possessives, question
// words — "Mein ist richtig." is nonsense).
function sentenceCompleteItem(wi, w, wordType, sent) {
  var isVerb = wordType === 1;
  var verbNeedsComplement = isVerb && TEMPLATE_INCOMPATIBLE_VERBS.has(w.german.toLowerCase());
  if ((verbNeedsComplement || wordType === 3) && !sent.ai) return null;

  // For template plug-in, strip "(formal)"-style annotations so the
  // generated sentence and correct answer use the bare German word.
  var germanClean = stripAnnotation(w.german);
  var answer = stripArticle(germanClean);
  var fullAnswer = germanClean;
  var full = sent.full;
  if (isVerb && !sent.ai) {
    var verbConj = getConjugation(germanClean);
    var t = sent.template.toLowerCase();
    var form = verbConj.ich;
    if (t.startsWith('wir ') || t.includes(' wir ')) form = verbConj.wir;
    else if (!(t.startsWith('ich ') || t.includes(' ich ')) && (t.startsWith('er') || t.startsWith('sie'))) form = verbConj.er;
    answer = form; fullAnswer = form;
    full = sent.template.replace('___', form);
  }
  return {
    type: 'sentence_complete', level: 'Apply', wordIdx: wi,
    prompt: sent.template.replace('___', '______'),
    hint: w.english + (isVerb && !sent.ai ? ' (conjugate!)' : ''),
    correctAnswer: answer,
    fullAnswer: fullAnswer, sentence: full,
    germanWord: w.german, wordInfo: w
  };
}

function readingItem(aiPassage, selectedWords, getWord) {
  try {
    var passage = typeof aiPassage === 'string' ? JSON.parse(aiPassage) : aiPassage;
    if (!passage || !passage.text || !passage.translation) return null;
    var firstWord = selectedWords[0] ? getWord(selectedWords[0].wi) : {german:'', wordInfo:{}};
    var topicOpts, promptText, correctText;

    // Use AI-generated question & options (Goethe/ÖSD style) if available
    if (passage.question && passage.options && Array.isArray(passage.options) && passage.options.length >= 4) {
      promptText = passage.question;
      var aiOpts = passage.options.slice(0, 4);
      var correctOpt = aiOpts.find(function(o) { return o.correct; });
      correctText = correctOpt ? correctOpt.text : aiOpts[0].text;
      topicOpts = aiOpts.map(function(o, i) {
        return {text: o.text, isCorrect: !!o.correct, wi: -(10 + i)};
      });
    } else {
      // Fallback: generic "What is this passage mainly about?"
      promptText = 'What is this passage mainly about?';
      correctText = passage.translation.split('.')[0].trim().substring(0, 60);
      var allTopicPool = [
        'A day at school', 'Shopping at a store', 'A visit to the doctor',
        'Cooking dinner', 'Traveling by train', 'Playing sports',
        'Working in an office', 'A birthday party', 'Learning to drive',
        'Going to the cinema', 'A trip to the zoo', 'Cleaning the house',
        'Eating at a restaurant', 'Meeting new friends', 'Studying for an exam',
        'Going on vacation', 'A walk in the park', 'Moving to a new city',
        'A job interview', 'Shopping for clothes'
      ];
      var passageHint = ((passage.title || '') + ' ' + (passage.translation || '').split('.')[0]).toLowerCase();
      var filteredTopics = allTopicPool.filter(function(t) {
        var tWords = t.toLowerCase().split(/\s+/);
        for (var tw = 0; tw < tWords.length; tw++) {
          if (tWords[tw].length > 3 && passageHint.indexOf(tWords[tw]) >= 0) return false;
        }
        return true;
      });
      for (var fi = filteredTopics.length - 1; fi > 0; fi--) {
        var fj = Math.floor(Math.random() * (fi + 1));
        var ftmp = filteredTopics[fi]; filteredTopics[fi] = filteredTopics[fj]; filteredTopics[fj] = ftmp;
      }
      var wrongOpts = filteredTopics.slice(0, 3).map(function(t, i) {
        return {text: t, isCorrect: false, wi: -(11+i)};
      });
      topicOpts = [{text: correctText, isCorrect: true, wi: -10}].concat(wrongOpts);
    }

    for (var i = topicOpts.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = topicOpts[i]; topicOpts[i] = topicOpts[j]; topicOpts[j] = tmp;
    }

    return {
      type: 'reading_comprehension', level: 'Analyze', wordIdx: selectedWords[0] ? selectedWords[0].wi : 0,
      prompt: promptText,
      passage: passage.text,
      passageTitle: passage.title || 'Lesetext',
      passageTranslation: passage.translation || '',
      options: topicOpts,
      correctIdx: topicOpts.findIndex(function(o) { return o.isCorrect; }),
      correctAnswer: correctText,
      germanWord: firstWord.german,
      wordInfo: firstWord
    };
  } catch(e) {
    console.warn('Failed to parse passage:', e);
    return null;
  }
}

// One item per word at the difficulty that fits it, plus sentence writing
// for the newest words and the reading passage.
export function generateExerciseItems(selectedWords, aiSentences, aiPassage, getWord, words, exerciseProgress, progress, excludeCats) {
  var learned = learnedIndices(progress, words, excludeCats);
  var sentenceWis = pickSentenceWords(selectedWords);
  var mainItems = [];
  var sentenceItems = [];

  selectedWords.forEach(function(sw) {
    var wi = sw.wi;
    var w = getWord(wi);
    var wordType = words[wi][3];
    var ep = exerciseProgress[wordKeyOf(words[wi])] || {};
    var strength = wordStrength(ep);
    var sent = getAiSentence(w, wordType, aiSentences);
    var item = null;

    if (strength === 'new') {
      item = meaningChoiceItem(wi, w, learned, words);
    } else if (strength === 'medium') {
      item = wordType === 1 && Math.random() < 0.5 ? conjugationItem(wi, w) : typeGermanItem(wi, w);
    } else {
      item = (Math.random() < 0.7 && sentenceCompleteItem(wi, w, wordType, sent)) || typeGermanItem(wi, w);
    }
    mainItems.push(item);

    if (sentenceWis.indexOf(wi) !== -1) {
      sentenceItems.push(writeSentenceItem(wi, w, stripAnnotation(w.german), sent.ai ? sent.full : null));
    }
  });

  var reading = aiPassage ? readingItem(aiPassage, selectedWords, getWord) : null;
  return orderSession(mainItems, sentenceItems, reading ? [reading] : []);
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
