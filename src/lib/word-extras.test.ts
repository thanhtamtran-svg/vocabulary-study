import { describe, it, expect } from 'vitest';
import { buildWordIndex, matchCourseWords } from './word-extras';

var words = [
  ['der Verkäufer', 'salesperson', 1, 0],
  ['gut', 'good, well (besser, am besten)', 2, 2],
  ['schlecht', 'bad', 2, 2],
  ['Sie (formal)', 'you (formal)', 1, 3],
  ['der Kunde', 'customer', 1, 0]
];
var index = buildWordIndex(words);

describe('matchCourseWords — keep only same-level (in-course) words', () => {
  it('drops words that are not in the course', () => {
    expect(matchCourseWords(['schlecht', 'mies'], index, words, 1).map(r => r.german)).toEqual(['schlecht']);
  });
  it('matches nouns with or without the article, and annotated words', () => {
    expect(matchCourseWords(['Kunde', 'die Kunde'], index, words, 0).map(r => r.wi)).toEqual([4]);
    expect(matchCourseWords(['Sie'], index, words, 0).map(r => r.wi)).toEqual([3]);
  });
  it('never lists the word itself; empty input → nothing', () => {
    expect(matchCourseWords(['gut'], index, words, 1)).toEqual([]);
    expect(matchCourseWords(undefined, index, words, 1)).toEqual([]);
  });
});
