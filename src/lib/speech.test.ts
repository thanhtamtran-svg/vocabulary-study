import { describe, it, expect } from 'vitest';
import { cleanGermanForSpeech, cleanEnglishForSpeech, cleanPatternForSpeech } from './speech';

// The cleaning step decides WHAT gets sent to the TTS voice — a bad
// clean reads parenthesized hints or abbreviations aloud. These pin the
// behavior that shipped (and now feeds the cloud voice cache keys).

describe('cleanGermanForSpeech', () => {
  it('strips parenthesized hints', () => {
    expect(cleanGermanForSpeech('der Tisch (table)')).toBe('der Tisch');
    expect(cleanGermanForSpeech('einkaufen (gehen) test')).toBe('einkaufen test');
  });
  it('collapses whitespace', () => {
    expect(cleanGermanForSpeech('  der   Stuhl  ')).toBe('der Stuhl');
  });
});

describe('cleanEnglishForSpeech', () => {
  it('expands sth/sb abbreviations', () => {
    expect(cleanEnglishForSpeech('to rely on sth')).toBe('to rely on something');
    expect(cleanEnglishForSpeech('to talk sb into')).toBe('to talk somebody into');
  });
  it('drops + suffixes and = glosses, converts slash to or', () => {
    expect(cleanEnglishForSpeech('give up + noun')).toBe('give up');
    expect(cleanEnglishForSpeech('quick/fast')).toBe('quick or fast');
  });
});

describe('cleanPatternForSpeech', () => {
  it('reads the first slot value and drops brackets', () => {
    expect(cleanPatternForSpeech('Ich komme aus [Deutschland / Österreich].')).toBe('Ich komme aus Deutschland.');
  });
  it('pauses between dialogue turns', () => {
    expect(cleanPatternForSpeech('Noch etwas? — Nein, danke.')).toBe('Noch etwas? Nein, danke.');
    expect(cleanPatternForSpeech('Hallo. — Hi.')).toBe('Hallo. Hi.');
  });
  it('drops … placeholders', () => {
    expect(cleanPatternForSpeech('Ich wohne in …')).toBe('Ich wohne in');
    expect(cleanPatternForSpeech('… und du?')).toBe('und du?');
    expect(cleanPatternForSpeech('Wie schreibt man Ihren Nachnamen? — Ich buchstabiere: …')).toBe('Wie schreibt man Ihren Nachnamen? Ich buchstabiere:');
  });
  it('leaves word audio cleaning untouched', () => {
    expect(cleanGermanForSpeech('sowohl ... als auch')).toBe('sowohl ... als auch');
  });
});
