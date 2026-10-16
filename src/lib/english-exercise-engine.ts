import { SUPABASE_URL } from './supabase';
import { ENGLISH_SENTENCE_TEMPLATES } from './english-constants';
import { getMemoryStage } from './memory-stages';
import { parseDate, dateKey } from './dates';
import {
  selectSessionWords, wordStrength, makeChoiceOptions, pickSentenceWords,
  writeSentenceItem, orderSession
} from './exercise-core';

// English progress and exerciseProgress are keyed by word index.
function learnedIndices(progress) {
  return Object.keys(progress).filter(function(k) {
    return progress[k] && progress[k].learned;
  }).map(function(k) { return parseInt(k); });
}

function stripPlaceholders(s) {
  return s.toLowerCase().replace(/\s*(somebody|something|sb|sth)\s*/gi, '').trim();
}

// Select words for exercise (rules in exercise-core)
export function selectExerciseWords(progress, exerciseProgress, words, today) {
  var entries = learnedIndices(progress).map(function(wi) {
    var ep = exerciseProgress[wi] || {};
    var nextReview = ep.nextReview ? parseDate(ep.nextReview) : new Date(0);
    return {
      wi: wi, ep: ep, stage: getMemoryStage(progress[wi]),
      type: words[wi][3], cat: words[wi][2], isDue: today >= nextReview
    };
  });
  return selectSessionWords(entries, dateKey(today));
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

function readingItem(aiPassage, selectedWords, getWord) {
  try {
    var passage = typeof aiPassage === 'string' ? JSON.parse(aiPassage) : aiPassage;
    if (!passage || !passage.text) return null;
    var firstWord = selectedWords[0] ? getWord(selectedWords[0].wi) : {german:'', wordInfo:{}};
    var topicOpts, promptText, correctText;

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

    return {
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
    };
  } catch(e) {
    console.warn('Failed to parse passage:', e);
    return null;
  }
}

// One item per phrase at the difficulty that fits it, plus sentence writing
// for the newest phrases and the reading passage.
export function generateExerciseItems(selectedWords, aiSentences, aiPassage, getWord, words, exerciseProgress, progress) {
  var learned = learnedIndices(progress);
  var sentenceWis = pickSentenceWords(selectedWords);
  var mainItems = [];
  var sentenceItems = [];

  selectedWords.forEach(function(sw) {
    var wi = sw.wi;
    var w = getWord(wi);
    var wordType = words[wi][3];
    var strength = wordStrength(exerciseProgress[wi]);
    var sent = getAiSentence(w, wordType, aiSentences);
    var typePhrase = {
      type: 'fill_blank', level: 'Understand', wordIdx: wi,
      prompt: 'Type the phrase that means:\n' + w.english,
      correctAnswer: stripPlaceholders(w.german),
      fullAnswer: w.german, germanWord: w.german, wordInfo: w
    };

    if (strength === 'new') {
      var listening = Math.random() < 0.3;
      mainItems.push({
        type: listening ? 'listening' : 'multiple_choice', level: 'Remember', wordIdx: wi,
        prompt: listening ? 'Listen and choose the correct definition:' : 'What does "' + w.german + '" mean?',
        options: makeChoiceOptions(wi, w.english, learned, words, 1), correctAnswer: w.english,
        germanWord: w.german, wordInfo: w
      });
    } else if (strength === 'medium' || sent.template === '___' || Math.random() < 0.3) {
      mainItems.push(typePhrase);
    } else {
      mainItems.push({
        type: 'sentence_complete', level: 'Apply', wordIdx: wi,
        prompt: sent.ai ? sent.template : sent.template.replace('___', '______'),
        hint: w.english,
        correctAnswer: stripPlaceholders(w.german),
        fullAnswer: w.german, sentence: sent.full,
        germanWord: w.german, wordInfo: w
      });
    }

    if (sentenceWis.indexOf(wi) !== -1) {
      sentenceItems.push(writeSentenceItem(wi, w, w.german, sent.ai ? sent.full : null));
    }
  });

  var reading = aiPassage ? readingItem(aiPassage, selectedWords, getWord) : null;
  return orderSession(mainItems, sentenceItems, reading ? [reading] : []);
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
