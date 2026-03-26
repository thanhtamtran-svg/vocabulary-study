import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { VOCAB_DATA } from './vocab-data';
import { SUPABASE_URL, SUPABASE_KEY } from './lib/supabase';
import {
  TYPE_TAGS, TYPE_NAMES, REVIEW_LABELS, REVIEW_METHODS,
  DUAL_CODING_TIPS, SCIENCE_TIPS, MEMORY_STAGES,
  PRONOUNS, PRONOUN_KEYS, SENTENCE_TEMPLATES,
  STORAGE_KEY, SYNC_EMAIL_KEY, VAPID_PUBLIC_KEY
} from './lib/constants';
import { dateKey, parseDate, formatDate, addDays, getStudyDay, todayDate } from './lib/dates';
import { speakGerman } from './lib/speech';
import { loadState, saveState } from './lib/storage';
import { mergeProgress, cloudPull, cloudPush } from './lib/sync';
import { fetchWordImage, fetchCachedExplanation, fetchIPAAndDefinition, fetchExplanation } from './lib/api';
import { getMemoryStage } from './lib/memory-stages';
import {
  selectExerciseWords, getDistractors, makeOptions, makeReverseOptions,
  getAiSentence, generateExerciseItems, fetchExerciseSentences
} from './lib/exercise-engine';

import { useToast } from './components/Toast';
import SetupScreen from './views/SetupScreen';
import Dashboard from './views/Dashboard';
import SessionView from './views/SessionView';
import CompleteView from './views/CompleteView';
import ExerciseView from './views/ExerciseView';
import ExerciseComplete from './views/ExerciseComplete';
import ProgressView from './views/ProgressView';
import BrowseView from './views/BrowseView';
import SettingsView from './views/SettingsView';

