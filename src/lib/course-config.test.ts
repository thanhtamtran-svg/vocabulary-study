import { describe, it, expect } from 'vitest';
import { COURSES, studyDatesKeyForLang } from './course-config';
import { SYNC_EMAIL_KEY, STORAGE_KEY, TYPE_NAMES } from './constants';
import { VOCAB_DATA } from '../vocab-data';
import { VOCAB_A11_DATA } from '../vocab-a11-data';

// The keys below are where real users' progress lives (localStorage and the
// cloud sync row). They were literals in App.tsx before the course-config
// refactor; changing one silently orphans that progress (Tier 3).
describe('course config — pinned keys for existing courses', () => {
  it('German 1500 keeps its storage and sync keys', () => {
    const c = COURSES.full;
    expect(c.storageKey).toBe('german1500');
    expect(c.storageKey).toBe(STORAGE_KEY);
    expect(c.syncLang).toBe('german');
    expect(c.syncEmailKey).toBe('german1500_sync_email');
    expect(c.syncEmailKey).toBe(SYNC_EMAIL_KEY);
    expect(c.studyDatesKey).toBe('vocab_study_dates');
    expect(c.exerciseProgressKey).toBe('vocab_exercise_progress');
    expect(c.exportPrefix).toBe('german_progress_');
  });

  it('German 1500 keeps its behaviour flags', () => {
    const c = COURSES.full;
    expect(c.excludeCats).toBeNull();
    expect(c.lektionFocus).toBe(false);
    expect(c.emojis).toBe(true);
    expect(c.images && c.wordExtras && c.ipa && c.genderDot).toBe(true);
    expect(c.engine).toBe('word');
    expect(c.directionToggle).toBe(false);
    expect(c.title).toBe('German 1500');
    expect(c.desc).toBe('Master 1500 words with science-based spaced repetition');
  });

  it('Schritte A1 keeps its storage and sync keys', () => {
    const c = COURSES.a11;
    expect(c.storageKey).toBe('schritte_a11');
    expect(c.syncLang).toBe('german_a11');
    expect(c.syncEmailKey).toBe('schritte_a11_sync_email');
    expect(c.studyDatesKey).toBe('schritte_a11_study_dates');
    expect(c.exerciseProgressKey).toBe('schritte_a11_exercise_progress');
    expect(c.focusKey).toBe('schritte_a11_focus_cat');
    expect(c.exportPrefix).toBe('german_progress_');
  });

  it('Schritte A1 keeps its behaviour flags', () => {
    const c = COURSES.a11;
    expect(c.excludeCats).toEqual([0]);
    expect(c.lektionFocus).toBe(true);
    expect(c.emojis).toBe(false);
    expect(c.images && c.wordExtras && c.ipa && c.genderDot).toBe(true);
    expect(c.engine).toBe('word');
    expect(c.directionToggle).toBe(false);
    expect(c.title).toBe('Schritte A1');
    expect(c.desc).toBe('Master the Schritte Plus Neu A1 textbook vocabulary with science-based spaced repetition');
  });
});

describe('course config — consistency', () => {
  const all = Object.values(COURSES);

  it('no two courses share a storage, sync or study-dates key', () => {
    for (const field of ['storageKey', 'syncLang', 'syncEmailKey', 'studyDatesKey', 'exerciseProgressKey'] as const) {
      const vals = all.map(c => c[field]);
      expect(new Set(vals).size).toBe(vals.length);
    }
  });

  it('every sibling resolves to another course, and siblings are mutual', () => {
    for (const c of all) {
      for (const lang of c.siblingLangs) {
        expect(lang).not.toBe(c.syncLang);
        const key = studyDatesKeyForLang(lang);
        expect(key).not.toBeNull();
        const sib = all.find(x => x.syncLang === lang)!;
        expect(sib.siblingLangs).toContain(c.syncLang);
      }
    }
  });

  it('getWord type names from vocabData.types match the old global TYPE_NAMES', () => {
    expect(VOCAB_DATA.types).toEqual(TYPE_NAMES);
    expect(VOCAB_A11_DATA.types).toEqual(TYPE_NAMES);
  });
});
