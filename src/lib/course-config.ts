// One entry per German course variant served by App.tsx. Everything that
// used to be an `isA11 ? … : …` ternary lives here, so adding a course is a
// new entry instead of another copy of the app.
//
// storageKey / syncLang / syncEmailKey / studyDatesKey / exerciseProgressKey
// are the keys real users' progress is stored and synced under. Changing one
// orphans that progress — course-config.test.ts pins them (Tier 3).

export type CourseVariant = 'full' | 'a11' | 'patterns';

export interface CourseConfig {
  storageKey: string;
  syncLang: string;
  syncEmailKey: string;
  studyDatesKey: string;
  exerciseProgressKey: string;
  // Other courses whose study days count toward this course's streak
  siblingLangs: string[];
  // Categories kept out of exercises and reviews (background-only content)
  excludeCats: number[] | null;
  // Per-category focus picker + "Lektion (n)" batch labels on the dashboard
  lektionFocus: boolean;
  focusKey: string | null;
  emojis: boolean;
  images: boolean;
  wordExtras: boolean;
  ipa: boolean;
  genderDot: boolean;
  engine: 'word' | 'pattern';
  directionToggle: boolean;
  directionKey: string | null;
  exportPrefix: string;
  title: string;
  desc: string;
  // What one item / one group is called in the UI ("word"/"Lektion" or
  // "pattern"/"situation").
  itemLabel: string;
  groupLabel: string;
}

export const COURSES: Record<CourseVariant, CourseConfig> = {
  full: {
    storageKey: 'german1500',
    syncLang: 'german',
    syncEmailKey: 'german1500_sync_email',
    studyDatesKey: 'vocab_study_dates',
    exerciseProgressKey: 'vocab_exercise_progress',
    siblingLangs: ['german_a11', 'german_patterns'],
    excludeCats: null,
    lektionFocus: false,
    focusKey: null,
    emojis: true,
    images: true,
    wordExtras: true,
    ipa: true,
    genderDot: true,
    engine: 'word',
    directionToggle: false,
    directionKey: null,
    exportPrefix: 'german_progress_',
    title: 'German 1500',
    itemLabel: 'word',
    groupLabel: 'Lektion',
    desc: 'Master 1500 words with science-based spaced repetition',
  },
  a11: {
    storageKey: 'schritte_a11',
    syncLang: 'german_a11',
    syncEmailKey: 'schritte_a11_sync_email',
    studyDatesKey: 'schritte_a11_study_dates',
    exerciseProgressKey: 'schritte_a11_exercise_progress',
    siblingLangs: ['german', 'german_patterns'],
    // Cat 0 (Anweisungen im Kurs): classroom instructions are background
    // reinforcement only, not reviewed or tested
    excludeCats: [0],
    lektionFocus: true,
    focusKey: 'schritte_a11_focus_cat',
    emojis: false,
    images: true,
    wordExtras: true,
    ipa: true,
    genderDot: true,
    engine: 'word',
    directionToggle: false,
    directionKey: null,
    exportPrefix: 'german_progress_',
    title: 'Schritte A1',
    itemLabel: 'word',
    groupLabel: 'Lektion',
    desc: 'Master the Schritte Plus Neu A1 textbook vocabulary with science-based spaced repetition',
  },
  patterns: {
    storageKey: 'patterns_a1',
    syncLang: 'german_patterns',
    syncEmailKey: 'patterns_a1_sync_email',
    studyDatesKey: 'patterns_a1_study_dates',
    exerciseProgressKey: 'patterns_a1_exercise_progress',
    siblingLangs: ['german', 'german_a11'],
    // Cat 18 (Durchsagen): announcements are listen-only
    excludeCats: [18],
    lektionFocus: true,
    focusKey: 'patterns_a1_focus_cat',
    emojis: false,
    images: false,
    wordExtras: false,
    ipa: false,
    genderDot: false,
    engine: 'pattern',
    directionToggle: true,
    directionKey: 'patterns_a1_direction',
    exportPrefix: 'patterns_progress_',
    title: 'Hören & Sprechen A1',
    itemLabel: 'pattern',
    groupLabel: 'situation',
    desc: 'Speak and understand everyday A1 sentence patterns with science-based spaced repetition',
  },
};

// Study-dates localStorage key of the course synced under `syncLang`.
export function studyDatesKeyForLang(syncLang: string): string | null {
  var c = (Object.values(COURSES) as CourseConfig[]).find(function(x) { return x.syncLang === syncLang; });
  return c ? c.studyDatesKey : null;
}