// ===== MAIN APP =====
function App({onHome}) {
  const toast = useToast();
  const saved = useMemo(() => loadState(), []);

  const [view, setView] = useState("dashboard");
  const [startDate, setStartDate] = useState(() => {
    if (saved?.startDate) return parseDate(saved.startDate);
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });
  const [started, setStarted] = useState(() => saved?.started || false);
  const [progress, setProgress] = useState(() => saved?.progress || {});
  const [todayCompleted, setTodayCompleted] = useState(() => {
    if (saved?.todayCompleted && saved?.completedDate === dateKey(todayDate())) {
      return saved.todayCompleted;
    }
    return {learnCount: 0, learnedBatches: [], reviews: {}};
  });

  // Daily streak state
  const [studyDates, setStudyDates] = useState(() => {
    try { var d = localStorage.getItem('vocab_study_dates'); return d ? JSON.parse(d) : []; } catch { return []; }
  });

  // Calculate daily streak with 2-day freeze (rest days don't count as missed)
  const dailyStreak = useMemo(() => {
    if (!studyDates.length) return {count: 0, status: 'none', frozenDays: 0, studiedToday: false};
    var sorted = studyDates.slice().sort().reverse(); // most recent first
    var todayStr = dateKey(todayDate());
    var studiedToday = sorted[0] === todayStr;
    var isRestDay = todayDate().getDay() === 0; // Sunday = rest day

    // Count non-rest missed days since last study
    var lastStudy = parseDate(sorted[0]);
    var checkDate = new Date();
    checkDate.setHours(0,0,0,0);
    var dateSet = new Set(sorted);

    // Count actual missed days (excluding Sundays) between last study and today
    var realMissed = 0;
    if (!studiedToday) {
      var d = new Date(checkDate);
      d.setDate(d.getDate() - 1); // start from yesterday
      while (d >= lastStudy) {
        var dk = dateKey(d);
        if (!dateSet.has(dk) && d.getDay() !== 0) { // not studied and not Sunday
          realMissed++;
        }
        if (dateSet.has(dk)) break; // found last study day
        d.setDate(d.getDate() - 1);
      }
    }

    // Build streak counting backwards
    var count = 0;
    var frozenDays = 0;
    var consecutiveMissed = 0;
    var d2 = new Date(checkDate);
    if (!studiedToday) d2.setDate(d2.getDate() - 1);

    while (true) {
      var dk2 = dateKey(d2);
      var isSunday = d2.getDay() === 0;
      if (dateSet.has(dk2)) {
        count++;
        consecutiveMissed = 0;
        d2.setDate(d2.getDate() - 1);
      } else if (isSunday) {
        // Sundays don't count as missed — just skip
        d2.setDate(d2.getDate() - 1);
      } else {
        consecutiveMissed++;
        if (consecutiveMissed > 2) break; // 3+ non-rest missed = streak broken
        frozenDays++;
        d2.setDate(d2.getDate() - 1);
      }
      if (count > 365) break;
    }

    var status = 'active';
    if (!studiedToday && !isRestDay) {
      if (realMissed >= 3) { status = 'lost'; count = 0; frozenDays = 0; }
      else if (realMissed === 2) status = 'danger';
      else if (realMissed === 1) status = 'warning';
    }
    // On rest day, don't warn — streak is safe
    if (isRestDay && !studiedToday) status = 'rest';

    return {count: count, status: status, frozenDays: frozenDays, studiedToday: studiedToday};
  }, [studyDates]);

  // Record today as a study day when user completes a batch or exercise
  function recordStudyDay() {
    var todayStr = dateKey(todayDate());
    setStudyDates(function(prev) {
      if (prev.includes(todayStr)) return prev;
      var updated = prev.concat([todayStr]);
      localStorage.setItem('vocab_study_dates', JSON.stringify(updated));
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
    var dateSet = new Set(studyDates);
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
  }, [studyDates]);

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
          // Fetch reminder hour from DB
          fetch(SUPABASE_URL + '/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(sub.endpoint) + '&select=reminder_hour&active=eq.true', {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
          }).then(function(r) { return r.json(); }).then(function(rows) {
            if (rows && rows.length > 0 && rows[0].reminder_hour != null) {
              setReminderHour(rows[0].reminder_hour);
              localStorage.setItem('vocab_reminder_hour', rows[0].reminder_hour);
            }
          }).catch(function() {});
        }
      });
    });
    // Register service worker
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      var basePath = new URL('.', window.location.href).pathname;
      navigator.serviceWorker.register(basePath + 'sw.js?v=5').catch(function() {});
    }
  }, []);

  // Cloud sync state
  const [syncEmail, setSyncEmail] = useState(() => {
    try { return localStorage.getItem(SYNC_EMAIL_KEY) || ''; } catch { return ''; }
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
    setImageLoading(true);
    fetchWordImage(w.german, w.english, w.type).then(function(img) {
      if (cancelled) return;
      setWordImage(img);
      setImageLoading(false);
    }).catch(function() { if (!cancelled) setImageLoading(false); });
    // Auto-load cached explanation (no API cost)
    setAiExplanation('');
    setAiError('');
    setAiLoading(false);
    setAiSaveStatus('');
    fetchCachedExplanation(w.german).then(function(text) {
      if (cancelled) return;
      if (text) {
        setAiExplanation(text);
        setAiSaveStatus('saved');
      }
    });
    // Fetch IPA + German definition (single call, cached)
    setWordIPA('');
    setWordDefinition('');
    setDefImage(null);
    fetchIPAAndDefinition(w.german, w.english).then(function(result) {
      if (cancelled) return;
      if (result.ipa) setWordIPA(result.ipa);
      if (result.definition) {
        setWordDefinition(result.definition);
        // Generate image based on definition sentence (use definition as key for caching)
        var defKey = 'def ' + w.german.toLowerCase();
        // Check cache first
        fetch(SUPABASE_URL + '/rest/v1/vocab_images?word=eq.' + encodeURIComponent(defKey) + '&select=image_base64', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        }).then(function(r) { return r.ok ? r.json() : []; }).then(function(cached) {
          if (cancelled) return;
          if (cached && cached.length > 0 && cached[0].image_base64) {
            setDefImage({ url: cached[0].image_base64 });
          } else {
            // Generate via edge function with definition as prompt
            fetch(SUPABASE_URL + '/functions/v1/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                word: defKey,
                english: result.definition,
                type: 'definition'
              })
            }).then(function(r) { return r.ok ? r.json() : null; }).then(function(data) {
              if (cancelled) return;
              if (data && data.image) setDefImage({ url: data.image });
            }).catch(function() {});
          }
        });
      }
    });
    // Autoplay pronunciation
    speakGerman(w.german);
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
    try { var d = localStorage.getItem('vocab_exercise_progress'); return d ? JSON.parse(d) : {}; } catch { return {}; }
  }); // {wordIdx: {attempts, correct, lastExercise, nextReview, streak}}
  const [exerciseSelectedIdx, setExerciseSelectedIdx] = useState(-1); // for multiple choice

  // Save exercise progress
  useEffect(function() {
    try { localStorage.setItem('vocab_exercise_progress', JSON.stringify(exerciseProgress)); } catch(e) {}
  }, [exerciseProgress]);

  // Browse state (hoisted to avoid hooks-in-conditional bug)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState(-1);

  const words = VOCAB_DATA.words;
  const batches = VOCAB_DATA.batches;
  const cats = VOCAB_DATA.cats;
  const today = useMemo(todayDate, []);
  const studyDay = useMemo(() => getStudyDay(startDate, today), [startDate, today]);

  // Next batch = first batch where not all words are learned
  const nextBatch = useMemo(() => {
    for (var i = 0; i < batches.length; i++) {
      var allLearned = batches[i].every(function(wi) { return progress[wi]?.learned; });
      if (!allLearned) return i + 1; // 1-indexed
    }
    return null; // all done
  }, [progress, batches]);

  const batchesCompleted = useMemo(() => {
    var count = 0;
    for (var i = 0; i < batches.length; i++) {
      if (batches[i].every(function(wi) { return progress[wi]?.learned; })) count++;
      else break;
    }
    return count;
  }, [progress, batches]);

  // Schedule tracking: expected batch by studyDay vs actual
  const expectedBatch = Math.min(studyDay, batches.length);
  const scheduleGap = batchesCompleted - expectedBatch; // positive = ahead, negative = behind

  const weekNum = Math.ceil(studyDay / 6) || 1;
  const phase = weekNum <= 4 ? 1 : weekNum <= 14 ? 2 : weekNum <= 24 ? 3 : 4;
  const phaseNames = ["","Foundation","Acceleration","Peak Input","Consolidation"];
  const phaseColors = ["","#27AE60","#2E86C1","#8E44AD","#F39C12"];

  const totalLearned = useMemo(() =>
    Object.keys(progress).filter(k => progress[k].learned).length
  , [progress]);

  const totalMastered = useMemo(() =>
    Object.keys(progress).filter(k => getMemoryStage(progress[k]) >= 5).length
  , [progress]);

  // ===== EXERCISE GENERATOR =====
  // Compute exercise stats for dashboard
  var exerciseStats = useMemo(function() {
    var weak = [], due = [], strong = [], neverPracticed = [];
    Object.keys(progress).forEach(function(k) {
      if (!progress[k] || !progress[k].learned) return;
      var wi = parseInt(k);
      var ep = exerciseProgress[wi] || {};
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
    });
    return {weak: weak, due: due, strong: strong, neverPracticed: neverPracticed,
      totalPracticed: totalLearned - neverPracticed.length};
  }, [progress, exerciseProgress, totalLearned, today]);

  const [exerciseLoading, setExerciseLoading] = useState(false);

  // Autoplay pronunciation for listening exercises
  useEffect(function() {
    if (view !== 'exercise' || !exerciseSession) return;
    var item = exerciseSession.items[exerciseIdx];
    if (item && item.type === 'listening' && !exerciseFeedback) {
      setTimeout(function() { speakGerman(item.germanWord); }, 300);
    }
  }, [view, exerciseIdx, exerciseSession]);

  // Enter key handler for exercise view (global — for non-input types like multiple choice)
  useEffect(function() {
    if (view !== 'exercise' || !exerciseSession) return;
    function handleKeyDown(e) {
      if (e.key !== 'Enter') return;
      // Don't interfere with text input (it has its own handler)
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

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

  // Backfill studyDates from progress review history (runs whenever progress changes)
  useEffect(function() {
    var dates = new Set(studyDates);
    var before = dates.size;
    Object.keys(progress).forEach(function(k) {
      var wp = progress[k];
      if (!wp) return;
      if (wp.reviews && Array.isArray(wp.reviews)) {
        wp.reviews.forEach(function(r) { if (r.date) dates.add(r.date); });
      }
      if (wp.lastReview) dates.add(wp.lastReview);
    });
    if (dates.size > before) {
      var merged = Array.from(dates).sort();
      localStorage.setItem('vocab_study_dates', JSON.stringify(merged));
      setStudyDates(merged);
    }
  }, [progress]);

  // Auto-save to localStorage
  useEffect(() => {
    saveState({
      startDate: dateKey(startDate),
      started,
      progress,
      todayCompleted,
      completedDate: dateKey(today)
    });
  }, [startDate, started, progress, todayCompleted, today]);

  // Cloud sync: pull on mount if email is set
  useEffect(function() {
    if (!syncEmail || syncRef.current) return;
    syncRef.current = true;
    setSyncStatus('syncing');
    setSyncMsg('Syncing...');
    cloudPull(syncEmail).then(function(remote) {
      if (remote && remote.progress) {
        var merged = mergeProgress(progress, remote.progress);
        setProgress(merged);
        if (remote.startDate && !saved?.startDate) setStartDate(parseDate(remote.startDate));
        if (remote.started) setStarted(true);
        if (remote.todayCompleted && remote.completedDate === dateKey(today)) {
          setTodayCompleted(function(tc) {
            var rLearnCount = remote.todayCompleted.learnCount || (remote.todayCompleted.learn ? 1 : 0);
            return {
              learnCount: Math.max(tc.learnCount || 0, rLearnCount),
              learnedBatches: [...new Set([...(tc.learnedBatches || []), ...(remote.todayCompleted.learnedBatches || [])])],
              reviews: {...(remote.todayCompleted.reviews || {}), ...(tc.reviews || {})}
            };
          });
        }
        // Merge study dates (streak data)
        if (remote.studyDates && Array.isArray(remote.studyDates)) {
          setStudyDates(function(local) {
            var merged = [...new Set([...local, ...remote.studyDates])].sort();
            localStorage.setItem('vocab_study_dates', JSON.stringify(merged));
            return merged;
          });
        }
        // Merge exercise progress
        if (remote.exerciseProgress) {
          setExerciseProgress(function(local) {
            var merged = {...local};
            Object.keys(remote.exerciseProgress).forEach(function(k) {
              if (!merged[k]) { merged[k] = remote.exerciseProgress[k]; return; }
              var l = merged[k];
              var r = remote.exerciseProgress[k];
              // Merge: take max of each field to preserve progress from both devices
              merged[k] = {
                attempts: Math.max(l.attempts || 0, r.attempts || 0),
                correct: Math.max(l.correct || 0, r.correct || 0),
                streak: Math.max(l.streak || 0, r.streak || 0),
                lastExercise: (l.lastExercise || '') > (r.lastExercise || '') ? l.lastExercise : r.lastExercise,
                nextReview: (l.nextReview || '') < (r.nextReview || '') ? l.nextReview : r.nextReview
              };
            });
            localStorage.setItem('vocab_exercise_progress', JSON.stringify(merged));
            return merged;
          });
        }
        setSyncStatus('done');
        setSyncMsg('Synced from cloud');
      } else {
        setSyncStatus('done');
        setSyncMsg('No cloud data yet');
      }
      setTimeout(function() { setSyncStatus('idle'); setSyncMsg(''); }, 3000);
    }).catch(function() {
      setSyncStatus('error');
      setSyncMsg('Sync failed');
      setTimeout(function() { setSyncStatus('idle'); setSyncMsg(''); }, 3000);
    });
  }, []);

  // Cloud sync: push after state changes (debounced)
  useEffect(function() {
    if (!syncEmail || !started) return;
    var timer = setTimeout(function() {
      cloudPush(syncEmail, {
        startDate: dateKey(startDate),
        started: started,
        progress: progress,
        todayCompleted: todayCompleted,
        completedDate: dateKey(today),
        studyDates: studyDates,
        exerciseProgress: exerciseProgress
      });
    }, 5000);
    return function() { clearTimeout(timer); };
  }, [syncEmail, startDate, started, progress, todayCompleted, today, studyDates, exerciseProgress]);

  // Sync on page unload to prevent data loss
  useEffect(function() {
    if (!syncEmail || !started) return;
    function handleUnload() {
      cloudPush(syncEmail, {
        startDate: dateKey(startDate), started: started, progress: progress,
        todayCompleted: todayCompleted, completedDate: dateKey(today),
        studyDates: studyDates, exerciseProgress: exerciseProgress
      });
    }
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') handleUnload();
    });
    return function() { window.removeEventListener('beforeunload', handleUnload); };
  }, [syncEmail, started, startDate, progress, todayCompleted, today, studyDates, exerciseProgress]);

  function connectSync(email) {
    localStorage.setItem(SYNC_EMAIL_KEY, email);
    setSyncEmail(email);
    setSyncStatus('syncing');
    setSyncMsg('Connecting...');
    cloudPull(email).then(function(remote) {
      if (remote && remote.progress) {
        var merged = mergeProgress(progress, remote.progress);
        setProgress(merged);
        if (remote.startDate) setStartDate(parseDate(remote.startDate));
        if (remote.started) setStarted(true);
        setSyncStatus('done');
        setSyncMsg('Connected & synced!');
      } else {
        cloudPush(email, {
          startDate: dateKey(startDate),
          started: started,
          progress: progress,
          todayCompleted: todayCompleted,
          completedDate: dateKey(today)
        });
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
    localStorage.removeItem(SYNC_EMAIL_KEY);
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
      var stage = getMemoryStage(wp);
      if (stage === 0) return;
      // Stage 5 (Mastered) still gets a 30-day final review
      var intervals = [0, 1, 3, 7, 14, 30]; // stage 0-5
      var interval = intervals[stage] || 1;
      var lastDate = parseDate(wp.lastReview);
      var daysSince = Math.round((today.getTime() - lastDate.getTime()) / 86400000);
      if (daysSince >= interval) {
        dueWords.push({
          idx: parseInt(k),
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
  }, [progress, today]);

  function getWord(wi) {
    const w = words[wi];
    return {german: w[0], english: w[1], cat: cats[w[2]], type: TYPE_NAMES[w[3]], typeClass: TYPE_TAGS[w[3]]};
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
    setProgress(p => {
      var prev = p[wi] || {};
      // Confidence reflects CURRENT ability, not peak — allow downgrades
      // Low ratings (1-2) reset confidence to reflect forgotten state
      var newConf = confidence;
      return {
        ...p,
        [wi]: {
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
    a.download = 'german_progress_' + dateKey(today) + '.json';
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
    var selected = selectExerciseWords(progress, exerciseProgress, words, today);
    if (!selected || selected.length < 3) {
      toast.info('You need at least 5 learned words to start exercises. Keep learning!');
      return;
    }
    setExerciseLoading(true);

    // Fetch AI sentences (async), then start exercise
    fetchExerciseSentences(selected, getWord).then(function(aiData) {
      // Extract passage from any word's data
      var aiPassage = null;
      if (aiData) {
        Object.keys(aiData).forEach(function(k) {
          if (aiData[k] && aiData[k].passage && !aiPassage) aiPassage = aiData[k].passage;
        });
      }
      var items = generateExerciseItems(selected, aiData, aiPassage, getWord, words, exerciseProgress, progress);
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
      var items = generateExerciseItems(selected, null, null, getWord, words, exerciseProgress, progress);
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

    if (item.type === 'reading_comprehension') {
      if (exerciseSelectedIdx < 0) return;
      userAnswer = item.options[exerciseSelectedIdx].text;
      correct = exerciseSelectedIdx === item.correctIdx;
    } else if (item.type === 'multiple_choice' || item.type === 'reading' || item.type === 'reverse_choice' || item.type === 'listening') {
      if (exerciseSelectedIdx < 0) return;
      userAnswer = item.options[exerciseSelectedIdx].text;
      correct = item.options[exerciseSelectedIdx].wi === item.wordIdx;
    } else if (item.type === 'fill_english') {
      userAnswer = exerciseAnswer.trim();
      correct = userAnswer.toLowerCase() === item.correctAnswer.toLowerCase();
    } else if (item.type === 'conjugation') {
      userAnswer = exerciseAnswer.trim();
      var normalize = function(s) { return s.toLowerCase().replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/[ß]/g,'ss').trim(); };
      // Accept just the conjugated form OR pronoun + conjugated form
      var fullForm = (item.pronoun || '') + ' ' + item.correctAnswer;
      correct = normalize(userAnswer) === normalize(item.correctAnswer) ||
                userAnswer.toLowerCase().trim() === item.correctAnswer.toLowerCase() ||
                normalize(userAnswer) === normalize(fullForm) ||
                userAnswer.toLowerCase().trim() === fullForm.toLowerCase();
    } else {
      userAnswer = exerciseAnswer.trim();
      var normalize = function(s) { return s.toLowerCase().replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/[ß]/g,'ss').trim(); };
      var stripArticle = function(s) { return s.replace(/^(der|die|das)\s+/i, ''); };
      var na = normalize(userAnswer);
      var nc = normalize(item.correctAnswer);
      var fullGerman = item.fullAnswer || item.germanWord || '';
      correct = na === nc ||
                userAnswer.toLowerCase().trim() === item.correctAnswer.toLowerCase() ||
                normalize(stripArticle(userAnswer)) === nc ||
                na === normalize(fullGerman) ||
                normalize(stripArticle(userAnswer)) === normalize(stripArticle(fullGerman));
    }

    var correctAnswerText = item.fullAnswer || item.correctAnswer || '';
    if (item.options) {
      // Find correct answer from options (works for reading_comprehension and multiple_choice)
      var correctOpt = item.correctIdx >= 0 && item.options[item.correctIdx]
        ? item.options[item.correctIdx]
        : item.options.find(function(o) { return o.isCorrect; });
      if (correctOpt) correctAnswerText = correctOpt.text;
    }

    setExerciseFeedback({
      correct: correct,
      userAnswer: userAnswer || '(no answer)',
      correctAnswer: correctAnswerText,
      sentence: item.sentence || null,
      message: correct
        ? ['Great job!', 'Correct!', 'Well done!', 'Exactly right!'][Math.floor(Math.random() * 4)]
        : 'The correct answer is: ' + correctAnswerText
    });

    setExerciseResults(function(prev) {
      return prev.concat([{
        wordIdx: item.wordIdx,
        type: item.type,
        level: item.level,
        correct: correct,
        answer: userAnswer
      }]);
    });

    // Update exercise progress for this word
    setExerciseProgress(function(prev) {
      var ep = prev[item.wordIdx] || {attempts: 0, correct: 0, streak: 0, lastExercise: null, nextReview: null};
      var newStreak = correct ? ep.streak + 1 : 0;
      var intervals = [1, 2, 3, 5, 7, 14, 30];
      var nextInterval = intervals[Math.min(newStreak, intervals.length - 1)];
      var nextDate = addDays(today, nextInterval);
      return Object.assign({}, prev, {
        [item.wordIdx]: {
          attempts: ep.attempts + 1,
          correct: ep.correct + (correct ? 1 : 0),
          streak: newStreak,
          lastExercise: dateKey(today),
          nextReview: dateKey(nextDate)
        }
      });
    });

    // Propagate exercise correct count to main progress (for memory stage calculation)
    if (correct) {
      setProgress(function(p) {
        var prev = p[item.wordIdx] || {};
        return Object.assign({}, p, {
          [item.wordIdx]: Object.assign({}, prev, {
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

  // ===== SETUP SCREEN =====
  if (!started) {
    return <SetupScreen
      startDate={startDate}
      setStartDate={setStartDate}
      setStarted={setStarted}
      importProgress={importProgress}
      connectSync={connectSync}
      syncStatus={syncStatus}
      syncMsg={syncMsg}
    />;
  }

  // ===== SESSION VIEW =====
  if (view === "session" && sessionWords.length > 0) {
    return <SessionView
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
      aiExplanation={aiExplanation}
      aiLoading={aiLoading}
      aiError={aiError}
      aiSaveStatus={aiSaveStatus}
      setAiExplanation={setAiExplanation}
      setAiLoading={setAiLoading}
      setAiError={setAiError}
      setAiSaveStatus={setAiSaveStatus}
    />;
  }

  // ===== COMPLETION SCREEN =====
  if (view === "complete") {
    return <CompleteView
      sessionWords={sessionWords}
      sessionType={sessionType}
      progress={progress}
      setView={setView}
    />;
  }

  // ===== EXERCISE VIEW =====
  if (view === 'exercise' && exerciseSession) {
    return <ExerciseView
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
    />;
  }

  // ===== EXERCISE COMPLETE =====
  if (view === 'exercise-complete' && exerciseSession) {
    return <ExerciseComplete
      exerciseSession={exerciseSession}
      exerciseResults={exerciseResults}
      getWord={getWord}
      totalLearned={totalLearned}
      startExercise={startExercise}
      setView={setView}
    />;
  }

  // ===== DASHBOARD =====
  if (view === "dashboard") {
    return <Dashboard
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
    />;
  }

  // ===== PROGRESS VIEW =====
  if (view === "progress") {
    return <ProgressView
      onNavigate={handleNavigate}
      onHome={onHome}
      syncEmail={syncEmail}
      syncStatus={syncStatus}
      syncMsg={syncMsg}
      progress={progress}
      totalLearned={totalLearned}
      words={words}
      cats={cats}
    />;
  }

  // ===== BROWSE VIEW =====
  if (view === "browse") {
    return <BrowseView
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
      getWord={getWord}
      setSessionWords={setSessionWords}
      setSessionType={setSessionType}
      setCurrentIdx={setCurrentIdx}
      setFlipped={setFlipped}
      setStreak={setStreak}
      setView={setView}
    />;
  }

  // ===== SETTINGS =====
  if (view === "settings") {
    return <SettingsView
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
    />;
  }

  return null;
}

export default App;
