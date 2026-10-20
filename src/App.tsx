import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { VOCAB_DATA as DEFAULT_VOCAB_DATA } from './vocab-data';
import { WORD_EMOJIS } from './emoji-data';
import { SUPABASE_URL, SUPABASE_KEY } from './lib/supabase';
import {
  TYPE_TAGS, REVIEW_LABELS, REVIEW_METHODS,
  DUAL_CODING_TIPS, SCIENCE_TIPS, MEMORY_STAGES,
  PRONOUNS, PRONOUN_KEYS, SENTENCE_TEMPLATES,
  STORAGE_KEY, VAPID_PUBLIC_KEY
} from './lib/constants';
import { dateKey, parseDate, formatDate, addDays, getStudyDay, todayDate } from './lib/dates';
import { speakGerman, speakPattern } from './lib/speech';
import { migrateA11ToPatterns } from './lib/patterns-migration';
import { loadState, saveState } from './lib/storage';
import { mergeFullState, mergeProgress, cloudPull, cloudPush } from './lib/sync';
import { fetchWordImage, generateWordImage, fetchCachedExplanation, fetchIPAAndDefinition, fetchExplanation } from './lib/api';
import { getMemoryStage } from './lib/memory-stages';
import { computeDailyStreak, countCompletedBatches, findNextBatch, lektionProgress } from './lib/streak';
import { wordKey, migrateProgressToStringKeys, migrateExerciseProgressToStringKeys, isIndexKeyedProgress } from './lib/progress';
import {
  selectExerciseWords, generateExerciseItems, fetchExerciseSentences
} from './lib/exercise-engine';
import { scheduleRetry, nextExerciseRecord, matchesAccepted } from './lib/exercise-core';
import { generatePatternItems } from './lib/pattern-exercise-engine';
import { checkSentence, fetchWordExtras } from './lib/api';
import { buildWordIndex, matchCourseWords } from './lib/word-extras';
import { wordLinkHref, readWordLink, clearWordLink, findWordIndex } from './lib/word-link';
import { COURSES, studyDatesKeyForLang } from './lib/course-config';

import { useToast } from './components/Toast';
var defImageCache = new Map();
const SetupScreen = lazy(() => import('./views/SetupScreen'));
const Dashboard = lazy(() => import('./views/Dashboard'));
const SessionView = lazy(() => import('./views/SessionView'));
const CompleteView = lazy(() => import('./views/CompleteView'));
const ExerciseView = lazy(() => import('./views/ExerciseView'));
const ExerciseComplete = lazy(() => import('./views/ExerciseComplete'));
const ProgressView = lazy(() => import('./views/ProgressView'));
const BrowseView = lazy(() => import('./views/BrowseView'));
const SettingsView = lazy(() => import('./views/SettingsView'));

