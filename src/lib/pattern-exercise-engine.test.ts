import { describe, it, expect } from 'vitest';
import { generatePatternItems, orderChunks } from './pattern-exercise-engine';
import { matchesAccepted } from './exercise-core';
import { VOCAB_PATTERNS_DATA, PATTERN_LISTEN_ONLY_CAT } from '../patterns-a1-data';

const { words, cats, types } = VOCAB_PATTERNS_DATA;
const getWord = (wi: number) => {
  const w = words[wi];
  return { german: w[0], english: w[1], cat: cats[w[2]], type: types[w[3]], typeClass: 'tag-noun', meta: w[4], idx: wi };
};
const allLearned = Object.fromEntries(words.map(w => [w[0].toLowerCase(), { learned: true, confidence: 4, reviews: [] }]));
const strengthEp = (s: 'new' | 'medium' | 'strong') =>
  s === 'new' ? undefined : { attempts: 5, correct: 5, streak: s === 'strong' ? 4 : 1, recent: [1, 1, 1, 1, 1] };
const excl = [PATTERN_LISTEN_ONLY_CAT];

// Every row, at every strength, must yield a well-formed item whose own
// correct answer passes the checker (otherwise the learner can never win).
describe('generatePatternItems — every pattern at every strength', () => {
  (['new', 'medium', 'strong'] as const).forEach(strength => {
    it(strength + ': items are answerable', () => {
      const ep = Object.fromEntries(words.map(w => [w[0].toLowerCase(), strengthEp(strength)]));
      for (let round = 0; round < 3; round++) {
        for (let start = 0; start < words.length; start += 10) {
          const selected = [];
          for (let wi = start; wi < Math.min(start + 10, words.length); wi++) {
            if (words[wi][2] === PATTERN_LISTEN_ONLY_CAT) continue;
            selected.push({ wi, stage: 2, neverPracticed: strength === 'new' });
          }
          if (!selected.length) continue;
          const items = generatePatternItems(selected, getWord, words, ep, allLearned, excl);
          items.forEach((it: any) => {
            const label = it.type + ' ' + words[it.wordIdx][0];
            expect(it.isPattern, label).toBe(true);
            expect(it.prompt, label).toBeTruthy();
            if (it.type === 'multiple_choice' || it.type === 'listening') {
              expect(it.options.length, label).toBeGreaterThanOrEqual(2);
              expect(it.options.filter((o: any) => o.wi === it.wordIdx), label).toHaveLength(1);
              const texts = it.options.map((o: any) => o.text.toLowerCase().trim());
              expect(new Set(texts).size, label).toBe(texts.length);
              it.options.forEach((o: any) => expect(words[o.wi][2], label).not.toBe(PATTERN_LISTEN_ONLY_CAT));
            } else if (it.type === 'fill_blank') {
              expect(matchesAccepted(it.correctAnswer, it.accepted), label).toBe(true);
              expect(String(it.correctAnswer), label).not.toMatch(/[[\]]/);
              expect(String(it.prompt), label).not.toMatch(/[[\]]/);
              // A gap's hint must not hand over the missing words
              if (/^Fill the gap/.test(it.prompt) && /\p{L}{3,}/u.test(it.correctAnswer)) {
                expect(String(it.hint).toLowerCase().includes(String(it.correctAnswer).toLowerCase()), label).toBe(false);
              }
            } else if (it.type === 'word_order') {
              expect(it.chunks.length, label).toBeGreaterThanOrEqual(3);
              // Same chunks as the answer, just shuffled
              expect([...it.chunks].sort(), label).toEqual([...orderChunks(words[it.wordIdx][4].pattern).chunks].sort());
              expect(matchesAccepted(it.correctAnswer, it.accepted), label).toBe(true);
              expect(it.chunks.join(' '), label).not.toBe(it.correctAnswer);
            } else if (it.type === 'write_sentence') {
              expect(it.kind, label).toBe('pattern');
              expect(it.targetWord, label).toBe(words[it.wordIdx][0]);
            } else {
              throw new Error('unexpected item type ' + label);
            }
          });
        }
      }
    });
  });

  it('never quizzes listen-only announcements', () => {
    const items = generatePatternItems(
      words.map((w, wi) => ({ wi, stage: 2 })).filter(s => words[s.wi][2] !== PATTERN_LISTEN_ONLY_CAT).slice(0, 10),
      getWord, words, {}, allLearned, excl);
    items.forEach((it: any) => expect(words[it.wordIdx][2]).not.toBe(PATTERN_LISTEN_ONLY_CAT));
  });

  it('du/Sie switch asks for the twin', () => {
    const wi = words.findIndex(w => w[0] === 'Wie heißt du?');
    const ep = { ['wie heißt du?']: strengthEp('strong') };
    let seen = false;
    for (let i = 0; i < 60 && !seen; i++) {
      const items = generatePatternItems([{ wi, stage: 3 }], getWord, words, ep, allLearned, excl);
      const it: any = items.find((x: any) => x.type === 'fill_blank' && /^Switch to formal/.test(x.prompt));
      if (it) { seen = true; expect(it.correctAnswer).toBe('Wie heißen Sie?'); }
    }
    expect(seen).toBe(true);
  });
});

describe('orderChunks', () => {
  it('keeps slot values as one chunk and re-attaches punctuation', () => {
    expect(orderChunks('Ich spreche [Deutsch, Englisch und Spanisch].')).toEqual({
      answer: 'Ich spreche Deutsch, Englisch und Spanisch.',
      chunks: ['Ich', 'spreche', 'Deutsch, Englisch und Spanisch.'],
    });
  });
  it('uses the longest dialogue turn and drops … placeholders', () => {
    expect(orderChunks('Noch etwas? — Nein, danke. Das ist alles.').answer).toBe('Nein, danke. Das ist alles.');
    expect(orderChunks('Ich wohne in […]').chunks).toEqual(['Ich', 'wohne', 'in']);
  });
});
