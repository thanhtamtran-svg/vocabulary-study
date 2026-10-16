import { describe, it, expect } from 'vitest';
import {
  recentAccuracy, wordStrength, scheduleRetry, willRetry, nextExerciseRecord,
  pickDistractors, selectSessionWords, pickSentenceWords
} from './exercise-core';

var dk = function(d) { return d.toISOString().slice(0, 10); };
var add = function(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };

describe('weak/strong uses the last answers, not the whole history', () => {
  it('a word wrong a lot long ago but right recently is not weak', () => {
    var ep = {attempts: 10, correct: 3, streak: 3, recent: [1, 1, 1, 0, 1]};
    expect(recentAccuracy(ep)).toBe(0.8);
    expect(wordStrength(ep)).toBe('strong');
  });
  it('old records without a window: right last time → not weak', () => {
    expect(recentAccuracy({attempts: 10, correct: 2, streak: 1})).toBeNull();
    expect(wordStrength({attempts: 10, correct: 2, streak: 1})).toBe('medium');
    expect(wordStrength({attempts: 10, correct: 2, streak: 0})).toBe('new');
  });
  it('never practiced → new', () => {
    expect(wordStrength(undefined)).toBe('new');
  });
});

describe('nextExerciseRecord', () => {
  it('keeps only the last 5 answers', () => {
    var ep = {attempts: 5, correct: 5, streak: 5, recent: [1, 1, 1, 1, 1]};
    var r = nextExerciseRecord(ep, false, new Date('2026-10-16'), add, dk);
    expect(r.recent).toEqual([1, 1, 1, 1, 0]);
    expect(r.streak).toBe(0);
    expect(r.nextReview).toBe('2026-10-17');
  });
});

describe('scheduleRetry', () => {
  var items = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function(i) { return {type: 'fill_blank', id: i}; });
  it('puts the word back 3–5 questions later', () => {
    for (var n = 0; n < 30; n++) {
      var out = scheduleRetry(items, 0, items[0]);
      var pos = out.findIndex(function(it) { return it.isRetry; });
      expect(pos).toBeGreaterThanOrEqual(4);
      expect(pos).toBeLessThanOrEqual(6);
      expect(out.length).toBe(items.length + 1);
    }
  });
  it('appends at the end when few questions are left', () => {
    var out = scheduleRetry(items, 7, items[7]);
    expect(out[out.length - 1].isRetry).toBe(true);
  });
  it('stops after the attempt cap; never retries reading', () => {
    expect(willRetry({type: 'fill_blank', attempt: 3})).toBe(false);
    expect(willRetry({type: 'write_sentence', attempt: 2})).toBe(false);
    expect(willRetry({type: 'reading_comprehension'})).toBe(false);
  });
});

describe('pickDistractors', () => {
  // [text0, meaning, cat, type]
  var words = [
    ['a', 'm-a', 1, 0], ['b', 'm-b', 1, 0], ['c', 'm-c', 1, 2], ['d', 'm-d', 1, 0],
    ['e', 'm-e', 2, 0], ['f', 'm-a', 1, 0], ['g', 'm-g', 3, 2]
  ];
  it('prefers the same Lektion and skips identical meanings', () => {
    var res = pickDistractors(0, 3, [0, 1, 2, 3, 4, 5, 6], words, 1);
    expect(res.sort()).toEqual([1, 2, 3]); // all cat 1; 5 shares the meaning "m-a"
  });
});

describe('selectSessionWords', () => {
  var mk = function(i, ep) { return {wi: i, ep: ep || {}, stage: 2, type: i % 4, cat: 1, isDue: false}; };
  it('skips words already answered correctly today', () => {
    var entries = [];
    for (var i = 0; i < 12; i++) entries.push(mk(i));
    entries[0].ep = {attempts: 1, correct: 1, streak: 1, recent: [1], lastExercise: '2026-10-16'};
    var sel = selectSessionWords(entries, '2026-10-16', 10);
    expect(sel.length).toBe(10);
    expect(sel.some(function(e) { return e.wi === 0; })).toBe(false);
  });
  it('needs at least 5 learned words', () => {
    expect(selectSessionWords([mk(0), mk(1)], '2026-10-16')).toBeNull();
  });
  it('sentence writing goes to the newest words', () => {
    var sel = [{wi: 1, stage: 3}, {wi: 2, stage: 1}, {wi: 3, stage: 1, neverPracticed: true}];
    expect(pickSentenceWords(sel)).toEqual([3, 2]);
  });
});