// ===== MAIN APP =====
function App({onHome, vocabData, variant}) {
  const toast = useToast();
  const VOCAB_DATA = vocabData || DEFAULT_VOCAB_DATA;
  const cfg = COURSES[variant] || COURSES.full;
  const { storageKey, syncLang, syncEmailKey, studyDatesKey, exerciseProgressKey } = cfg;
  // Sibling courses' study-dates keys, resolved by their sync language
  const siblings = useMemo(() => cfg.siblingLangs
    .map(lang => ({lang, key: studyDatesKeyForLang(lang)}))
    .filter(s => s.key), [cfg]);
  const saved = useMemo(() => loadState(storageKey), [storageKey]);
  const isPatternCourse = cfg.engine === 'pattern';
  // Patterns course: fold in this device's Schritte A1 progress for the rows
  // that moved here (idempotent merge — see lib/patterns-migration.ts).
  const initialPatternMigration = useMemo(() => {
    if (!isPatternCourse) return null;
    var a11 = loadState(COURSES.a11.storageKey);
    var a11Ex = null, ownEx = null;
    try { a11Ex = JSON.parse(localStorage.getItem(COURSES.a11.exerciseProgressKey) || 'null'); } catch (e) {}
    try { ownEx = JSON.parse(localStorage.getItem(exerciseProgressKey) || 'null'); } catch (e) {}
    return migrateA11ToPatterns(a11 && a11.progress, a11Ex, saved && saved.progress, ownEx);
  }, []);
  // Card direction (patterns course): 'en-de' = situation -> say it in German
  // (default), 'de-en' = hear/read German -> meaning.
  const [direction, setDirectionState] = useState(() => {
    if (!cfg.directionKey) return 'en-de';
    try { return localStorage.getItem(cfg.directionKey) === 'de-en' ? 'de-en' : 'en-de'; } catch { return 'en-de'; }
  });
  const setDirection = useCallback(function(d) {
    setDirectionState(d);
    try { if (cfg.directionKey) localStorage.setItem(cfg.directionKey, d); } catch (e) {}
  }, [cfg]);

  const [view, setView] = useState("dashboard");
  const [startDate, setStartDate] = useState(() => {
    if (saved?.startDate) return parseDate(saved.startDate);
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });
  const [started, setStarted] = useState(() => saved?.started || false);
  const [progress, setProgress] = useState(() => {
    if (initialPatternMigration) return initialPatternMigration.progress;
    var p = saved?.progress || {};
    // One-time migration: numeric keys → lowercase word keys
    if (isIndexKeyedProgress(p)) p = migrateProgressToStringKeys(p, VOCAB_DATA);
    return p;
  });

  // Helper: get progress key for a word index (uses current vocab data)
  const pk = useCallback(function(wi) { return wordKey(VOCAB_DATA, wi); }, []);
  // Reverse map: word-key → index (for UI operations that need word indices)
  const keyToIdx = useMemo(function() {
    var map = {};
    VOCAB_DATA.words.forEach(function(w, i) { map[String(w[0]).toLowerCase().trim()] = i; });
    return map;
  }, []);
  const [todayCompleted, setTodayCompleted] = useState(() => {
    if (saved?.todayCompleted && saved?.completedDate === dateKey(todayDate())) {
      return saved.todayCompleted;
    }
    return {learnCount: 0, learnedBatches: [], reviews: {}};
  });

  // B-026 — focus one Lektion. Kept per-device in localStorage on purpose,
  // NOT in the synced blob: word progress already syncs, so once the user
  // picks the same Lektion on the phone it computes the same next batch.
  // Adding it to the sync payload would touch mergeProgress / the edge
  // function (Tier 3, see the 2026-05-29 incident) for little gain.
  const focusCatKey = cfg.focusKey;
  const [focusCat, setFocusCatState] = useState(() => {
    if (!cfg.lektionFocus || !focusCatKey) return null;
    try {
      var v = localStorage.getItem(focusCatKey);
      return v === null ? null : parseInt(v, 10);
    } catch { return null; }
  });
  const setFocusCat = useCallback(function(cat) {
    setFocusCatState(cat);
    if (!focusCatKey) return;
    try {
      if (cat === null) localStorage.removeItem(focusCatKey);
      else localStorage.setItem(focusCatKey, String(cat));
    } catch (e) {}
  }, []);

  // Daily streak state
  const [studyDates, setStudyDates] = useState(() => {
    try { var d = localStorage.getItem(studyDatesKey); return d ? JSON.parse(d) : []; } catch { return []; }
  });
  // Sibling courses' study dates — all German courses share one streak.
  // {studyDatesKey: dates[]}
  const [siblingStudyDates, setSiblingStudyDates] = useState(() => {
    var out = {};
    siblings.forEach(function(s) {
      try { var d = localStorage.getItem(s.key); out[s.key] = d ? JSON.parse(d) : []; } catch { out[s.key] = []; }
    });
    return out;
  });
  // Combined dates drive the streak/week calendar
  const combinedStudyDates = useMemo(() => {
    var all = [...(studyDates || [])];
    Object.values(siblingStudyDates).forEach(function(d) { all.push(...((d as string[]) || [])); });
    return [...new Set(all)];
  }, [studyDates, siblingStudyDates]);

  // Calculate daily streak with rest-day freeze — pure logic lives in
  // lib/streak.ts (B-005) where it has regression tests.
  const dailyStreak = useMemo(
    () => computeDailyStreak(combinedStudyDates, todayDate()),
    [combinedStudyDates]
  );

  // Record today as a study day when user completes a batch or exercise
  function recordStudyDay() {
    var todayStr = dateKey(todayDate());
    setStudyDates(function(prev) {
      if (prev.includes(todayStr)) return prev;
      var updated = prev.concat([todayStr]);
      localStorage.setItem(studyDatesKey, JSON.stringify(updated));
      return updated;
    });
  }

  // Weekly calendar data (Mon-Sun)
  const weekDays = useMemo(() => {
    var result = [];
    var d = new Date();
    d.setHours(0,0,0,0);
    var dayOfWeek = d.getDay(); // 0=Sun
    var monday = new Date(d);
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
    var dateSet = new Set(combinedStudyDates);
    for (var i = 0; i < 7; i++) {
      var wd = new Date(monday);
      wd.setDate(monday.getDate() + i);
      var dk = dateKey(wd);
      var isPast = wd < todayDate();
      var isToday = dk === dateKey(todayDate());
      result.push({
        label: ['M','T','W','T','F','S','S'][i],
        studied: dateSet.has(dk),
        isPast: isPast,
        isToday: isToday,
        date: dk
      });
    }
    return result;
  }, [combinedStudyDates]);

  // Session state (not persisted)
  const [sessionWords, setSessionWords] = useState([]);
  const [sessionType, setSessionType] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [streak, setStreak] = useState(0);

  // AI explain state
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSaveStatus, setAiSaveStatus] = useState(''); // '', 'saving', 'saved'

  // Word image state
  const [wordImage, setWordImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // IPA pronunciation state
  const [wordIPA, setWordIPA] = useState('');

  // German definition state
  const [wordDefinition, setWordDefinition] = useState('');
  const [defImage, setDefImage] = useState(null); // {url} for definition illustration
  const [wordExtras, setWordExtras] = useState(null); // {example, synonyms, antonyms} for the card back

  // Push notification state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Reset state
  const [resetStep, setResetStep] = useState(0); // 0=idle, 1=confirm, 2=password, 3=resetting
  const [resetPass, setResetPass] = useState('');
  const [resetError, setResetError] = useState('');
  const [pushSubscription, setPushSubscription] = useState(null);
  const [reminderHour, setReminderHour] = useState(() => {
    try { return parseInt(localStorage.getItem('vocab_reminder_hour')) || 8; } catch { return 8; }
  });

  // Check existing push subscription on mount
  useEffect(function() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.ready.then(function(reg) {
      reg.pushManager.getSubscription().then(function(sub) {
        if (sub) {
          setPushSubscription(sub);
          setPushEnabled(true);
          // Fetch reminder hour via edge function
          var token = '';
          try { token = localStorage.getItem('vocab_auth_token') || ''; } catch (e) {}
          fetch(SUPABASE_URL + '/functions/v1/push-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ action: 'get-hour', endpoint: sub.endpoint })
          }).then(function(r) { return r.json(); }).then(function(data) {
            if (data && data.reminderHour != null) {
              setReminderHour(data.reminderHour);
              localStorage.setItem('vocab_reminder_hour', data.reminderHour);
            }
          }).catch(function() {});
        }
      });
    });
    // Register service worker + pre-cache all JS/CSS chunks
    if ('serviceWorker' in navigator) {
      var basePath = new URL('.', window.location.href).pathname;
      navigator.serviceWorker.register(basePath + 'sw.js?v=8').then(function(reg) {
        reg.active && precacheAssets(reg.active);
        reg.addEventListener('updatefound', function() {
          var nw = reg.installing;
          if (nw) nw.addEventListener('statechange', function() {
            if (nw.state === 'activated') precacheAssets(nw);
          });
        });
      }).catch(function() {});
    }
    function precacheAssets(sw) {
      var urls = [];
      document.querySelectorAll('script[src],link[rel="stylesheet"][href],link[rel="modulepreload"][href]').forEach(function(el) {
        var u = el.getAttribute('src') || el.getAttribute('href');
        if (u) urls.push(new URL(u, window.location.href).href);
      });
      if (urls.length > 0) sw.postMessage({type: 'PRECACHE_ASSETS', urls: urls});
    }
  }, []);

  // Cloud sync state
  const [syncEmail, setSyncEmail] = useState(() => {
    try { return localStorage.getItem(syncEmailKey) || ''; } catch { return ''; }
  });
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, done, error
  const [syncMsg, setSyncMsg] = useState('');
  const syncRef = useRef(false);

  // Fetch image + autoplay pronunciation + cached explanation when session word changes
  useEffect(function() {
    if (view !== 'session' || !sessionWords.length) return;
    var w = sessionWords[currentIdx];
    if (!w) return;
    var cancelled = false;
    setWordImage(null);
    if (cfg.images) {
      setImageLoading(true);
      fetchWordImage(w.german, w.english, w.type).then(function(img) {
        if (cancelled) return;
        setWordImage(img);
        setImageLoading(false);
      }).catch(function() { if (!cancelled) setImageLoading(false); });
    } else {
      setImageLoading(false);
    }
    // Auto-load cached explanation (no API cost)
    setAiExplanation('');
    setAiError('');
    setAiLoading(false);
    setAiSaveStatus('');
    fetchCachedExplanation(w.german, undefined, w.meta && w.meta.pattern ? {kind: 'pattern'} : undefined).then(function(text) {
      if (cancelled) return;
      if (text) {
        setAiExplanation(text);
        setAiSaveStatus('saved');
      }
    });
    // Example sentence + in-course synonyms/antonyms for the card back
    setWordExtras(null);
    if (cfg.wordExtras) fetchWordExtras(w.german, w.english).then(function(extras) {
      if (cancelled || !extras) return;
      var examples = extras.examples || [];
      setWordExtras({
        example: examples.length ? examples[Math.floor(Math.random() * examples.length)] : null,
        synonyms: matchCourseWords(extras.synonyms, wordIndex, words, w.idx),
        antonyms: matchCourseWords(extras.antonyms, wordIndex, words, w.idx)
      });
    });
    // Fetch IPA + German definition (single call, cached). The definition is
    // no longer shown (too hard at A1) but still keys the definition image.
    setWordIPA('');
    setWordDefinition('');
    setDefImage(null);
    if (cfg.ipa) fetchIPAAndDefinition(w.german, w.english).then(function(result) {
      if (cancelled) return;
      if (result.ipa) setWordIPA(result.ipa);
      if (result.definition) {
        setWordDefinition(result.definition);
        var defKey = 'def ' + w.german.toLowerCase();
        if (defImageCache.has(defKey)) {
          var cached = defImageCache.get(defKey);
          if (cached) setDefImage(cached);
        } else {
          fetch(SUPABASE_URL + '/rest/v1/vocab_images?word=eq.' + encodeURIComponent(defKey) + '&select=image_base64', {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
          }).then(function(r) { return r.ok ? r.json() : []; }).then(function(data) {
            if (cancelled) return;
            if (data && data.length > 0 && data[0].image_base64) {
              var img = { url: data[0].image_base64 };
              defImageCache.set(defKey, img);
              setDefImage(img);
            } else {
              defImageCache.set(defKey, null);
            }
          });
        }
      }
    });
    // Autoplay pronunciation. Patterns in en->de mode stay silent until the
    // learner flips (PatternCard plays it then) — audio would give it away.
    if (w.meta && w.meta.pattern) {
      if (direction === 'de-en' || w.meta.listenOnly) speakPattern(w.meta.pattern);
    } else speakGerman(w.german);
    return function() { cancelled = true; };
  }, [view, currentIdx, sessionWords]);

  // ===== EXERCISE STATE =====
  const [exerciseSession, setExerciseSession] = useState(null); // {items:[], targetWords:[]}
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [exerciseAnswer, setExerciseAnswer] = useState('');
  const [exerciseFeedback, setExerciseFeedback] = useState(null); // {correct, message, correctAnswer}
  const [exerciseWhyLoading, setExerciseWhyLoading] = useState(false);
  const [exerciseWhyText, setExerciseWhyText] = useState('');
  const [exerciseResults, setExerciseResults] = useState([]); // [{wordIdx, type, correct, answer}]
  const [exerciseProgress, setExerciseProgress] = useState(() => {
    if (initialPatternMigration) return initialPatternMigration.exerciseProgress;
    try {
      var d = localStorage.getItem(exerciseProgressKey);
      var ep = d ? JSON.parse(d) : {};
      if (isIndexKeyedProgress(ep)) ep = migrateExerciseProgressToStringKeys(ep, VOCAB_DATA);
      return ep;
    } catch { return {}; }
  }); // {wordKey: {attempts, correct, lastExercise, nextReview, streak}}
  const [exerciseSelectedIdx, setExerciseSelectedIdx] = useState(-1); // for multiple choice
  const [exerciseChecking, setExerciseChecking] = useState(false); // AI checking a written sentence
  const exerciseSessionRef = useRef(null);
  exerciseSessionRef.current = exerciseSession;

  // Save exercise progress
  useEffect(function() {
    try { localStorage.setItem(exerciseProgressKey, JSON.stringify(exerciseProgress)); } catch(e) {}
  }, [exerciseProgress]);

  // Browse state (hoisted to avoid hooks-in-conditional bug)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState(-1);

  const words = VOCAB_DATA.words;
  const wordIndex = useMemo(() => buildWordIndex(words), [words]);
  const batches = VOCAB_DATA.batches;
  const cats = VOCAB_DATA.cats;
  const today = useMemo(todayDate, []);
  const studyDay = useMemo(() => getStudyDay(startDate, today), [startDate, today]);

  // Next batch / completed count — pure logic in lib/streak.ts (B-005).
  // Per-Lektion batch stats (Schritte only) — feeds the focus picker and the
  // focus-aware next batch below.
  const lektionStats = useMemo(() =>
    cfg.lektionFocus ? cats.map((_, ci) => lektionProgress(batches, progress, pk, words, ci)) : null,
    [cfg, cats, batches, progress, pk, words]);
  const focusInfo = focusCat !== null && lektionStats ? lektionStats[focusCat] : null;
  // Focused Lektion wins while it still has an unfinished batch; otherwise
  // the normal book order. batchesCompleted / scheduleGap deliberately stay
  // order-agnostic, so learning out of order is never penalised.
  const nextBatch = useMemo(() => {
    if (focusInfo && focusInfo.next !== null) return focusInfo.next;
    return findNextBatch(batches, progress, pk);
  }, [focusInfo, progress, batches, pk]);
  const batchesCompleted = useMemo(() => countCompletedBatches(batches, progress, pk), [progress, batches, pk]);
  // Focused Lektion finished (or points at a Lektion that no longer exists):
  // drop back to normal order rather than sit on an empty "all done" card.
  useEffect(() => {
    if (focusCat === null || !focusInfo || focusInfo.next !== null) return;
    if (focusInfo.total > 0) toast.success((cats[focusCat] || 'Lektion') + ' complete! Back to the normal order.');
    setFocusCat(null);
  }, [focusCat, focusInfo]);

  // Schedule tracking: expected batch by studyDay vs actual
  const expectedBatch = Math.min(studyDay, batches.length);
  const scheduleGap = batchesCompleted - expectedBatch; // positive = ahead, negative = behind

  const weekNum = Math.ceil(studyDay / 6) || 1;
  const phase = weekNum <= 4 ? 1 : weekNum <= 14 ? 2 : weekNum <= 24 ? 3 : 4;
  const phaseNames = ["","Foundation","Acceleration","Peak Input","Consolidation"];
  const phaseColors = ["","#27AE60","#2E86C1","#8E44AD","#F39C12"];

  // Count only progress entries for words in the current variant
  const totalLearned = useMemo(() =>
    Object.keys(progress).filter(k => keyToIdx[k] !== undefined && progress[k].learned).length
  , [progress, keyToIdx]);

  const totalMastered = useMemo(() =>
    Object.keys(progress).filter(k => keyToIdx[k] !== undefined && getMemoryStage(progress[k]) >= 5).length
  , [progress, keyToIdx]);

  // ===== EXERCISE GENERATOR =====
  // Compute exercise stats for dashboard
  var exerciseStats = useMemo(function() {
    var weak = [], due = [], strong = [], neverPracticed = [];
    // Iterate over all words; check progress and exerciseProgress by word-key
    for (var wi = 0; wi < words.length; wi++) {
      var key = pk(wi);
      var wp = progress[key];
      if (!wp || !wp.learned) continue;
      var ep = exerciseProgress[key] || {};
      var nextReview = ep.nextReview ? parseDate(ep.nextReview) : new Date(0);
      var isDue = today >= nextReview;
      var accuracy = ep.attempts > 0 ? ep.correct / ep.attempts : null;

      if (!ep.attempts) {
        neverPracticed.push(wi);
      } else if (accuracy !== null && accuracy < 0.6) {
        weak.push(wi);
      } else if (isDue) {
        due.push(wi);
      } else if (ep.streak >= 5) {
        strong.push(wi);
      }
    }
    return {weak: weak, due: due, strong: strong, neverPracticed: neverPracticed,
      totalPracticed: totalLearned - neverPracticed.length};
  }, [progress, exerciseProgress, totalLearned, today, words, pk]);

  const [exerciseLoading, setExerciseLoading] = useState(false);

  // Autoplay pronunciation for listening exercises
  useEffect(function() {
    if (view !== 'exercise' || !exerciseSession) return;
    var item = exerciseSession.items[exerciseIdx];
    if (item && item.type === 'listening' && !exerciseFeedback) {
      setTimeout(function() { (isPatternCourse ? speakPattern : speakGerman)(item.germanWord); }, 300);
    }
  }, [view, exerciseIdx, exerciseSession]);

  // Enter key handler for exercise view (global — for non-input types like multiple choice)
  useEffect(function() {
    if (view !== 'exercise' || !exerciseSession) return;
    function handleKeyDown(e) {
      if (e.key !== 'Enter') return;
      // Don't interfere with text inputs or focused buttons (button Enter
      // triggers click natively). Exception: answer options. Clicking one
      // focuses it, so Enter used to just re-select it and never check the
      // answer — swallow the native click and check instead.
      var active = document.activeElement as HTMLElement | null;
      var tag = active && active.tagName;
      var onOption = !!(active && active.dataset && active.dataset.exerciseOption);
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (tag === 'BUTTON' && !onOption)) return;
      if (onOption) e.preventDefault();

      var item = exerciseSession.items[exerciseIdx];
      if (exerciseFeedback) {
        // Feedback showing → advance to next
        nextExerciseItem();
      } else if ((item.type === 'multiple_choice' || item.type === 'reading' || item.type === 'reading_comprehension' || item.type === 'reverse_choice' || item.type === 'listening') && exerciseSelectedIdx >= 0) {
        // Option selected → check answer
        checkExerciseAnswer();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return function() { window.removeEventListener('keydown', handleKeyDown); };
  }, [view, exerciseSession, exerciseIdx, exerciseFeedback, exerciseSelectedIdx]);

  // Escape key: go back from session/exercise views
  useEffect(function() {
    function handleKeyDown(e) {
      if (e.key !== 'Escape') return;
      if (view === 'session') {
        setView('dashboard');
      } else if (view === 'exercise') {
        if (exerciseResults.length > 0 && !confirm('Exit exercise? Your progress will be saved.')) return;
        setView('dashboard');
      } else if (view === 'complete' || view === 'exercise-complete') {
        setView('dashboard');
      } else if (view === 'progress' || view === 'browse' || view === 'settings') {
        setView('dashboard');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return function() { window.removeEventListener('keydown', handleKeyDown); };
  }, [view, exerciseResults]);

  // Migrate old todayCompleted format (learn: true/false → learnCount)
  useEffect(function() {
    if (todayCompleted.learn === true && todayCompleted.learnCount === undefined) {
      setTodayCompleted(function(tc) {
        return {learnCount: 1, learnedBatches: tc.learnedBatches || [], reviews: tc.reviews || {}};
      });
    }
  }, []);

  // Augment studyDates with any dates found in progress reviews + exercises
  useEffect(function() {
    var dates = new Set();
    Object.keys(progress).forEach(function(k) {
      var wp = progress[k];
      if (!wp) return;
      if (wp.reviews) wp.reviews.forEach(function(r) { if (r.date) dates.add(r.date); });
      if (wp.lastReview) dates.add(wp.lastReview);
    });
    Object.keys(exerciseProgress).forEach(function(k) {
      var ep = exerciseProgress[k];
      if (ep && ep.lastExercise) dates.add(ep.lastExercise);
    });
    if (dates.size > 0) {
      setStudyDates(function(prev) {
        var union = [...new Set([...prev, ...dates])].sort();
        if (union.length === prev.length) return prev; // no change, avoid re-render
        localStorage.setItem(studyDatesKey, JSON.stringify(union));
        return union;
      });
    }
  }, [progress, exerciseProgress]);

  // Auto-save to localStorage
  useEffect(() => {
    saveState({
      startDate: dateKey(startDate),
      started,
      progress,
      todayCompleted,
      completedDate: dateKey(today)
    }, storageKey);
  }, [startDate, started, progress, todayCompleted, today, storageKey]);

  // Cloud sync: pull on mount, merge with local, push merged result
  const isSyncingRef = useRef(false);
  useEffect(function() {
    if (!syncEmail || syncRef.current) return;
    syncRef.current = true;
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    setSyncMsg('Syncing...');
    // Side pulls: sibling courses' studyDates so the streak unions all courses
    var siblingPulls = {};
    siblings.forEach(function(s) {
      var pull = cloudPull(syncEmail, s.lang);
      siblingPulls[s.lang] = pull;
      pull.then(function(siblingRemote) {
        if (!siblingRemote || !siblingRemote.studyDates) return;
        var union = [...new Set([...(siblingStudyDates[s.key] || []), ...siblingRemote.studyDates])].sort();
        localStorage.setItem(s.key, JSON.stringify(union));
        setSiblingStudyDates(function(prev) { return {...prev, [s.key]: union}; });
      }).catch(function() {});
    });
    // Patterns course: also fold in the cloud copy of Schritte A1 progress for
    // the moved rows (a device may have it only in the cloud). Awaited BEFORE
    // the merge below so its setProgress can't overwrite the migrated rows.
    var a11Pull = isPatternCourse && siblingPulls[COURSES.a11.syncLang]
      ? siblingPulls[COURSES.a11.syncLang].catch(function() { return null; })
      : Promise.resolve(null);
    // Pull first — cloud is the convergence point
    Promise.all([cloudPull(syncEmail, syncLang), a11Pull]).then(function(pulled) {
      var remote = pulled[0], a11Remote = pulled[1];
      var baseProgress = progress, baseExercise = exerciseProgress;
      if (a11Remote && (a11Remote.progress || a11Remote.exerciseProgress)) {
        var mig = migrateA11ToPatterns(a11Remote.progress, a11Remote.exerciseProgress, progress, exerciseProgress);
        baseProgress = mig.progress; baseExercise = mig.exerciseProgress;
        if (mig.changed && !(remote && remote.progress)) {
          setProgress(baseProgress);
          setExerciseProgress(baseExercise);
        }
      }
      if (remote && remote.progress) {
        var localSnapshot = {
          progress: baseProgress, exerciseProgress: baseExercise,
          todayCompleted: todayCompleted, completedDate: dateKey(today),
          startDate: dateKey(startDate), started: started,
        };
        var merged = mergeFullState(localSnapshot, remote, dateKey(today), VOCAB_DATA);
        // Compute studyDates from merged progress + exercises (source of truth)
        // Also union with remote.studyDates in case it has dates not in reviews
        var computedDates = new Set(remote.studyDates || []);
        Object.values(merged.progress).forEach(function(w) {
          if (w.reviews) w.reviews.forEach(function(r) { if (r.date) computedDates.add(r.date); });
          if (w.lastReview) computedDates.add(w.lastReview);
        });
        Object.values(merged.exerciseProgress).forEach(function(e) {
          if (e.lastExercise) computedDates.add(e.lastExercise);
        });
        var mergedDates = [...computedDates].sort();
        // Always apply mergedDates — write to localStorage first so rebuild effect sees it
        localStorage.setItem(studyDatesKey, JSON.stringify(mergedDates));
        setStudyDates(mergedDates);
        // Apply to React state
        setProgress(merged.progress);
        setExerciseProgress(merged.exerciseProgress);
        setTodayCompleted(merged.todayCompleted);
        if (merged.startDate && !saved?.startDate) setStartDate(parseDate(merged.startDate));
        if (merged.started) setStarted(true);
        // Persist exercise progress immediately
        localStorage.setItem(exerciseProgressKey, JSON.stringify(merged.exerciseProgress));
        // Push merged result — use local variables, not stale closure values
        return cloudPush(syncEmail, {
          startDate: merged.startDate || dateKey(startDate),
          started: merged.started,
          progress: merged.progress,
          todayCompleted: merged.todayCompleted,
          completedDate: dateKey(today),
          exerciseProgress: merged.exerciseProgress,
          studyDates: mergedDates,
        }, syncLang);
      } else if (Object.keys(baseProgress).length > 0) {
        // No cloud data — push local
        return cloudPush(syncEmail, {
          startDate: dateKey(startDate), started: started, progress: baseProgress,
          todayCompleted: todayCompleted, completedDate: dateKey(today),
          exerciseProgress: baseExercise, studyDates: studyDates,
        }, syncLang);
      }
    }).then(function() {
      setSyncStatus('done');
      setSyncMsg('Synced');
      setTimeout(function() { setSyncStatus('idle'); setSyncMsg(''); }, 3000);
    }).catch(function() {
      setSyncStatus('error');
      setSyncMsg('Sync failed');
      setTimeout(function() { setSyncStatus('idle'); setSyncMsg(''); }, 3000);
    }).finally(function() {
      isSyncingRef.current = false;
    });
  }, []);

  // Cloud sync: push after state changes (debounced, blocked during initial sync)
  useEffect(function() {
    if (!syncEmail || !started || isSyncingRef.current) return;
    if (Object.keys(progress).length === 0) return;
    var timer = setTimeout(function() {
      if (isSyncingRef.current) return;
      cloudPush(syncEmail, {
        startDate: dateKey(startDate), started: started, progress: progress,
        todayCompleted: todayCompleted, completedDate: dateKey(today),
        exerciseProgress: exerciseProgress, studyDates: studyDates,
      }, syncLang).then(function(ok) {
        // B-006: surface auto-push failures instead of swallowing them.
        // The sync bar turns red and becomes a tap-to-retry button.
        if (!ok) { setSyncStatus('error'); setSyncMsg('Sync failed — tap to retry'); }
        else { setSyncStatus('idle'); setSyncMsg(''); }
      });
    }, 5000);
    return function() { clearTimeout(timer); };
  }, [syncEmail, startDate, started, progress, todayCompleted, today, exerciseProgress]);

  // Push on page hide/unload
  useEffect(function() {
    if (!syncEmail || !started || Object.keys(progress).length === 0) return;
    var handler = function(e) {
      if (e.type === 'visibilitychange' && document.visibilityState !== 'hidden') return;
      if (isSyncingRef.current) return;
      cloudPush(syncEmail, {
        startDate: dateKey(startDate), started: started, progress: progress,
        todayCompleted: todayCompleted, completedDate: dateKey(today),
        exerciseProgress: exerciseProgress, studyDates: studyDates,
      }, syncLang);
    };
    window.addEventListener('beforeunload', handler);
    window.addEventListener('visibilitychange', handler);
    return function() {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('visibilitychange', handler);
    };
  }, [syncEmail, started, startDate, progress, todayCompleted, today, exerciseProgress]);

  // B-006: "Sync now" — the sync bar in Nav emits this event on tap.
  // connectSync does a full pull-merge-push, exactly what a manual
  // retry should do.
  useEffect(function() {
    if (!syncEmail) return;
    var handler = function() { connectSync(syncEmail); };
    window.addEventListener('vocab-sync-now', handler);
    return function() { window.removeEventListener('vocab-sync-now', handler); };
  });

  function connectSync(email) {
    localStorage.setItem(syncEmailKey, email);
    setSyncEmail(email);
    setSyncStatus('syncing');
    setSyncMsg('Connecting...');
    cloudPull(email, syncLang).then(function(remote) {
      if (remote && remote.progress) {
        var localSnapshot = {
          progress: progress, exerciseProgress: exerciseProgress,
          todayCompleted: todayCompleted, completedDate: dateKey(today),
          startDate: dateKey(startDate), started: started,
        };
        var merged = mergeFullState(localSnapshot, remote, dateKey(today), VOCAB_DATA);
        setProgress(merged.progress);
        setExerciseProgress(merged.exerciseProgress);
        setTodayCompleted(merged.todayCompleted);
        if (remote.startDate) setStartDate(parseDate(remote.startDate));
        if (merged.started) setStarted(true);
        localStorage.setItem(exerciseProgressKey, JSON.stringify(merged.exerciseProgress));
        cloudPush(email, {
          startDate: merged.startDate || dateKey(startDate), started: merged.started,
          progress: merged.progress, todayCompleted: merged.todayCompleted,
          completedDate: dateKey(today), exerciseProgress: merged.exerciseProgress,
          studyDates: studyDates,
        }, syncLang);
        setSyncStatus('done');
        setSyncMsg('Connected & synced!');
      } else {
        cloudPush(email, {
          startDate: dateKey(startDate), started: started, progress: progress,
          todayCompleted: todayCompleted, completedDate: dateKey(today),
          exerciseProgress: exerciseProgress, studyDates: studyDates,
        }, syncLang);
        setSyncStatus('done');
        setSyncMsg('Connected! Progress uploaded.');
      }
      setTimeout(function() { setSyncStatus('idle'); setSyncMsg(''); }, 3000);
    }).catch(function() {
      setSyncStatus('error');
      setSyncMsg('Connection failed');
      setTimeout(function() { setSyncStatus('idle'); setSyncMsg(''); }, 3000);
    });
  }

  function disconnectSync() {
    localStorage.removeItem(syncEmailKey);
    setSyncEmail('');
    setSyncStatus('idle');
    setSyncMsg('');
  }

  // Reviews due today — based on when each batch was actually learned
  // Per-word review system: find all words due based on their individual memory stage
  const reviewsDue = useMemo(() => {
    var todayStr = dateKey(today);
    var dueWords = [];
    Object.keys(progress).forEach(function(k) {
      var wp = progress[k];
      if (!wp || !wp.learned || !wp.lastReview) return;
      // Resolve word index from key (word string)
      var idx = keyToIdx[k];
      if (idx === undefined) return; // key not in current vocab (legacy from different variant)
      // Background-only categories (e.g. A1.1 Cat 0, Anweisungen im Kurs)
      // are not reviewed or tested
      if (cfg.excludeCats && VOCAB_DATA.words[idx] && cfg.excludeCats.includes(VOCAB_DATA.words[idx][2])) return;
      var stage = getMemoryStage(wp);
      if (stage === 0) return;
      // Stage 5 (Mastered) still gets a 30-day final review
      var intervals = [0, 1, 3, 7, 14, 30]; // stage 0-5
      var interval = intervals[stage] || 1;
      var lastDate = parseDate(wp.lastReview);
      var daysSince = Math.round((today.getTime() - lastDate.getTime()) / 86400000);
      if (daysSince >= interval) {
        dueWords.push({
          idx: idx,
          stage: stage,
          daysSince: daysSince,
          daysOverdue: daysSince - interval
        });
      }
    });
    // Sort: most overdue first, then lowest stage first
    dueWords.sort(function(a, b) {
      if (b.daysOverdue !== a.daysOverdue) return b.daysOverdue - a.daysOverdue;
      return a.stage - b.stage;
    });
    return dueWords;
  }, [progress, today, keyToIdx]);

  function getWord(wi) {
    const w = words[wi];
    return {german: w[0], english: w[1], cat: cats[w[2]], type: VOCAB_DATA.types[w[3]], typeClass: TYPE_TAGS[w[3]], meta: w[4]};
  }

  // Opened from an exercise's "Review this word" link: show that one card.
  useEffect(function() {
    var link = readWordLink();
    if (!link || link.lang !== syncLang) return;
    clearWordLink();
    var wi = findWordIndex(words, link.word);
    if (wi < 0 || !started) return;
    setSessionWords([{idx: wi, ...getWord(wi)}]);
    setSessionType({type: 'lookup', batchIdx: 0, interval: 0});
    setCurrentIdx(0);
    setFlipped(false);
    setStreak(0);
    setView('session');
  }, []);

  function wordLink(wi) {
    return wordLinkHref(syncLang, words[wi][0]);
  }

  function startSession(type, batchIdx, interval) {
    if (type === 'review' && !batchIdx) {
      // Per-word review: pick up to 20 due words
      var dueWords = reviewsDue.slice(0, 20).map(function(dw) {
        return {idx: dw.idx, ...getWord(dw.idx), stage: dw.stage};
      });
      if (dueWords.length === 0) return;
      setSessionWords(dueWords);
      setSessionType({type: 'review', batchIdx: null, interval: null});
      setCurrentIdx(0);
      setFlipped(false);
      setStreak(0);
      setView("session");
      return;
    }
    const batchWords = batches[batchIdx - 1].map(wi => ({idx: wi, ...getWord(wi)}));
    setSessionWords(batchWords);
    setSessionType({type, batchIdx, interval});
    setCurrentIdx(0);
    setFlipped(false);
    setStreak(0);
    setView("session");
  }

  function rateWord(confidence) {
    const wi = sessionWords[currentIdx].idx;
    const key = pk(wi);
    setProgress(p => {
      var prev = p[key] || {};
      // Confidence reflects CURRENT ability, not peak — allow downgrades
      // Low ratings (1-2) reset confidence to reflect forgotten state
      var newConf = confidence;
      return {
        ...p,
        [key]: {
          ...prev,
          learned: true,
          confidence: newConf,
          lastReview: dateKey(today),
          reviews: [...(prev.reviews || []), {date: dateKey(today), conf: confidence, type: sessionType.type}]
        }
      };
    });

    if (confidence >= 3) setStreak(s => s + 1);
    else setStreak(0);

    if (currentIdx < sessionWords.length - 1) {
      setCurrentIdx(i => i + 1);
      setFlipped(false);
    } else {
      if (sessionType.type === "learn") {
        setTodayCompleted(tc => ({
          ...tc,
          learnCount: (tc.learnCount || 0) + 1,
          learnedBatches: [...(tc.learnedBatches || []), sessionType.batchIdx]
        }));
      } else if (sessionType.batchIdx) {
        const key = 'r' + sessionType.interval + '_b' + sessionType.batchIdx;
        setTodayCompleted(tc => ({...tc, reviews: {...tc.reviews, [key]: true}}));
      } else {
        // Per-word review — mark as completed with timestamp
        setTodayCompleted(tc => ({...tc, reviews: {...tc.reviews, ['words_' + dateKey(today) + '_' + Date.now()]: true}}));
      }
      recordStudyDay();
      setView("complete");
    }
  }

  function exportProgress() {
    const data = JSON.stringify({
      startDate: dateKey(startDate),
      started,
      progress,
      todayCompleted,
      completedDate: dateKey(today),
      exportDate: new Date().toISOString()
    }, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cfg.exportPrefix + dateKey(today) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importProgress(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.progress) setProgress(data.progress);
        if (data.startDate) {
          setStartDate(parseDate(data.startDate));
          setStarted(true);
        }
        if (data.todayCompleted && data.completedDate === dateKey(today)) {
          setTodayCompleted(data.todayCompleted);
        }
        toast.success("Progress loaded successfully!");
      } catch { toast.error("Invalid file format"); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function startExercise() {
    // Background-only categories (e.g. A1.1 Cat 0) are not tested
    var excludeCats = cfg.excludeCats;
    var selected = selectExerciseWords(progress, exerciseProgress, words, today, excludeCats);
    if (!selected || selected.length < 3) {
      toast.info('You need at least 5 learned words to start exercises. Keep learning!');
      return;
    }
    setExerciseLoading(true);

    // Sentence patterns: items come straight from the data (no AI sentences
    // or reading passage needed — the pattern IS the sentence).
    if (cfg.engine === 'pattern') {
      var pItems = generatePatternItems(selected, getWord, words, exerciseProgress, progress, excludeCats);
      setExerciseSession({items: pItems, targetWords: selected, startTime: Date.now()});
      setExerciseIdx(0);
      setExerciseAnswer('');
      setExerciseFeedback(null);
      setExerciseResults([]);
      setExerciseSelectedIdx(-1);
      setExerciseLoading(false);
      setView('exercise');
      return;
    }

    // Fetch AI sentences (async), then start exercise
    fetchExerciseSentences(selected, getWord).then(function(aiData) {
      // Extract passage from any word's data
      var aiPassage = null;
      if (aiData) {
        Object.keys(aiData).forEach(function(k) {
          if (aiData[k] && aiData[k].passage && !aiPassage) aiPassage = aiData[k].passage;
        });
      }
      var items = generateExerciseItems(selected, aiData, aiPassage, getWord, words, exerciseProgress, progress, excludeCats);
      setExerciseSession({items: items, targetWords: selected, startTime: Date.now()});
      setExerciseIdx(0);
      setExerciseAnswer('');
      setExerciseFeedback(null);
      setExerciseResults([]);
      setExerciseSelectedIdx(-1);
      setExerciseLoading(false);
      setView('exercise');
    }).catch(function() {
      // Fall back to exercises without AI
      var items = generateExerciseItems(selected, null, null, getWord, words, exerciseProgress, progress, excludeCats);
      setExerciseSession({items: items, targetWords: selected, startTime: Date.now()});
      setExerciseIdx(0);
      setExerciseAnswer('');
      setExerciseFeedback(null);
      setExerciseResults([]);
      setExerciseSelectedIdx(-1);
      setExerciseLoading(false);
      setView('exercise');
    });
  }

  function checkExerciseAnswer() {
    var item = exerciseSession.items[exerciseIdx];
    var correct = false;
    var userAnswer = '';

    if (item.type === 'write_sentence') {
      // AI judges and corrects the learner's own sentence (async).
      userAnswer = exerciseAnswer.trim();
      if (!userAnswer || exerciseChecking) return;
      setExerciseChecking(true);
      var sessionStart = exerciseSession.startTime;
      checkSentence(userAnswer, item.targetWord, item.hint, 'de', item.kind ? {kind: item.kind} : undefined).then(function(r) {
        setExerciseChecking(false);
        // Ignore a late reply if the learner left or restarted meanwhile
        if (!exerciseSessionRef.current || exerciseSessionRef.current.startTime !== sessionStart) return;
        recordExerciseAnswer(item, r.correct, userAnswer, {
          correctAnswer: r.corrected,
          aiFeedback: r.feedback,
          message: r.correct ? 'Great sentence!' : 'Almost — see the corrected sentence.'
        });
      }).catch(function() {
        setExerciseChecking(false);
        toast.error('Could not check your sentence right now. Please try again.');
      });
      return;
    } else if (item.type === 'reading_comprehension') {
      if (exerciseSelectedIdx < 0) return;
      userAnswer = item.options[exerciseSelectedIdx].text;
      correct = exerciseSelectedIdx === item.correctIdx;
    } else if (item.type === 'multiple_choice' || item.type === 'reading' || item.type === 'reverse_choice' || item.type === 'listening') {
      if (exerciseSelectedIdx < 0) return;
      userAnswer = item.options[exerciseSelectedIdx].text;
      var normalizeOpt = function(s) { return s.toLowerCase().replace(/[-\s]+/g, ' ').trim(); };
      var selectedOpt = item.options[exerciseSelectedIdx];
      var correctOpts = item.options.filter(function(o) { return o.wi === item.wordIdx; });
      correct = selectedOpt.wi === item.wordIdx ||
        correctOpts.some(function(co) { return normalizeOpt(selectedOpt.text) === normalizeOpt(co.text); });
    } else if (item.accepted) {
      // Sentence patterns (fill_blank / word_order): whole-sentence match
      // against every accepted wording; see normalizeAnswer.
      userAnswer = exerciseAnswer.trim();
      correct = matchesAccepted(userAnswer, item.accepted.concat([item.correctAnswer]));
    } else if (item.type === 'conjugation') {
      userAnswer = exerciseAnswer.trim();
      var normalize = function(s) { return s.toLowerCase().replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/[ß]/g,'ss').replace(/[.,!?;:]+$/, '').trim(); };
      // Accept just the conjugated form OR pronoun + conjugated form
      var fullForm = (item.pronoun || '') + ' ' + item.correctAnswer;
      correct = normalize(userAnswer) === normalize(item.correctAnswer) ||
                normalize(userAnswer) === normalize(fullForm);
    } else {
      userAnswer = exerciseAnswer.trim();
      var normalize = function(s) { return s.toLowerCase().replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/[ß]/g,'ss').replace(/[.,!?;:]+$/, '').trim(); };
      var stripArticle = function(s) { return s.replace(/^(der|die|das)\s+/i, ''); };
      var stripParen = function(s) { return s.replace(/\s*\([^)]*\)\s*/g, '').trim(); };
      var na = normalize(stripParen(userAnswer));
      var nc = normalize(stripParen(item.correctAnswer));
      var fullGerman = stripParen(item.fullAnswer || item.germanWord || '');
      correct = na === nc ||
                normalize(stripArticle(stripParen(userAnswer))) === nc ||
                na === normalize(fullGerman) ||
                normalize(stripArticle(stripParen(userAnswer))) === normalize(stripArticle(fullGerman));
    }

    var correctAnswerText = item.fullAnswer || item.correctAnswer || '';
    if (item.options) {
      // Find correct answer from options (works for reading_comprehension and multiple_choice)
      var correctOpt = item.correctIdx >= 0 && item.options[item.correctIdx]
        ? item.options[item.correctIdx]
        : item.options.find(function(o) { return o.isCorrect; });
      if (correctOpt) correctAnswerText = correctOpt.text;
    }

    recordExerciseAnswer(item, correct, userAnswer, {
      correctAnswer: correctAnswerText,
      message: correct
        ? ['Great job!', 'Correct!', 'Well done!', 'Exactly right!'][Math.floor(Math.random() * 4)]
        : 'The correct answer is: ' + correctAnswerText
    });
  }

  // Shows feedback and records the answer. Only the first attempt at an
  // item counts toward results and the review schedule; a wrong answer
  // queues the same word again 3–5 questions later (exercise-core).
  function recordExerciseAnswer(item, correct, userAnswer, fb) {
    setExerciseFeedback({
      correct: correct,
      userAnswer: userAnswer || '(no answer)',
      correctAnswer: fb.correctAnswer,
      aiFeedback: fb.aiFeedback || null,
      sentence: item.sentence || null,
      message: fb.message
    });

    if (!correct) {
      setExerciseSession(function(s) {
        if (!s) return s; // left the exercise while the AI was checking
        return Object.assign({}, s, {items: scheduleRetry(s.items, exerciseIdx, item)});
      });
    }
    if (item.isRetry) return;

    setExerciseResults(function(prev) {
      return prev.concat([{
        wordIdx: item.wordIdx,
        type: item.type,
        level: item.level,
        correct: correct,
        answer: userAnswer
      }]);
    });

    // Update exercise progress for this word (keyed by word string)
    var exKey = pk(item.wordIdx);
    setExerciseProgress(function(prev) {
      return Object.assign({}, prev, {
        [exKey]: nextExerciseRecord(prev[exKey], correct, today, addDays, dateKey)
      });
    });

    // Propagate exercise correct count to main progress (for memory stage calculation)
    if (correct) {
      var key = pk(item.wordIdx);
      setProgress(function(p) {
        var prev = p[key] || {};
        return Object.assign({}, p, {
          [key]: Object.assign({}, prev, {
            exerciseCorrect: (prev.exerciseCorrect || 0) + 1
          })
        });
      });
    }
  }

  function explainWrongAnswer() {
    if (exerciseWhyLoading || exerciseWhyText) return;
    var item = exerciseSession.items[exerciseIdx];
    var userAns = exerciseFeedback.userAnswer;
    var correctAns = exerciseFeedback.correctAnswer;
    setExerciseWhyLoading(true);
    fetch(SUPABASE_URL + '/functions/v1/generate-ipa-def', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        mode: 'explain-mistake',
        userAnswer: userAns,
        correctAnswer: correctAns,
        germanWord: item.germanWord || item.word || correctAns,
        englishWord: item.englishWord || item.english || '',
        exerciseType: item.type,
        sentence: item.sentence || ''
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      setExerciseWhyText(data.explanation || 'Could not explain.');
      setExerciseWhyLoading(false);
    })
    .catch(function() {
      setExerciseWhyText('Could not load explanation.');
      setExerciseWhyLoading(false);
    });
  }

  function nextExerciseItem() {
    if (exerciseIdx + 1 >= exerciseSession.items.length) {
      recordStudyDay();
      setView('exercise-complete');
    } else {
      setExerciseIdx(exerciseIdx + 1);
      setExerciseAnswer('');
      setExerciseFeedback(null);
      setExerciseSelectedIdx(-1);
      setExerciseWhyText('');
      setExerciseWhyLoading(false);
    }
  }

  function handleNavigate(viewId) {
    // Reset exercise state when leaving exercise views
    if (view === 'exercise' || view === 'exercise-complete') {
      setExerciseSession(null);
      setExerciseIdx(0);
      setExerciseAnswer('');
      setExerciseFeedback(null);
      setExerciseSelectedIdx(-1);
      setExerciseResults([]);
      setExerciseWhyText('');
      setExerciseWhyLoading(false);
    }
    setView(viewId);
  }

  var loadingFallback = <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'60vh'}}>
    <div style={{width:'32px',height:'32px',border:'3px solid var(--border)',borderTopColor:'var(--sage)',borderRadius:'50%',animation:'spin 0.6s linear infinite'}} />
  </div>;

  // ===== SETUP SCREEN =====
  if (!started) {
    return <Suspense fallback={loadingFallback}><SetupScreen
      startDate={startDate}
      setStartDate={setStartDate}
      setStarted={setStarted}
      importProgress={importProgress}
      connectSync={connectSync}
      syncStatus={syncStatus}
      syncMsg={syncMsg}
      courseFlag={'🇩🇪'}
      courseTitle={cfg.title}
      courseDesc={cfg.desc}
      itemLabel={cfg.itemLabel}
      newPerDay={Math.round(VOCAB_DATA.words.length / Math.max(1, batches.length))}
      weeks={Math.ceil(batches.length / 6)}
    /></Suspense>;
  }

  // ===== SESSION VIEW =====
  if (view === "session" && sessionWords.length > 0) {
    return <Suspense fallback={loadingFallback}><SessionView
      direction={direction}
      sessionWords={sessionWords}
      sessionType={sessionType}
      currentIdx={currentIdx}
      flipped={flipped}
      setFlipped={setFlipped}
      streak={streak}
      rateWord={rateWord}
      setView={setView}
      wordImage={wordImage}
      imageLoading={imageLoading}
      wordIPA={wordIPA}
      wordDefinition={wordDefinition}
      defImage={defImage}
      wordExtras={wordExtras}
      progress={progress}
      aiExplanation={aiExplanation}
      aiLoading={aiLoading}
      aiError={aiError}
      aiSaveStatus={aiSaveStatus}
      setAiExplanation={setAiExplanation}
      setAiLoading={setAiLoading}
      setAiError={setAiError}
      setAiSaveStatus={setAiSaveStatus}
      emojis={cfg.emojis ? WORD_EMOJIS : undefined}
      onGenerateImage={function() {
        var w = sessionWords[currentIdx];
        if (!w) return;
        setImageLoading(true);
        generateWordImage(w.german, w.english, w.type).then(function(img) {
          setWordImage(img);
          setImageLoading(false);
        }).catch(function() { setImageLoading(false); });
      }}
    /></Suspense>;
  }

  // ===== COMPLETION SCREEN =====
  if (view === "complete") {
    return <Suspense fallback={loadingFallback}><CompleteView
      sessionWords={sessionWords}
      sessionType={sessionType}
      progress={progress}
      setView={setView}
      emojis={cfg.emojis ? WORD_EMOJIS : undefined}
    /></Suspense>;
  }

  // ===== EXERCISE VIEW =====
  if (view === 'exercise' && exerciseSession) {
    return <Suspense fallback={loadingFallback}><ExerciseView
      exerciseSession={exerciseSession}
      exerciseIdx={exerciseIdx}
      exerciseAnswer={exerciseAnswer}
      setExerciseAnswer={setExerciseAnswer}
      exerciseFeedback={exerciseFeedback}
      exerciseSelectedIdx={exerciseSelectedIdx}
      setExerciseSelectedIdx={setExerciseSelectedIdx}
      exerciseResults={exerciseResults}
      exerciseWhyLoading={exerciseWhyLoading}
      exerciseWhyText={exerciseWhyText}
      checkExerciseAnswer={checkExerciseAnswer}
      nextExerciseItem={nextExerciseItem}
      explainWrongAnswer={explainWrongAnswer}
      setView={setView}
      exerciseLoading={exerciseLoading}
      exerciseChecking={exerciseChecking}
      wordLink={wordLink}
      lang="de"
    /></Suspense>;
  }

  // ===== EXERCISE COMPLETE =====
  if (view === 'exercise-complete' && exerciseSession) {
    return <Suspense fallback={loadingFallback}><ExerciseComplete
      exerciseSession={exerciseSession}
      exerciseResults={exerciseResults}
      getWord={getWord}
      wordLink={wordLink}
      totalLearned={totalLearned}
      startExercise={startExercise}
      setView={setView}
    /></Suspense>;
  }

  // ===== DASHBOARD =====
  if (view === "dashboard") {
    return <Suspense fallback={loadingFallback}><Dashboard
      onNavigate={handleNavigate}
      onHome={onHome}
      syncEmail={syncEmail}
      syncStatus={syncStatus}
      syncMsg={syncMsg}
      today={today}
      studyDay={studyDay}
      weekNum={weekNum}
      phase={phase}
      phaseNames={phaseNames}
      phaseColors={phaseColors}
      totalLearned={totalLearned}
      batchesCompleted={batchesCompleted}
      batches={batches}
      scheduleGap={scheduleGap}
      todayCompleted={todayCompleted}
      nextBatch={nextBatch}
      reviewsDue={reviewsDue}
      startSession={startSession}
      getWord={getWord}
      dailyStreak={dailyStreak}
      weekDays={weekDays}
      exerciseStats={exerciseStats}
      exerciseLoading={exerciseLoading}
      startExercise={startExercise}
      startDate={startDate}
      isSunday={today.getDay() === 0}
      totalWords={words.length}
      cats={cats}
      labelByCat={cfg.lektionFocus}
      reviewNudge={cfg.engine === 'pattern'}
      itemLabel={cfg.itemLabel}
      groupLabel={cfg.groupLabel}
      words={words}
      focusCat={focusCat}
      lektionStats={lektionStats}
      setFocusCat={setFocusCat}
    /></Suspense>;
  }

  // ===== PROGRESS VIEW =====
  if (view === "progress") {
    return <Suspense fallback={loadingFallback}><ProgressView
      onNavigate={handleNavigate}
      onHome={onHome}
      syncEmail={syncEmail}
      syncStatus={syncStatus}
      syncMsg={syncMsg}
      progress={progress}
      totalLearned={totalLearned}
      words={words}
      cats={cats}
    /></Suspense>;
  }

  // ===== BROWSE VIEW =====
  if (view === "browse") {
    return <Suspense fallback={loadingFallback}><BrowseView
      onNavigate={handleNavigate}
      onHome={onHome}
      syncEmail={syncEmail}
      syncStatus={syncStatus}
      syncMsg={syncMsg}
      words={words}
      progress={progress}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      filterType={filterType}
      setFilterType={setFilterType}
      typeNames={VOCAB_DATA.types}
      getWord={getWord}
      setSessionWords={setSessionWords}
      setSessionType={setSessionType}
      setCurrentIdx={setCurrentIdx}
      setFlipped={setFlipped}
      setStreak={setStreak}
      setView={setView}
      emojis={cfg.emojis ? WORD_EMOJIS : undefined}
    /></Suspense>;
  }

  // ===== SETTINGS =====
  if (view === "settings") {
    return <Suspense fallback={loadingFallback}><SettingsView
      onNavigate={handleNavigate}
      onHome={onHome}
      syncEmail={syncEmail}
      syncStatus={syncStatus}
      syncMsg={syncMsg}
      startDate={startDate}
      setStartDate={setStartDate}
      studyDay={studyDay}
      weekNum={weekNum}
      phase={phase}
      connectSync={connectSync}
      disconnectSync={disconnectSync}
      pushEnabled={pushEnabled}
      setPushEnabled={setPushEnabled}
      pushLoading={pushLoading}
      setPushLoading={setPushLoading}
      pushSubscription={pushSubscription}
      setPushSubscription={setPushSubscription}
      reminderHour={reminderHour}
      setReminderHour={setReminderHour}
      reminderHourKey="vocab_reminder_hour"
      directionToggle={cfg.directionToggle ? {value: direction, onChange: setDirection} : null}
      resetStep={resetStep}
      setResetStep={setResetStep}
      resetPass={resetPass}
      setResetPass={setResetPass}
      resetError={resetError}
      setResetError={setResetError}
      setProgress={setProgress}
      setTodayCompleted={setTodayCompleted}
      exportProgress={exportProgress}
      importProgress={importProgress}
    /></Suspense>;
  }

  return null;
}

export default App;
