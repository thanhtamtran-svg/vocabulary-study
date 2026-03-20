const {useState, useEffect, useCallback, useMemo, useRef} = React;

// ===== SUPABASE CLOUD SYNC =====
const SUPABASE_URL = 'https://qpzepnbqdscshylcwvhr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jHgz4-egQIk9dYaV7HhR5w_MK3AYdC0';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const SYNC_EMAIL_KEY = 'german1500_sync_email';

function mergeProgress(local, remote) {
  var merged = {...local};
  Object.keys(remote).forEach(function(k) {
    if (!merged[k]) { merged[k] = remote[k]; return; }
    var lReviews = merged[k].reviews || [];
    var rReviews = remote[k].reviews || [];
    var allReviews = lReviews.slice();
    rReviews.forEach(function(rr) {
      var dup = allReviews.some(function(lr) { return lr.date === rr.date && lr.type === rr.type; });
      if (!dup) allReviews.push(rr);
    });
    merged[k] = {
      learned: merged[k].learned || remote[k].learned,
      confidence: Math.max(merged[k].confidence || 0, remote[k].confidence || 0),
      lastReview: merged[k].lastReview > remote[k].lastReview ? merged[k].lastReview : remote[k].lastReview,
      reviews: allReviews
    };
  });
  return merged;
}

async function cloudPull(email) {
  if (!supabase || !email) return null;
  var res = await supabase.from('vocab_progress').select('data').eq('user_email', email).single();
  if (res.error || !res.data) return null;
  return res.data.data;
}

async function cloudPush(email, state) {
  if (!supabase || !email) return false;
  var res = await supabase.from('vocab_progress').upsert({
    user_email: email,
    data: state,
    updated_at: new Date().toISOString()
  }, {onConflict: 'user_email'});
  return !res.error;
}

// ===== UNSPLASH IMAGE =====
const UNSPLASH_KEY = 'POIpL2lpBJPWn99F-d0pzkxSSTlueqR1IxvGeu-gF5Y';

async function fetchWordImage(englishWord) {
  var res = await fetch('https://api.unsplash.com/search/photos?query=' + encodeURIComponent(englishWord) + '&per_page=1&orientation=landscape', {
    headers: { 'Authorization': 'Client-ID ' + UNSPLASH_KEY }
  });
  if (!res.ok) return null;
  var data = await res.json();
  if (data.results && data.results.length > 0) {
    return {
      url: data.results[0].urls.small,
      credit: data.results[0].user.name,
      link: data.results[0].user.links.html
    };
  }
  return null;
}

// ===== AI EXPLAIN =====
const EXPLAIN_URL = SUPABASE_URL + '/functions/v1/explain-word';

async function fetchCachedExplanation(word) {
  var url = SUPABASE_URL + '/rest/v1/vocab_explanations?word=eq.' + encodeURIComponent(word.toLowerCase().trim()) + '&select=explanation';
  var res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    }
  });
  if (!res.ok) return null;
  var data = await res.json();
  if (data && data.length > 0) return data[0].explanation;
  return null;
}

async function fetchExplanation(word) {
  const res = await fetch(EXPLAIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    body: JSON.stringify({ word: word })
  });
  if (!res.ok) throw new Error('Failed to fetch explanation');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.explanation;
}

// ===== PUSH NOTIFICATIONS =====
const VAPID_PUBLIC_KEY = 'BK4ScZTP21q8ppg_bEmkoGzZyH2X9IKDuenJ2p9MPm84tOrX0_EAEmrBwMbbNyuBctwWeZPojMJzptw25mHBNAU';

function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  // Use relative path so it works on both root and subdirectory deployments
  var basePath = new URL('.', window.location.href).pathname;
  var reg = await navigator.serviceWorker.register(basePath + 'sw.js');
  await navigator.serviceWorker.ready;
  return reg;
}

async function subscribeToPush(reg) {
  var sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  return sub;
}

async function savePushSubscription(sub, email, reminderHour) {
  var keys = sub.toJSON().keys;
  var res = await fetch(SUPABASE_URL + '/rest/v1/push_subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      user_email: email || null,
      endpoint: sub.endpoint,
      keys_p256dh: keys.p256dh,
      keys_auth: keys.auth,
      reminder_hour: reminderHour || 8,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
      active: true,
      updated_at: new Date().toISOString()
    })
  });
  return res.ok;
}

async function updateReminderHour(endpoint, hour) {
  var res = await fetch(SUPABASE_URL + '/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(endpoint), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    body: JSON.stringify({ reminder_hour: hour, updated_at: new Date().toISOString() })
  });
  return res.ok;
}

async function deactivatePushSubscription(endpoint) {
  var res = await fetch(SUPABASE_URL + '/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(endpoint), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    body: JSON.stringify({ active: false, updated_at: new Date().toISOString() })
  });
  return res.ok;
}

// ===== MEMORY STAGES =====
// Compute a word's memory stage (1-5) based on confidence + review history
function getMemoryStage(wordProgress) {
  if (!wordProgress || !wordProgress.learned) return 0; // not learned
  var conf = wordProgress.confidence || 0;
  var reviews = wordProgress.reviews || [];
  var reviewSessions = reviews.filter(function(r) { return r.type === 'review'; });
  var reviewCount = reviewSessions.length;

  // Stage 5: Mastered — confidence 4 AND completed all 4 review intervals
  if (conf >= 4 && reviewCount >= 4) return 5;

  // Stage 4: Strong — confidence 3-4 AND completed 3+ review intervals
  if (conf >= 3 && reviewCount >= 3) return 4;

  // Stage 3: Practicing — confidence 3+ OR completed 2+ reviews
  if (conf >= 3 || reviewCount >= 2) return 3;

  // Stage 2: Familiar — confidence 2+ OR completed at least 1 review
  if (conf >= 2 || reviewCount >= 1) return 2;

  // Stage 1: New — just learned, low confidence, no reviews yet
  return 1;
}

const MEMORY_STAGES = [
  {level: 1, name: 'New',        desc: 'Just learned, needs frequent review', color: '#E74C3C', bg: '#fef2f2'},
  {level: 2, name: 'Familiar',   desc: 'Recognized, review every 2 days',     color: '#D67635', bg: '#fff7ed'},
  {level: 3, name: 'Practicing', desc: 'Getting stronger, review every 5 days', color: '#E9B746', bg: '#fefce8'},
  {level: 4, name: 'Strong',     desc: 'Solid recall, review every 7 days',   color: '#7E9470', bg: '#f0fdf4'},
  {level: 5, name: 'Mastered',   desc: 'Fully retained, no review needed',    color: '#324A84', bg: '#eff6ff'}
];

const TYPE_TAGS = ["tag-noun","tag-verb","tag-adj","tag-gram","tag-expr","tag-found"];
const TYPE_NAMES = VOCAB_DATA.types;
const REVIEW_LABELS = {2:"Review +2",3:"Review +3",5:"Review +5",7:"Review +7"};
const REVIEW_METHODS = {
  2:"Flashcard Quiz: See German \u2192 produce English + article",
  3:"Context Quiz: Fill in the blank in a sentence",
  5:"Free Recall: Write all 8 words from memory without cues",
  7:"Teach-Back: Explain each word aloud as if teaching"
};
const DUAL_CODING_TIPS = [
  "Draw a quick sketch of this word's meaning",
  "Picture a specific personal memory connected to this word",
  "Imagine a vivid, absurd scene involving this concept",
  "Connect this word to a place you know well",
  "Think of a person in your life this word reminds you of",
  "Visualize the color, shape, and texture of this concept",
  "Create a mental movie scene featuring this word",
  "Link this to a song, smell, or feeling you know"
];
const SCIENCE_TIPS = [
  "Memory is the residue of thought. The more you THINK about a word, the stronger the trace.",
  "Retrieval is re-encoding: struggling to remember actually makes the memory stronger.",
  "Don't just translate\u2014visualize! German word \u2192 image directly builds a German schema.",
  "Split your study into 2-3 short sessions instead of one long block for better retention.",
  "Writing a personal sentence with each word creates context-dependent memory.",
  "The moment of struggle when recalling is EXACTLY when learning happens. Embrace it!",
  "Interleaving (mixing word types) feels harder but produces stronger long-term retention."
];

// ===== TEXT-TO-SPEECH =====
function speakGerman(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE';
  utterance.rate = 0.85;
  // Try to find a German voice
  var voices = window.speechSynthesis.getVoices();
  var deVoice = voices.find(function(v) { return v.lang.startsWith('de'); });
  if (deVoice) utterance.voice = deVoice;
  window.speechSynthesis.speak(utterance);
}

// Preload voices (needed on some browsers)
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function() { window.speechSynthesis.getVoices(); };
}

// ===== UTILITY FUNCTIONS =====
function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function parseDate(s) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'});
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getStudyDay(startDate, today) {
  let count = 0;
  let d = new Date(startDate);
  while (d <= today) {
    if (d.getDay() !== 0) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function todayDate() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d;
}

// ===== STORAGE =====
const STORAGE_KEY = 'german1500';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch(e) { console.warn('Save failed', e); }
}

// ===== MAIN APP =====
function App({onHome}) {
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
    registerServiceWorker();
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
    setWordImage(null);
    setImageLoading(true);
    fetchWordImage(w.english).then(function(img) {
      setWordImage(img);
      setImageLoading(false);
    }).catch(function() { setImageLoading(false); });
    // Auto-load cached explanation (no API cost)
    setAiExplanation('');
    setAiError('');
    setAiLoading(false);
    setAiSaveStatus('');
    fetchCachedExplanation(w.german).then(function(text) {
      if (text) {
        setAiExplanation(text);
        setAiSaveStatus('saved');
      }
    });
    // Autoplay pronunciation
    speakGerman(w.german);
  }, [view, currentIdx, sessionWords]);

  // ===== EXERCISE STATE =====
  const [exerciseSession, setExerciseSession] = useState(null); // {items:[], targetWords:[]}
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [exerciseAnswer, setExerciseAnswer] = useState('');
  const [exerciseFeedback, setExerciseFeedback] = useState(null); // {correct, message, correctAnswer}
  const [exerciseResults, setExerciseResults] = useState([]); // [{wordIdx, type, correct, answer}]
  const [exerciseProgress, setExerciseProgress] = useState(() => {
    try { var d = localStorage.getItem('vocab_exercise_progress'); return d ? JSON.parse(d) : {}; } catch { return {}; }
  }); // {wordIdx: {attempts, correct, lastExercise, nextReview, streak}}
  const [exerciseSelectedIdx, setExerciseSelectedIdx] = useState(-1); // for multiple choice

  // Save exercise progress
  useEffect(function() {
    try { localStorage.setItem('vocab_exercise_progress', JSON.stringify(exerciseProgress)); } catch(e) {}
  }, [exerciseProgress]);

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

  // Select words for exercise: prioritize mistakes, then due, then new
  function selectExerciseWords() {
    var learned = [];
    Object.keys(progress).forEach(function(k) {
      if (progress[k] && progress[k].learned) {
        var wi = parseInt(k);
        var w = words[wi];
        var ep = exerciseProgress[wi] || {};
        var stage = getMemoryStage(progress[k]);
        var nextReview = ep.nextReview ? parseDate(ep.nextReview) : new Date(0);
        var isDue = today >= nextReview;
        var accuracy = ep.attempts > 0 ? ep.correct / ep.attempts : null;
        var isWeak = accuracy !== null && accuracy < 0.6;
        var neverPracticed = !ep.attempts;

        // Priority scoring: weak > due > never practiced > strong
        var priority = 0;
        if (isWeak) priority = 200 + (1 - (accuracy || 0)) * 100; // 200-300
        else if (isDue) priority = 100 + (5 - stage) * 15; // 100-175
        else if (neverPracticed) priority = 50 + (5 - stage) * 5; // 50-75
        else priority = Math.max(0, 20 - (ep.streak || 0) * 3); // 0-20

        learned.push({
          wi: wi, stage: stage, type: w[3], cat: w[2],
          confidence: progress[k].confidence || 0,
          streak: ep.streak || 0, isDue: isDue,
          isWeak: isWeak, neverPracticed: neverPracticed,
          accuracy: accuracy, priority: priority
        });
      }
    });
    if (learned.length < 5) return null;

    // Sort by priority (highest first)
    learned.sort(function(a, b) { return b.priority - a.priority; });

    // Take top candidates, pick 6 ensuring type diversity
    var candidates = learned.slice(0, Math.min(30, learned.length));
    var selected = [];
    var usedTypes = {};
    for (var i = 0; i < candidates.length && selected.length < 6; i++) {
      var t = candidates[i].type;
      if (!usedTypes[t] || Object.keys(usedTypes).length >= 5) {
        selected.push(candidates[i]);
        usedTypes[t] = true;
        candidates.splice(i, 1);
        i--;
      }
    }
    for (var i = 0; i < candidates.length && selected.length < 6; i++) {
      selected.push(candidates[i]);
    }
    // Shuffle
    for (var i = selected.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = selected[i]; selected[i] = selected[j]; selected[j] = tmp;
    }
    return selected;
  }

  // Generate distractors for multiple choice (same type preferred)
  function getDistractors(targetWi, count) {
    var targetWord = words[targetWi];
    var targetType = targetWord[3];
    var all = [];
    Object.keys(progress).forEach(function(k) {
      var wi = parseInt(k);
      if (wi !== targetWi && progress[k] && progress[k].learned) {
        all.push({wi: wi, sameType: words[wi][3] === targetType});
      }
    });
    // Prefer same type
    all.sort(function(a, b) { return (b.sameType ? 1 : 0) - (a.sameType ? 1 : 0); });
    var result = [];
    for (var i = 0; i < all.length && result.length < count; i++) {
      result.push(all[i].wi);
    }
    // Shuffle
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = result[i]; result[i] = result[j]; result[j] = tmp;
    }
    return result;
  }

  // ===== VERB CONJUGATION DATA (A1 present tense) =====
  // Map: infinitive → {ich, du, er, wir, ihr, sie}
  var CONJUGATIONS = {
    'sein': {ich:'bin',du:'bist',er:'ist',wir:'sind',ihr:'seid',sie:'sind'},
    'haben': {ich:'habe',du:'hast',er:'hat',wir:'haben',ihr:'habt',sie:'haben'},
    'werden': {ich:'werde',du:'wirst',er:'wird',wir:'werden',ihr:'werdet',sie:'werden'},
    'können': {ich:'kann',du:'kannst',er:'kann',wir:'können',ihr:'könnt',sie:'können'},
    'müssen': {ich:'muss',du:'musst',er:'muss',wir:'müssen',ihr:'müsst',sie:'müssen'},
    'sollen': {ich:'soll',du:'sollst',er:'soll',wir:'sollen',ihr:'sollt',sie:'sollen'},
    'wollen': {ich:'will',du:'willst',er:'will',wir:'wollen',ihr:'wollt',sie:'wollen'},
    'dürfen': {ich:'darf',du:'darfst',er:'darf',wir:'dürfen',ihr:'dürft',sie:'dürfen'},
    'mögen': {ich:'mag',du:'magst',er:'mag',wir:'mögen',ihr:'mögt',sie:'mögen'},
    'machen': {ich:'mache',du:'machst',er:'macht',wir:'machen',ihr:'macht',sie:'machen'},
    'gehen': {ich:'gehe',du:'gehst',er:'geht',wir:'gehen',ihr:'geht',sie:'gehen'},
    'kommen': {ich:'komme',du:'kommst',er:'kommt',wir:'kommen',ihr:'kommt',sie:'kommen'},
    'sehen': {ich:'sehe',du:'siehst',er:'sieht',wir:'sehen',ihr:'seht',sie:'sehen'},
    'geben': {ich:'gebe',du:'gibst',er:'gibt',wir:'geben',ihr:'gebt',sie:'geben'},
    'nehmen': {ich:'nehme',du:'nimmst',er:'nimmt',wir:'nehmen',ihr:'nehmt',sie:'nehmen'},
    'finden': {ich:'finde',du:'findest',er:'findet',wir:'finden',ihr:'findet',sie:'finden'},
    'sagen': {ich:'sage',du:'sagst',er:'sagt',wir:'sagen',ihr:'sagt',sie:'sagen'},
    'sprechen': {ich:'spreche',du:'sprichst',er:'spricht',wir:'sprechen',ihr:'sprecht',sie:'sprechen'},
    'hören': {ich:'höre',du:'hörst',er:'hört',wir:'hören',ihr:'hört',sie:'hören'},
    'schreiben': {ich:'schreibe',du:'schreibst',er:'schreibt',wir:'schreiben',ihr:'schreibt',sie:'schreiben'},
    'lesen': {ich:'lese',du:'liest',er:'liest',wir:'lesen',ihr:'lest',sie:'lesen'},
    'lernen': {ich:'lerne',du:'lernst',er:'lernt',wir:'lernen',ihr:'lernt',sie:'lernen'},
    'arbeiten': {ich:'arbeite',du:'arbeitest',er:'arbeitet',wir:'arbeiten',ihr:'arbeitet',sie:'arbeiten'},
    'spielen': {ich:'spiele',du:'spielst',er:'spielt',wir:'spielen',ihr:'spielt',sie:'spielen'},
    'kaufen': {ich:'kaufe',du:'kaufst',er:'kauft',wir:'kaufen',ihr:'kauft',sie:'kaufen'},
    'essen': {ich:'esse',du:'isst',er:'isst',wir:'essen',ihr:'esst',sie:'essen'},
    'trinken': {ich:'trinke',du:'trinkst',er:'trinkt',wir:'trinken',ihr:'trinkt',sie:'trinken'},
    'schlafen': {ich:'schlafe',du:'schläfst',er:'schläft',wir:'schlafen',ihr:'schlaft',sie:'schlafen'},
    'fahren': {ich:'fahre',du:'fährst',er:'fährt',wir:'fahren',ihr:'fahrt',sie:'fahren'},
    'laufen': {ich:'laufe',du:'läufst',er:'läuft',wir:'laufen',ihr:'lauft',sie:'laufen'},
    'helfen': {ich:'helfe',du:'hilfst',er:'hilft',wir:'helfen',ihr:'helft',sie:'helfen'},
    'wissen': {ich:'weiß',du:'weißt',er:'weiß',wir:'wissen',ihr:'wisst',sie:'wissen'},
    'denken': {ich:'denke',du:'denkst',er:'denkt',wir:'denken',ihr:'denkt',sie:'denken'},
    'brauchen': {ich:'brauche',du:'brauchst',er:'braucht',wir:'brauchen',ihr:'braucht',sie:'brauchen'},
    'wohnen': {ich:'wohne',du:'wohnst',er:'wohnt',wir:'wohnen',ihr:'wohnt',sie:'wohnen'},
    'kochen': {ich:'koche',du:'kochst',er:'kocht',wir:'kochen',ihr:'kocht',sie:'kochen'},
    'tanzen': {ich:'tanze',du:'tanzt',er:'tanzt',wir:'tanzen',ihr:'tanzt',sie:'tanzen'},
    'schwimmen': {ich:'schwimme',du:'schwimmst',er:'schwimmt',wir:'schwimmen',ihr:'schwimmt',sie:'schwimmen'},
    'singen': {ich:'singe',du:'singst',er:'singt',wir:'singen',ihr:'singt',sie:'singen'},
    'bringen': {ich:'bringe',du:'bringst',er:'bringt',wir:'bringen',ihr:'bringt',sie:'bringen'},
    'verstehen': {ich:'verstehe',du:'verstehst',er:'versteht',wir:'verstehen',ihr:'versteht',sie:'verstehen'},
    'vergessen': {ich:'vergesse',du:'vergisst',er:'vergisst',wir:'vergessen',ihr:'vergesst',sie:'vergessen'},
    'beginnen': {ich:'beginne',du:'beginnst',er:'beginnt',wir:'beginnen',ihr:'beginnt',sie:'beginnen'},
    'bekommen': {ich:'bekomme',du:'bekommst',er:'bekommt',wir:'bekommen',ihr:'bekommt',sie:'bekommen'},
    'bleiben': {ich:'bleibe',du:'bleibst',er:'bleibt',wir:'bleiben',ihr:'bleibt',sie:'bleiben'},
    'stehen': {ich:'stehe',du:'stehst',er:'steht',wir:'stehen',ihr:'steht',sie:'stehen'},
    'sitzen': {ich:'sitze',du:'sitzt',er:'sitzt',wir:'sitzen',ihr:'sitzt',sie:'sitzen'},
    'liegen': {ich:'liege',du:'liegst',er:'liegt',wir:'liegen',ihr:'liegt',sie:'liegen'},
    'tragen': {ich:'trage',du:'trägst',er:'trägt',wir:'tragen',ihr:'tragt',sie:'tragen'},
    'waschen': {ich:'wasche',du:'wäschst',er:'wäscht',wir:'waschen',ihr:'wascht',sie:'waschen'},
    'öffnen': {ich:'öffne',du:'öffnest',er:'öffnet',wir:'öffnen',ihr:'öffnet',sie:'öffnen'},
    'schließen': {ich:'schließe',du:'schließt',er:'schließt',wir:'schließen',ihr:'schließt',sie:'schließen'},
    'heißen': {ich:'heiße',du:'heißt',er:'heißt',wir:'heißen',ihr:'heißt',sie:'heißen'},
    'leben': {ich:'lebe',du:'lebst',er:'lebt',wir:'leben',ihr:'lebt',sie:'leben'},
    'lieben': {ich:'liebe',du:'liebst',er:'liebt',wir:'lieben',ihr:'liebt',sie:'lieben'},
    'fragen': {ich:'frage',du:'fragst',er:'fragt',wir:'fragen',ihr:'fragt',sie:'fragen'},
    'antworten': {ich:'antworte',du:'antwortest',er:'antwortet',wir:'antworten',ihr:'antwortet',sie:'antworten'},
    'warten': {ich:'warte',du:'wartest',er:'wartet',wir:'warten',ihr:'wartet',sie:'warten'},
    'zahlen': {ich:'zahle',du:'zahlst',er:'zahlt',wir:'zahlen',ihr:'zahlt',sie:'zahlen'},
    'bezahlen': {ich:'bezahle',du:'bezahlst',er:'bezahlt',wir:'bezahlen',ihr:'bezahlt',sie:'bezahlen'},
    'reisen': {ich:'reise',du:'reist',er:'reist',wir:'reisen',ihr:'reist',sie:'reisen'},
    'besuchen': {ich:'besuche',du:'besuchst',er:'besucht',wir:'besuchen',ihr:'besucht',sie:'besuchen'},
    'zeigen': {ich:'zeige',du:'zeigst',er:'zeigt',wir:'zeigen',ihr:'zeigt',sie:'zeigen'}
  };

  var PRONOUNS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
  var PRONOUN_KEYS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];

  // Generate regular conjugation as fallback
  function conjugateRegular(infinitive) {
    var stem = infinitive.replace(/(en|n)$/, '');
    var needsE = /[dt]$/.test(stem); // arbeit-en → arbeit-e-st
    return {
      ich: stem + 'e', du: stem + (needsE ? 'est' : 'st'),
      er: stem + (needsE ? 'et' : 't'), wir: infinitive,
      ihr: stem + (needsE ? 'et' : 't'), sie: infinitive
    };
  }

  function getConjugation(infinitive) {
    var key = infinitive.toLowerCase();
    return CONJUGATIONS[key] || conjugateRegular(key);
  }

  // Fallback sentence templates (used when AI sentences aren't available)
  var SENTENCE_TEMPLATES = {
    0: ["Ich sehe ___ jeden Tag.", "Das ist ___ .", "Wo ist ___ ?", "Ich brauche ___ .", "Hast du ___ ?"],
    1: ["Ich ___ jeden Tag.", "Wir ___ zusammen.", "Er ___ gern.", "Sie ___ oft."],
    2: ["Das ist sehr ___ .", "Der Mann ist ___ .", "Ich finde das ___ ."],
    3: ["Ich sage ___ .", "___ ist richtig.", "Wir benutzen ___ oft."],
    4: ["Man sagt ___ .", "Auf Deutsch sagen wir ___ ."],
    5: ["___ ist wichtig.", "Das ist ___ .", "Ich kenne ___ ."]
  };

  // Fetch or generate AI sentences for exercise words
  async function fetchExerciseSentences(selectedWords) {
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

  // Helper: make shuffled multiple choice options
  function makeOptions(targetWi, targetText, distractorCount) {
    var dists = getDistractors(targetWi, distractorCount);
    var opts = dists.map(function(di) { return {wi: di, text: words[di][1]}; });
    opts.push({wi: targetWi, text: targetText});
    for (var i = opts.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
    }
    return opts;
  }

  // Helper: make reverse options (show English, pick German)
  function makeReverseOptions(targetWi, targetText) {
    var dists = getDistractors(targetWi, 3);
    var opts = dists.map(function(di) { return {wi: di, text: words[di][0]}; });
    opts.push({wi: targetWi, text: targetText});
    for (var i = opts.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
    }
    return opts;
  }

  // Get AI sentence for a word, or fall back to template
  function getAiSentence(w, wordType, aiSentences) {
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
    return {template: t, full: t.replace('___', w.german), ai: false};
  }

  // Generate exercise items — varied by word strength
  function generateExerciseItems(selectedWords, aiSentences, aiPassage) {
    var items = [];

    selectedWords.forEach(function(sw) {
      var wi = sw.wi;
      var w = getWord(wi);
      var wordType = words[wi][3];
      var ep = exerciseProgress[wi] || {};
      var isWeak = sw.isWeak;
      var isStrong = ep.streak >= 4;
      var sent = getAiSentence(w, wordType, aiSentences);

      // === ROUND 1 (Remember) ===
      // Weak words: standard DE→EN multiple choice (easier)
      // Strong words: reverse EN→DE multiple choice (harder) or listening
      if (isStrong && Math.random() > 0.5) {
        // Reverse: "Which German word means 'mother'?"
        var revOpts = makeReverseOptions(wi, w.german);
        items.push({
          type: 'reverse_choice', level: 'Remember', wordIdx: wi,
          prompt: 'Which German word means "' + w.english + '"?',
          options: revOpts, correctAnswer: w.german,
          germanWord: w.german, wordInfo: w
        });
      } else if (isStrong && Math.random() > 0.3) {
        // Listening: hear word, pick meaning
        items.push({
          type: 'listening', level: 'Remember', wordIdx: wi,
          prompt: 'Listen and choose the correct meaning:',
          options: makeOptions(wi, w.english, 3), correctAnswer: w.english,
          germanWord: w.german, wordInfo: w
        });
      } else {
        // Standard: "What does X mean?"
        items.push({
          type: 'multiple_choice', level: 'Remember', wordIdx: wi,
          prompt: 'What does "' + w.german + '" mean?',
          options: makeOptions(wi, w.english, 3), correctAnswer: w.english,
          germanWord: w.german, wordInfo: w
        });
      }

      // === ROUND 2 (Understand) ===
      // Verbs: conjugation exercise
      var isVerb = wordType === 1;
      if (isVerb) {
        var conj = getConjugation(w.german);
        var pronIdx = Math.floor(Math.random() * PRONOUNS.length);
        var pronoun = PRONOUNS[pronIdx];
        var pronounKey = PRONOUN_KEYS[pronIdx];
        var conjugated = conj[pronounKey];
        items.push({
          type: 'conjugation', level: 'Understand', wordIdx: wi,
          prompt: 'Conjugate "' + w.german + '" for ' + pronoun + ':',
          pronoun: pronoun,
          pronounKey: pronounKey,
          infinitive: w.german,
          correctAnswer: conjugated,
          fullAnswer: pronoun + ' ' + conjugated,
          fullTable: conj,
          germanWord: w.german, wordInfo: w
        });
      } else if (isStrong && Math.random() > 0.6 && sent.ai) {
        // Strong non-verbs: reverse fill blank
        items.push({
          type: 'fill_english', level: 'Understand', wordIdx: wi,
          prompt: 'What does the missing word mean?\n' + sent.template.replace('___', '______'),
          correctAnswer: w.english.toLowerCase(),
          fullAnswer: w.english,
          germanWord: w.german, wordInfo: w
        });
      } else {
        items.push({
          type: 'fill_blank', level: 'Understand', wordIdx: wi,
          prompt: 'Type the German word for: ' + w.english,
          correctAnswer: w.german.replace(/^(der|die|das)\s+/i, ''),
          fullAnswer: w.german, germanWord: w.german, wordInfo: w
        });
      }

      // === ROUND 3 (Apply) ===
      // For verbs with fallback templates: use conjugated form (ich) instead of infinitive
      var sentCorrectAnswer = w.german.replace(/^(der|die|das)\s+/i, '');
      var sentFullAnswer = w.german;
      var sentPrompt = sent.template.replace('___', '______');
      var sentFull = sent.full;
      if (isVerb && !sent.ai) {
        // Fallback templates use "Ich ___" pattern — need conjugated form
        var verbConj = getConjugation(w.german);
        // Detect which pronoun the template uses
        var templateLower = sent.template.toLowerCase();
        if (templateLower.startsWith('ich ') || templateLower.includes(' ich ')) {
          sentCorrectAnswer = verbConj.ich;
          sentFullAnswer = verbConj.ich;
          sentFull = sent.template.replace('___', verbConj.ich);
        } else if (templateLower.startsWith('wir ') || templateLower.includes(' wir ')) {
          sentCorrectAnswer = verbConj.wir;
          sentFullAnswer = verbConj.wir;
          sentFull = sent.template.replace('___', verbConj.wir);
        } else if (templateLower.startsWith('er') || templateLower.startsWith('sie')) {
          sentCorrectAnswer = verbConj.er;
          sentFullAnswer = verbConj.er;
          sentFull = sent.template.replace('___', verbConj.er);
        } else {
          // Default to ich form
          sentCorrectAnswer = verbConj.ich;
          sentFullAnswer = verbConj.ich;
          sentFull = sent.template.replace('___', verbConj.ich);
        }
      }
      items.push({
        type: 'sentence_complete', level: 'Apply', wordIdx: wi,
        prompt: sentPrompt,
        hint: w.english + (isVerb && !sent.ai ? ' (conjugate!)' : ''),
        correctAnswer: sentCorrectAnswer,
        fullAnswer: sentFullAnswer, sentence: sentFull,
        germanWord: w.german, wordInfo: w
      });
    });

    // Round 4 (Analyze): Reading comprehension — true content questions about the passage
    if (aiPassage) {
      try {
        var passage = typeof aiPassage === 'string' ? JSON.parse(aiPassage) : aiPassage;
        if (passage && passage.text && passage.translation) {
          // Generate comprehension questions from the passage content
          var sentences = passage.translation.split(/\.\s+/).filter(function(s) { return s.trim().length > 10; });
          var firstWord = selectedWords[0] ? getWord(selectedWords[0].wi) : {german:'', wordInfo:{}};

          // Question 1: True/False about a fact in the passage
          if (sentences.length >= 2) {
            var trueFact = sentences[0].replace(/\.$/, '').trim();
            // Create a false version by changing a key detail
            var falseOptions = [
              'The text is about going to work.',
              'The text mentions only one person.',
              'Nobody is happy in this story.',
              'The events happen at night.'
            ];
            var trueOpt = {wi: -1, text: trueFact, isCorrect: true};
            var falseOpt = {wi: -2, text: falseOptions[Math.floor(Math.random() * falseOptions.length)], isCorrect: false};
            var tf_opts = Math.random() > 0.5 ? [trueOpt, falseOpt] : [falseOpt, trueOpt];
            // Add 2 more false options
            var extraFalse = falseOptions.filter(function(f) { return f !== falseOpt.text; }).slice(0, 2);
            extraFalse.forEach(function(ef, i) {
              tf_opts.splice(Math.floor(Math.random() * (tf_opts.length + 1)), 0, {wi: -(i+3), text: ef, isCorrect: false});
            });

            items.push({
              type: 'reading_comprehension', level: 'Analyze', wordIdx: selectedWords[0] ? selectedWords[0].wi : 0,
              prompt: 'Read the passage. Which statement is TRUE?',
              passage: passage.text,
              passageTitle: passage.title || 'Lesetext',
              passageTranslation: passage.translation || '',
              options: tf_opts,
              correctIdx: tf_opts.findIndex(function(o) { return o.isCorrect; }),
              germanWord: firstWord.german,
              wordInfo: firstWord
            });
          }

          // Question 2: What is the passage about?
          var topicOptions = [
            'A day at school',
            'Shopping at a store',
            'A visit to the doctor',
            'Cooking dinner'
          ];
          var realTopic = passage.title ? passage.title.replace(/^(Ein |Eine |Der |Die |Das |Mein |Meine )/, '') : 'daily life';
          var topicOpts = [{text: passage.translation.split('.')[0].trim().substring(0, 60), isCorrect: true, wi: -10}];
          topicOptions.forEach(function(t, i) {
            topicOpts.push({text: t, isCorrect: false, wi: -(11+i)});
          });
          // Shuffle
          for (var i = topicOpts.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = topicOpts[i]; topicOpts[i] = topicOpts[j]; topicOpts[j] = tmp;
          }
          topicOpts = topicOpts.slice(0, 4);

          items.push({
            type: 'reading_comprehension', level: 'Analyze', wordIdx: selectedWords[0] ? selectedWords[0].wi : 0,
            prompt: 'What is this passage mainly about?',
            passage: passage.text,
            passageTitle: passage.title || 'Lesetext',
            passageTranslation: passage.translation || '',
            options: topicOpts,
            correctIdx: topicOpts.findIndex(function(o) { return o.isCorrect; }),
            germanWord: firstWord.german,
            wordInfo: firstWord
          });
        }
      } catch(e) { console.warn('Failed to parse passage:', e); }
    }

    // Interleave: Round 1 → 2 → 3 → 4, shuffled within each
    var round1 = items.filter(function(it) { return it.level === 'Remember'; });
    var round2 = items.filter(function(it) { return it.level === 'Understand'; });
    var round3 = items.filter(function(it) { return it.level === 'Apply'; });
    var round4 = items.filter(function(it) { return it.level === 'Analyze'; });
    [round1, round2, round3, round4].forEach(function(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
    });

    return round1.concat(round2).concat(round3).concat(round4);
  }

  const [exerciseLoading, setExerciseLoading] = useState(false);

  // Autoplay pronunciation for listening exercises
  useEffect(function() {
    if (view !== 'exercise' || !exerciseSession) return;
    var item = exerciseSession.items[exerciseIdx];
    if (item && item.type === 'listening' && !exerciseFeedback) {
      setTimeout(function() { speakGerman(item.germanWord); }, 300);
    }
  }, [view, exerciseIdx, exerciseSession]);

  // Enter key handler for exercise view
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

  function startExercise() {
    var selected = selectExerciseWords();
    if (!selected || selected.length < 3) {
      alert('You need at least 5 learned words to start exercises. Keep learning!');
      return;
    }
    setExerciseLoading(true);

    // Fetch AI sentences (async), then start exercise
    fetchExerciseSentences(selected).then(function(aiData) {
      // Extract passage from any word's data
      var aiPassage = null;
      if (aiData) {
        Object.keys(aiData).forEach(function(k) {
          if (aiData[k] && aiData[k].passage && !aiPassage) aiPassage = aiData[k].passage;
        });
      }
      var items = generateExerciseItems(selected, aiData, aiPassage);
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
      var items = generateExerciseItems(selected, null, null);
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
      correct = normalize(userAnswer) === normalize(item.correctAnswer) ||
                userAnswer.toLowerCase().trim() === item.correctAnswer.toLowerCase();
    } else {
      userAnswer = exerciseAnswer.trim();
      var normalize = function(s) { return s.toLowerCase().replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/[ß]/g,'ss').trim(); };
      var stripArticle = function(s) { return s.replace(/^(der|die|das)\s+/i, ''); };
      var na = normalize(userAnswer);
      var nc = normalize(item.correctAnswer);
      // Accept: exact match, with/without article, with/without umlauts, full german word
      var fullGerman = item.fullAnswer || item.germanWord || '';
      correct = na === nc ||
                userAnswer.toLowerCase().trim() === item.correctAnswer.toLowerCase() ||
                normalize(stripArticle(userAnswer)) === nc ||
                na === normalize(fullGerman) ||
                normalize(stripArticle(userAnswer)) === normalize(stripArticle(fullGerman));
    }

    setExerciseFeedback({
      correct: correct,
      userAnswer: userAnswer,
      correctAnswer: item.fullAnswer || item.correctAnswer,
      sentence: item.sentence || null,
      message: correct
        ? ['Great job!', 'Correct!', 'Well done!', 'Exactly right!'][Math.floor(Math.random() * 4)]
        : 'The correct answer is: ' + (item.fullAnswer || item.correctAnswer)
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
      // Spaced review intervals: 1, 2, 3, 5, 7, 14, 30 days based on streak
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
  }

  function nextExerciseItem() {
    if (exerciseIdx + 1 >= exerciseSession.items.length) {
      setView('exercise-complete');
    } else {
      setExerciseIdx(exerciseIdx + 1);
      setExerciseAnswer('');
      setExerciseFeedback(null);
      setExerciseSelectedIdx(-1);
    }
  }

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

  // Migrate old todayCompleted format (learn: true/false → learnCount)
  useEffect(function() {
    if (todayCompleted.learn === true && todayCompleted.learnCount === undefined) {
      setTodayCompleted(function(tc) {
        return {learnCount: 1, learnedBatches: tc.learnedBatches || [], reviews: tc.reviews || {}};
      });
    }
  }, []);

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
        completedDate: dateKey(today)
      });
    }, 2000);
    return function() { clearTimeout(timer); };
  }, [syncEmail, startDate, started, progress, todayCompleted, today]);

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
  const reviewsDue = useMemo(() => {
    const due = [];
    for (let bi = 1; bi <= batchesCompleted; bi++) {
      // Find the date this batch was learned (earliest review date of first word in batch)
      var firstWord = batches[bi - 1][0];
      var wp = progress[firstWord];
      if (!wp || !wp.reviews || wp.reviews.length === 0) continue;
      var learnReview = wp.reviews.find(function(r) { return r.type === 'learn'; });
      if (!learnReview) continue;
      var learnDate = parseDate(learnReview.date);

      for (const interval of [2,3,5,7]) {
        const reviewDate = addDays(learnDate, interval);
        if (dateKey(reviewDate) === dateKey(today)) {
          const key = 'r' + interval + '_b' + bi;
          if (!todayCompleted.reviews[key]) {
            due.push({batch: bi, interval, key});
          }
        }
      }
    }
    return due;
  }, [batchesCompleted, batches, progress, today, todayCompleted]);

  const totalLearned = useMemo(() =>
    Object.keys(progress).filter(k => progress[k].learned).length
  , [progress]);

  const totalMastered = useMemo(() =>
    Object.keys(progress).filter(k => progress[k].confidence >= 4).length
  , [progress]);

  function getWord(wi) {
    const w = words[wi];
    return {german: w[0], english: w[1], cat: cats[w[2]], type: TYPE_NAMES[w[3]], typeClass: TYPE_TAGS[w[3]]};
  }

  function startSession(type, batchIdx, interval) {
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
    setProgress(p => ({
      ...p,
      [wi]: {
        ...p[wi],
        learned: true,
        confidence: Math.max(confidence, (p[wi]?.confidence || 0)),
        lastReview: dateKey(today),
        reviews: [...(p[wi]?.reviews || []), {date: dateKey(today), conf: confidence, type: sessionType.type}]
      }
    }));

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
      } else {
        const key = 'r' + sessionType.interval + '_b' + sessionType.batchIdx;
        setTodayCompleted(tc => ({...tc, reviews: {...tc.reviews, [key]: true}}));
      }
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
        alert("Progress loaded successfully!");
      } catch { alert("Invalid file format"); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ===== SETUP SCREEN =====
  if (!started) {
    return (
      React.createElement('div', {className: 'app'},
        React.createElement('div', {style: {padding:'24px',textAlign:'center'}},
          React.createElement('div', {style: {fontSize:'48px',marginBottom:'16px'}}, '\uD83C\uDDE9\uD83C\uDDEA'),
          React.createElement('h1', {style: {fontSize:'22px',marginBottom:'4px'}}, 'German 1500'),
          React.createElement('p', {style: {color:'#718096',fontSize:'13px',marginBottom:'24px'}},
            'Master 1500 words with science-based spaced repetition'),

          React.createElement('div', {className: 'card card-accent'},
            React.createElement('h2', null, 'When do you want to start?'),
            React.createElement('p', {style: {fontSize:'12px',color:'#718096',margin:'6px 0 12px'}},
              'Pick your first study day (ideally a Monday)'),
            React.createElement('input', {
              type: 'date',
              value: dateKey(startDate),
              onChange: function(e) {
                const d = new Date(e.target.value + 'T00:00:00');
                if (!isNaN(d)) setStartDate(d);
              }
            })
          ),

          React.createElement('div', {className: 'card', style: {textAlign:'left'}},
            React.createElement('h2', null, 'Your daily commitment'),
            React.createElement('div', {className: 'task-item'},
              React.createElement('div', {className: 'task-badge badge-new'}, '8'),
              React.createElement('div', null,
                React.createElement('strong', null, 'New words'),
                React.createElement('br'),
                React.createElement('span', {style: {fontSize:'11px',color:'#718096'}},
                  'Interleaved mix of nouns, verbs, adjectives')
              )
            ),
            React.createElement('div', {className: 'task-item'},
              React.createElement('div', {className: 'task-badge badge-r2'}, '+'),
              React.createElement('div', null,
                React.createElement('strong', null, '2357 Reviews'),
                React.createElement('br'),
                React.createElement('span', {style: {fontSize:'11px',color:'#718096'}},
                  'Previous batches on schedule: Day +2, +3, +5, +7')
              )
            ),
            React.createElement('div', {style: {textAlign:'center',margin:'8px 0'}},
              React.createElement('span', {className: 'phase-indicator',
                style: {background:'#EBF5FB',color:'#1B4F72'}},
                '~45-60 min/day \u2022 28 weeks')
            )
          ),

          React.createElement('button', {
            className: 'btn btn-primary',
            style: {marginTop:'12px'},
            onClick: function() { setStarted(true); }
          }, 'Start My Journey'),

          React.createElement('div', {style: {marginTop:'16px'}},
            React.createElement('label', {className: 'btn btn-secondary btn-sm',
              style: {cursor:'pointer',display:'inline-flex'}},
              'Load Saved Progress',
              React.createElement('input', {
                type: 'file', accept: '.json',
                onChange: importProgress,
                style: {display:'none'}
              })
            )
          )
        )
      )
    );
  }

  // ===== SESSION VIEW =====
  if (view === "session" && sessionWords.length > 0) {
    var w = sessionWords[currentIdx];
    var tip = DUAL_CODING_TIPS[currentIdx % DUAL_CODING_TIPS.length];
    var isLearn = sessionType.type === "learn";
    var reviewInterval = sessionType.interval;

    return (
      React.createElement('div', {className: 'app'},
        React.createElement('div', {className: 'session-header'},
          React.createElement('button', {onClick: function() { setView("dashboard"); }}, '\u2190 Back'),
          React.createElement('span', {style: {fontSize:'13px',fontWeight:600}},
            isLearn ? 'Learn Batch ' + sessionType.batchIdx
              : REVIEW_LABELS[reviewInterval] + ' (Batch ' + sessionType.batchIdx + ')'
          ),
          React.createElement('span', {style: {fontSize:'12px'}},
            (currentIdx + 1) + '/' + sessionWords.length)
        ),

        React.createElement('div', {className: 'content'},
          React.createElement('div', {className: 'progress-bar'},
            React.createElement('div', {className: 'progress-fill',
              style: {width: ((currentIdx)/sessionWords.length*100) + '%', background:'#27AE60'}})
          ),

          streak >= 3 ? React.createElement('div', {
            style: {textAlign:'center',fontSize:'12px',color:'#F39C12',fontWeight:600,margin:'4px 0'}
          }, '\uD83D\uDD25 ' + streak + ' word streak!') : null,

          React.createElement('div', {className: 'flashcard-container',
            onClick: function() { setFlipped(!flipped); speakGerman(w.german); }},
            React.createElement('div', {className: 'flashcard' + (flipped ? ' flipped' : '')},
              React.createElement('div', {className: 'flashcard-face flashcard-front'},
                React.createElement('div', {style: {display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}},
                  typeof WORD_EMOJIS !== 'undefined' ? React.createElement('span', {style: {fontSize:'28px'}}, WORD_EMOJIS[w.idx]) : null,
                  React.createElement('span', {className: 'tag ' + w.typeClass}, w.type)
                ),
                React.createElement('div', {style: {display:'flex',alignItems:'center',justifyContent:'center'}},
                  React.createElement('div', {className: 'flashcard-word'}, w.german),
                  React.createElement('button', {className: 'speak-btn',
                    onClick: function(e) { e.stopPropagation(); speakGerman(w.german); }},
                    '\uD83D\uDD0A')
                ),
                React.createElement('div', {className: 'flashcard-meta'}, w.cat),
                React.createElement('div', {style: {marginTop:'6px',fontSize:'11px',opacity:0.6}},
                  'Tap to flip')
              ),
              React.createElement('div', {className: 'flashcard-face flashcard-back'},
                React.createElement('div', {style: {display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}},
                  typeof WORD_EMOJIS !== 'undefined' ? React.createElement('span', {style: {fontSize:'28px'}}, WORD_EMOJIS[w.idx]) : null,
                  React.createElement('span', {className: 'tag ' + w.typeClass}, w.type)
                ),
                React.createElement('div', {className: 'flashcard-english'}, w.english),
                React.createElement('div', {style: {display:'flex',alignItems:'center',justifyContent:'center',marginTop:'4px'}},
                  React.createElement('span', {style: {fontSize:'15px',color:'#718096'}}, w.german),
                  React.createElement('button', {className: 'speak-btn back',
                    onClick: function(e) { e.stopPropagation(); speakGerman(w.german); }},
                    '\uD83D\uDD0A')
                ),
                React.createElement('div', {className: 'flashcard-category'}, w.cat)
              )
            )
          ),

          isLearn && !flipped ? React.createElement('div', {className: 'dual-coding-prompt'},
            React.createElement('strong', null, '\uD83C\uDFA8 Dual Coding: '), tip
          ) : null,

          // Word image (front side)
          !flipped ? React.createElement('div', {className: 'word-image-container'},
            imageLoading ? React.createElement('div', {style: {textAlign:'center',color:'#a0aec0',padding:'20px',fontSize:'12px'}}, 'Loading image...') : null,
            wordImage ? React.createElement('div', null,
              React.createElement('img', {src: wordImage.url, alt: w.english, className: 'word-image'}),
              React.createElement('div', {className: 'word-image-credit'},
                'Photo by ',
                React.createElement('a', {href: wordImage.link + '?utm_source=german1500&utm_medium=referral', target: '_blank', rel: 'noopener'}, wordImage.credit),
                ' on Unsplash'
              )
            ) : null,
            !imageLoading && !wordImage ? React.createElement('div', {style: {textAlign:'center',fontSize:'48px',padding:'20px'}},
              typeof WORD_EMOJIS !== 'undefined' ? WORD_EMOJIS[w.idx] : '\uD83D\uDCDA'
            ) : null
          ) : null,

          !isLearn && !flipped && reviewInterval ? React.createElement('div', {className: 'tip-box'},
            React.createElement('strong', null, '\uD83C\uDFAF Method: '), REVIEW_METHODS[reviewInterval]
          ) : null,

          flipped ? React.createElement(React.Fragment, null,
            isLearn ? React.createElement('div', {className: 'dual-coding-prompt'},
              React.createElement('strong', null, '\u270D\uFE0F Elaboration: '),
              'Create a personal sentence using "', React.createElement('em', null, w.german),
              '" connected to your own life.'
            ) : null,
            React.createElement('p', {
              style: {textAlign:'center',fontSize:'12px',color:'#718096',margin:'8px 0'}
            }, 'How well did you know this?'),
            React.createElement('div', {className: 'confidence-btns'},
              React.createElement('button', {className: 'conf-btn conf-1',
                onClick: function(e) { e.stopPropagation(); rateWord(1); }},
                '\u274C', React.createElement('br'), 'No idea'),
              React.createElement('button', {className: 'conf-btn conf-2',
                onClick: function(e) { e.stopPropagation(); rateWord(2); }},
                '\uD83E\uDD14', React.createElement('br'), 'Partial'),
              React.createElement('button', {className: 'conf-btn conf-3',
                onClick: function(e) { e.stopPropagation(); rateWord(3); }},
                '\uD83D\uDE10', React.createElement('br'), 'Slow'),
              React.createElement('button', {className: 'conf-btn conf-4',
                onClick: function(e) { e.stopPropagation(); rateWord(4); }},
                '\u2705', React.createElement('br'), 'Instant')
            ),

            // AI Explain button
            !aiExplanation && !aiLoading ? React.createElement('button', {
              className: 'btn btn-secondary',
              style: {marginTop:'10px',fontSize:'13px',gap:'6px'},
              onClick: function() {
                setAiLoading(true);
                setAiError('');
                setAiSaveStatus('');
                fetchExplanation(w.german).then(function(text) {
                  setAiExplanation(text);
                  setAiLoading(false);
                  setAiSaveStatus('saving');
                  // Verify it was saved to cache
                  setTimeout(function() {
                    fetchCachedExplanation(w.german).then(function(cached) {
                      setAiSaveStatus(cached ? 'saved' : '');
                    });
                  }, 2000);
                }).catch(function(err) {
                  setAiError('Could not load explanation. Try again.');
                  setAiLoading(false);
                });
              }
            }, '\uD83E\uDD16 Explain this word') : null,

            // Loading state
            aiLoading ? React.createElement('div', {className: 'ai-explain-box'},
              React.createElement('div', {style: {textAlign:'center',color:'#718096',padding:'16px'}},
                '\u23F3 Asking AI teacher...')
            ) : null,

            // Error state
            aiError ? React.createElement('div', {className: 'ai-explain-box',
              style: {borderColor:'#E74C3C',background:'#FEF5F5'}},
              React.createElement('p', {style: {color:'#E74C3C',fontSize:'12px',margin:0}}, aiError),
              React.createElement('button', {className: 'btn btn-sm btn-secondary',
                style: {marginTop:'8px'},
                onClick: function() {
                  setAiError('');
                  setAiLoading(true);
                  setAiSaveStatus('');
                  fetchExplanation(w.german).then(function(text) {
                    setAiExplanation(text);
                    setAiLoading(false);
                    setAiSaveStatus('saving');
                    setTimeout(function() {
                      fetchCachedExplanation(w.german).then(function(cached) {
                        setAiSaveStatus(cached ? 'saved' : '');
                      });
                    }, 2000);
                  }).catch(function() {
                    setAiError('Could not load explanation. Try again.');
                    setAiLoading(false);
                  });
                }
              }, 'Retry')
            ) : null,

            // Explanation result
            aiExplanation ? React.createElement('div', {className: 'ai-explain-box'},
              React.createElement('div', {className: 'ai-explain-header'},
                React.createElement('span', {style: {display:'flex',alignItems:'center',gap:'6px'}},
                  '\uD83E\uDD16 AI Teacher',
                  aiSaveStatus === 'saving' ? React.createElement('span', {
                    style: {fontSize:'10px',color:'#F39C12',background:'#FEF9E7',padding:'2px 6px',borderRadius:'4px',fontWeight:600}
                  }, '\u23F3 Saving...') : null,
                  aiSaveStatus === 'saved' ? React.createElement('span', {
                    style: {fontSize:'10px',color:'#27AE60',background:'#E8F8F0',padding:'2px 6px',borderRadius:'4px',fontWeight:600}
                  }, '\u2705 Saved') : null
                ),
                React.createElement('button', {
                  className: 'btn btn-sm btn-secondary',
                  style: {padding:'4px 8px',fontSize:'10px'},
                  onClick: function() { setAiExplanation(''); }
                }, '\u2715')
              ),
              React.createElement('div', {className: 'ai-explain-content'},
                (function() {
                  // Parse markdown inline: **bold** and *italic*
                  function renderInline(text, key) {
                    var parts = [];
                    var re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
                    var last = 0, m;
                    while ((m = re.exec(text)) !== null) {
                      if (m.index > last) parts.push(text.slice(last, m.index));
                      if (m[1]) parts.push(React.createElement('strong', {key: key + '_b' + m.index}, m[1]));
                      else if (m[2]) parts.push(React.createElement('em', {key: key + '_i' + m.index}, m[2]));
                      last = re.lastIndex;
                    }
                    if (last < text.length) parts.push(text.slice(last));
                    return parts.length ? parts : text;
                  }

                  return aiExplanation.split('\n').reduce(function(acc, line, i) {
                    // Skip blank lines and horizontal rules
                    if (!line.trim() || line.match(/^-{3,}$/)) return acc;
                    // Skip table separator rows
                    if (line.match(/^\|[-|\s]+\|$/)) return acc;
                    // Headers → compact section label
                    if (line.match(/^#+\s/)) {
                      acc.push(React.createElement('div', {key: i, className: 'ai-section-title'}, line.replace(/^#+\s/, '')));
                      return acc;
                    }
                    // Bullet points
                    if (line.match(/^[-•]\s/)) {
                      acc.push(React.createElement('div', {key: i, className: 'ai-bullet'}, renderInline(line.replace(/^[-•]\s/, ''), i)));
                      return acc;
                    }
                    // Table rows → render as compact items
                    if (line.match(/^\|.*\|$/)) {
                      var cells = line.split('|').filter(function(c) { return c.trim(); });
                      if (cells.length >= 2) {
                        acc.push(React.createElement('div', {key: i, className: 'ai-bullet'}, renderInline(cells[0].trim() + ' — ' + cells[1].trim(), i)));
                      }
                      return acc;
                    }
                    // Regular line
                    acc.push(React.createElement('div', {key: i, className: 'ai-line'}, renderInline(line, i)));
                    return acc;
                  }, []);
                })()
              )
            ) : null

          ) : null
        )
      )
    );
  }

  // ===== COMPLETION SCREEN =====
  if (view === "complete") {
    var batchWords = sessionWords;
    var avgConf = batchWords.reduce(function(s, w) {
      return s + (progress[w.idx]?.confidence || 0);
    }, 0) / batchWords.length;

    return (
      React.createElement('div', {className: 'app'},
        React.createElement('div', {className: 'content', style: {textAlign:'center',paddingTop:'max(40px, env(safe-area-inset-top, 40px))'}},
          React.createElement('div', {style: {fontSize:'64px',marginBottom:'12px'}}, '\uD83C\uDF89'),
          React.createElement('h1', null, 'Session Complete!'),
          React.createElement('p', {style: {color:'#718096',margin:'8px 0 20px'}},
            sessionType.type === "learn"
              ? 'Batch ' + sessionType.batchIdx + ' learned!'
              : 'Review completed!'
          ),
          React.createElement('div', {className: 'stat-grid'},
            React.createElement('div', {className: 'stat'},
              React.createElement('div', {className: 'num'}, batchWords.length),
              React.createElement('div', {className: 'label'}, 'Words practiced')
            ),
            React.createElement('div', {className: 'stat'},
              React.createElement('div', {className: 'num'}, avgConf.toFixed(1)),
              React.createElement('div', {className: 'label'}, 'Avg confidence')
            )
          ),

          React.createElement('div', {className: 'card', style: {textAlign:'left'}},
            React.createElement('h2', null, 'Words in this session:'),
            React.createElement('div', {className: 'word-list'},
              batchWords.map(function(w, i) {
                var conf = progress[w.idx]?.confidence || 0;
                var icons = ['','\u274C','\uD83E\uDD14','\uD83D\uDE10','\u2705'];
                return React.createElement('div', {className: 'word-row', key: i},
                  React.createElement('span', null,
                    typeof WORD_EMOJIS !== 'undefined' ? WORD_EMOJIS[w.idx] + ' ' : '',
                    React.createElement('strong', null, w.german)),
                  React.createElement('span', null, w.english),
                  React.createElement('span', null, icons[conf])
                );
              })
            )
          ),

          sessionType.type === "learn" ? React.createElement('div', {className: 'tip-box'},
            React.createElement('strong', null, '\uD83E\uDDE0 Thinking Pause: '),
            'Take a 5-10 minute break now. Walk, stretch, or close your eyes and mentally replay these words. This rest helps your brain consolidate!'
          ) : null,

          React.createElement('button', {
            className: 'btn btn-primary',
            style: {marginTop:'12px'},
            onClick: function() { setView("dashboard"); }
          }, 'Back to Dashboard')
        )
      )
    );
  }

  // ===== EXERCISE VIEW =====
  if (view === 'exercise' && exerciseSession) {
    var exItem = exerciseSession.items[exerciseIdx];
    var exTotal = exerciseSession.items.length;
    var exProgressPct = ((exerciseIdx + (exerciseFeedback ? 1 : 0)) / exTotal * 100);
    var levelColors = {Remember: '#324A84', Understand: '#D67635', Apply: '#7E9470', Analyze: '#8E44AD'};
    var levelIcons = {Remember: '\uD83E\uDDE0', Understand: '\uD83D\uDCA1', Apply: '\u270D\uFE0F', Analyze: '\uD83D\uDCD6'};

    return (
      React.createElement('div', {className: 'app'},
        React.createElement('div', {className: 'content', style: {paddingTop:'max(16px, env(safe-area-inset-top, 16px))'}},
          // Header
          React.createElement('div', {style: {display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}},
            React.createElement('button', {
              className: 'btn btn-secondary btn-sm',
              style: {width:'auto',padding:'6px 12px'},
              onClick: function() {
                if (exerciseResults.length > 0 && !confirm('Exit exercise? Your progress will be saved.')) return;
                setView('dashboard');
              }
            }, '\u2190 Exit'),
            React.createElement('span', {style: {fontSize:'13px',color:'#718096',fontWeight:600}},
              (exerciseIdx + 1) + ' / ' + exTotal),
            React.createElement('span', {
              style: {fontSize:'11px',padding:'3px 10px',borderRadius:'12px',fontWeight:600,
                background: levelColors[exItem.level] + '18', color: levelColors[exItem.level]}
            }, levelIcons[exItem.level] + ' ' + exItem.level)
          ),

          // Progress bar
          React.createElement('div', {className: 'progress-bar', style: {height:'6px',marginBottom:'20px'}},
            React.createElement('div', {className: 'progress-fill',
              style: {width: exProgressPct + '%', background: 'linear-gradient(90deg,#324A84,#7E9470)',
                transition: 'width 0.3s ease'}})
          ),

          // Word info badge
          React.createElement('div', {style: {textAlign:'center',marginBottom:'12px'}},
            React.createElement('span', {className: 'tag ' + exItem.wordInfo.typeClass,
              style: {fontSize:'11px'}}, exItem.wordInfo.type),
            React.createElement('span', {style: {fontSize:'11px',color:'#94a3b8',marginLeft:'8px'}},
              exItem.wordInfo.cat)
          ),

          // Exercise card
          React.createElement('div', {className: 'card', style: {
            border: exerciseFeedback ? ('2px solid ' + (exerciseFeedback.correct ? '#7E9470' : '#E74C3C')) : '2px solid #e2e8f0',
            transition: 'border-color 0.2s ease', minHeight:'180px'
          }},

            // Prompt
            React.createElement('p', {style: {fontSize:'15px',fontWeight:600,color:'#2E3033',marginBottom:'16px',lineHeight:'1.5'}},
              exItem.prompt),

            // Listening: auto-play pronunciation
            exItem.type === 'listening' && !exerciseFeedback ?
              React.createElement('button', {
                style: {display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',
                  padding:'14px',borderRadius:'12px',background:'#324A8410',border:'2px solid #324A84',
                  cursor:'pointer',marginBottom:'12px',width:'100%',fontSize:'15px',color:'#324A84',fontWeight:600},
                onClick: function() { speakGerman(exItem.germanWord); }
              }, '\uD83D\uDD0A Play again') : null,

            // All choice-based types (multiple_choice, reverse_choice, listening)
            (exItem.type === 'multiple_choice' || exItem.type === 'reverse_choice' || exItem.type === 'listening') && !exerciseFeedback ?
              React.createElement('div', {style: {display:'flex',flexDirection:'column',gap:'8px'}},
                exItem.options.map(function(opt, oi) {
                  var isSelected = exerciseSelectedIdx === oi;
                  return React.createElement('button', {
                    key: oi,
                    style: {
                      padding:'12px 16px',textAlign:'left',borderRadius:'10px',fontSize:'14px',
                      border: isSelected ? '2px solid #324A84' : '2px solid #e2e8f0',
                      background: isSelected ? '#324A8410' : '#fff',
                      cursor:'pointer',transition:'all 0.15s ease',fontWeight: isSelected ? 600 : 400
                    },
                    onClick: function() { setExerciseSelectedIdx(oi); }
                  }, opt.text);
                })
              ) : null,

            // Choice-based feedback state
            (exItem.type === 'multiple_choice' || exItem.type === 'reverse_choice' || exItem.type === 'listening') && exerciseFeedback ?
              React.createElement('div', {style: {display:'flex',flexDirection:'column',gap:'8px'}},
                exItem.options.map(function(opt, oi) {
                  var isCorrect = opt.wi === exItem.wordIdx;
                  var wasSelected = exerciseSelectedIdx === oi;
                  return React.createElement('div', {
                    key: oi,
                    style: {
                      padding:'12px 16px',borderRadius:'10px',fontSize:'14px',
                      border: '2px solid ' + (isCorrect ? '#7E9470' : (wasSelected && !isCorrect ? '#E74C3C' : '#e2e8f0')),
                      background: isCorrect ? '#7E947018' : (wasSelected && !isCorrect ? '#E74C3C10' : '#f8f9fa'),
                      fontWeight: isCorrect ? 600 : 400
                    }
                  }, (isCorrect ? '\u2705 ' : (wasSelected && !isCorrect ? '\u274C ' : '')) + opt.text);
                })
              ) : null,

            // Fill in blank / sentence complete / fill english input
            // Conjugation exercise: show pronoun prominently
            exItem.type === 'conjugation' && !exerciseFeedback ?
              React.createElement('div', null,
                React.createElement('div', {style: {
                  display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px',
                  padding:'12px 16px',borderRadius:'10px',background:'#324A8410'
                }},
                  React.createElement('span', {style: {fontSize:'20px',fontWeight:700,color:'#324A84'}},
                    exItem.pronoun),
                  React.createElement('input', {
                    type: 'text', value: exerciseAnswer,
                    onChange: function(e) { setExerciseAnswer(e.target.value); },
                    onKeyDown: function(e) {
                      if (e.key !== 'Enter') return;
                      if (exerciseFeedback) { nextExerciseItem(); }
                      else if (exerciseAnswer.trim()) { checkExerciseAnswer(); }
                    },
                    placeholder: exItem.pronoun + ' ...',
                    autoFocus: true, autoComplete: 'off', autoCapitalize: 'off',
                    style: {flex:1,padding:'10px 14px',fontSize:'16px',borderRadius:'8px',
                      border:'2px solid #e2e8f0',outline:'none',fontFamily:'inherit'}
                  })
                )
              ) : null,

            // Conjugation feedback: show answer + full conjugation table
            exItem.type === 'conjugation' && exerciseFeedback ?
              React.createElement('div', null,
                !exerciseFeedback.correct ? React.createElement('div', {style: {
                  padding:'12px 16px',borderRadius:'10px',fontSize:'15px',fontWeight:600,
                  background:'#E74C3C10',border:'2px solid #E74C3C',marginBottom:'8px',
                  textDecoration:'line-through',color:'#E74C3C'
                }}, '\u274C ' + exItem.pronoun + ' ' + exerciseFeedback.userAnswer) : null,
                React.createElement('div', {style: {
                  padding:'12px 16px',borderRadius:'10px',fontSize:'15px',fontWeight:600,
                  background:'#7E947018',border:'2px solid #7E9470',marginBottom:'12px'
                }}, '\u2705 ' + exItem.fullAnswer),
                // Full conjugation table
                React.createElement('div', {style: {
                  padding:'12px',borderRadius:'10px',background:'#f8f6f0',border:'1px solid #e8e2d6'
                }},
                  React.createElement('div', {style: {fontSize:'11px',fontWeight:700,color:'#D67635',
                    textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'8px'}},
                    '\uD83D\uDCDD Full conjugation: ' + exItem.infinitive),
                  PRONOUNS.map(function(p, pi) {
                    var pk = PRONOUN_KEYS[pi];
                    var isTarget = pk === exItem.pronounKey;
                    return React.createElement('div', {key: pi, style: {
                      display:'flex',justifyContent:'space-between',padding:'4px 8px',
                      borderRadius:'4px',fontSize:'13px',
                      background: isTarget ? '#324A8415' : 'transparent',
                      fontWeight: isTarget ? 700 : 400
                    }},
                      React.createElement('span', {style: {color:'#718096',minWidth:'70px'}}, p),
                      React.createElement('span', {style: {color:'#2E3033'}}, exItem.fullTable[pk])
                    );
                  })
                )
              ) : null,

            (exItem.type === 'fill_blank' || exItem.type === 'sentence_complete' || exItem.type === 'fill_english') && !exerciseFeedback ?
              React.createElement('div', null,
                exItem.hint ? React.createElement('p', {style: {fontSize:'12px',color:'#94a3b8',marginBottom:'8px'}},
                  '\uD83D\uDCA1 Hint: ' + exItem.hint) : null,
                React.createElement('input', {
                  type: 'text',
                  value: exerciseAnswer,
                  onChange: function(e) { setExerciseAnswer(e.target.value); },
                  onKeyDown: function(e) {
                    if (e.key !== 'Enter') return;
                    if (exerciseFeedback) { nextExerciseItem(); }
                    else if (exerciseAnswer.trim()) { checkExerciseAnswer(); }
                  },
                  placeholder: 'Type your answer...',
                  autoFocus: true,
                  autoComplete: 'off',
                  autoCapitalize: 'off',
                  style: {
                    width:'100%',padding:'12px 16px',fontSize:'16px',borderRadius:'10px',
                    border:'2px solid #e2e8f0',outline:'none',boxSizing:'border-box',
                    fontFamily:'inherit'
                  }
                })
              ) : null,

            // Text input feedback
            (exItem.type === 'fill_blank' || exItem.type === 'sentence_complete' || exItem.type === 'fill_english') && exerciseFeedback ?
              React.createElement('div', null,
                // Show user's wrong answer first
                !exerciseFeedback.correct ? React.createElement('div', {style: {
                  padding:'12px 16px',borderRadius:'10px',fontSize:'15px',fontWeight:600,
                  background:'#E74C3C10',border:'2px solid #E74C3C',marginBottom:'8px',
                  textDecoration:'line-through',color:'#E74C3C'
                }}, '\u274C ' + exerciseFeedback.userAnswer) : null,
                // Show correct answer
                React.createElement('div', {style: {
                  padding:'12px 16px',borderRadius:'10px',fontSize:'15px',fontWeight:600,
                  background: exerciseFeedback.correct ? '#7E947018' : '#7E947012',
                  border: '2px solid #7E9470',
                  marginBottom:'8px'
                }},
                  '\u2705 ' + exerciseFeedback.correctAnswer),
                exerciseFeedback.sentence ? React.createElement('p', {
                  style: {fontSize:'13px',color:'#718096',fontStyle:'italic',marginTop:'8px'}
                }, '\uD83D\uDDE3\uFE0F ' + exerciseFeedback.sentence) : null
              ) : null,

            // Reading exercise — passage + multiple choice
            (exItem.type === 'reading' || exItem.type === 'reading_comprehension') && exItem.passage ?
              React.createElement('div', null,
                React.createElement('div', {style: {
                  padding:'14px 16px',borderRadius:'10px',background:'#f8f6f0',
                  border:'1px solid #e8e2d6',marginBottom:'14px',lineHeight:'1.7',fontSize:'14px'
                }},
                  React.createElement('div', {style: {fontSize:'11px',fontWeight:700,color:'#D67635',
                    textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'6px'}},
                    '\uD83D\uDCD6 ' + (exItem.passageTitle || 'Lesetext')),
                  React.createElement('p', {style: {margin:0,color:'#2E3033'}}, exItem.passage)
                ),
                !exerciseFeedback ?
                  React.createElement('div', {style: {display:'flex',flexDirection:'column',gap:'8px'}},
                    exItem.options.map(function(opt, oi) {
                      var isSelected = exerciseSelectedIdx === oi;
                      return React.createElement('button', {
                        key: oi,
                        style: {
                          padding:'12px 16px',textAlign:'left',borderRadius:'10px',fontSize:'14px',
                          border: isSelected ? '2px solid #324A84' : '2px solid #e2e8f0',
                          background: isSelected ? '#324A8410' : '#fff',
                          cursor:'pointer',transition:'all 0.15s ease',fontWeight: isSelected ? 600 : 400
                        },
                        onClick: function() { setExerciseSelectedIdx(oi); }
                      }, opt.text);
                    })
                  ) :
                  React.createElement('div', null,
                    React.createElement('div', {style: {display:'flex',flexDirection:'column',gap:'8px',marginBottom:'10px'}},
                      exItem.options.map(function(opt, oi) {
                        var isCorrect = exItem.type === 'reading_comprehension'
                          ? oi === exItem.correctIdx
                          : opt.wi === exItem.wordIdx;
                        var wasSelected = exerciseSelectedIdx === oi;
                        return React.createElement('div', {
                          key: oi,
                          style: {
                            padding:'12px 16px',borderRadius:'10px',fontSize:'14px',
                            border: '2px solid ' + (isCorrect ? '#7E9470' : (wasSelected && !isCorrect ? '#E74C3C' : '#e2e8f0')),
                            background: isCorrect ? '#7E947018' : (wasSelected && !isCorrect ? '#E74C3C10' : '#f8f9fa'),
                            fontWeight: isCorrect ? 600 : 400
                          }
                        }, (isCorrect ? '\u2705 ' : (wasSelected && !isCorrect ? '\u274C ' : '')) + opt.text);
                      })
                    ),
                    exItem.passageTranslation ? React.createElement('details', {style: {marginTop:'8px'}},
                      React.createElement('summary', {style: {fontSize:'12px',color:'#94a3b8',cursor:'pointer'}},
                        'Show English translation'),
                      React.createElement('p', {style: {fontSize:'12px',color:'#718096',marginTop:'4px',lineHeight:'1.5',fontStyle:'italic'}},
                        exItem.passageTranslation)
                    ) : null
                  )
              ) : null
          ),

          // Feedback message
          exerciseFeedback ? React.createElement('div', {style: {
            textAlign:'center',padding:'12px',margin:'12px 0',borderRadius:'10px',
            background: exerciseFeedback.correct ? '#f0fdf4' : '#fef2f2',
            color: exerciseFeedback.correct ? '#166534' : '#991b1b',
            fontWeight:600,fontSize:'14px'
          }}, exerciseFeedback.message) : null,

          // Action buttons
          React.createElement('div', {style: {marginTop:'16px'}},
            !exerciseFeedback ?
              React.createElement('button', {
                className: 'btn btn-primary',
                disabled: (exItem.type === 'multiple_choice' || exItem.type === 'reading' || exItem.type === 'reading_comprehension' || exItem.type === 'reverse_choice' || exItem.type === 'listening') ? exerciseSelectedIdx < 0 :
                  !exerciseAnswer.trim(),
                onClick: checkExerciseAnswer
              }, 'Check Answer') :
              React.createElement('button', {
                className: 'btn btn-primary',
                onClick: nextExerciseItem
              }, exerciseIdx + 1 >= exTotal ? 'See Results' : 'Next \u2192')
          )
        )
      )
    );
  }

  // ===== EXERCISE COMPLETE =====
  if (view === 'exercise-complete' && exerciseSession) {
    var exResults = exerciseResults;
    var exCorrect = exResults.filter(function(r) { return r.correct; }).length;
    var exTotalQ = exResults.length;
    var exPct = exTotalQ > 0 ? Math.round(exCorrect / exTotalQ * 100) : 0;
    var exDuration = Math.round((Date.now() - exerciseSession.startTime) / 60000);

    // Group results by word
    var wordResults = {};
    exResults.forEach(function(r) {
      if (!wordResults[r.wordIdx]) wordResults[r.wordIdx] = {correct: 0, total: 0, types: []};
      wordResults[r.wordIdx].total++;
      if (r.correct) wordResults[r.wordIdx].correct++;
      wordResults[r.wordIdx].types.push({type: r.type, level: r.level, correct: r.correct});
    });

    // Words that need more practice
    var weakWords = Object.keys(wordResults).filter(function(wi) {
      return wordResults[wi].correct < wordResults[wi].total;
    }).map(Number);

    var exMessage = exPct >= 90 ? 'Outstanding!' : exPct >= 70 ? 'Great work!' :
                    exPct >= 50 ? 'Good effort!' : 'Keep practicing!';
    var exEmoji = exPct >= 90 ? '\uD83C\uDF1F' : exPct >= 70 ? '\uD83D\uDCAA' :
                  exPct >= 50 ? '\uD83D\uDC4D' : '\uD83C\uDF31';

    return (
      React.createElement('div', {className: 'app'},
        React.createElement('div', {className: 'content', style: {paddingTop:'max(32px, env(safe-area-inset-top, 32px))'}},
          React.createElement('div', {style: {textAlign:'center',marginBottom:'24px'}},
            React.createElement('div', {style: {fontSize:'56px',marginBottom:'8px'}}, exEmoji),
            React.createElement('h1', {style: {marginBottom:'4px'}}, exMessage),
            React.createElement('p', {style: {color:'#718096',fontSize:'13px'}},
              'Exercise session complete' + (exDuration > 0 ? ' \u2022 ' + exDuration + ' min' : ''))
          ),

          // Stats
          React.createElement('div', {className: 'stat-grid'},
            React.createElement('div', {className: 'stat'},
              React.createElement('div', {className: 'num', style: {color: exPct >= 70 ? '#7E9470' : '#D67635'}}, exPct + '%'),
              React.createElement('div', {className: 'label'}, 'Accuracy')
            ),
            React.createElement('div', {className: 'stat'},
              React.createElement('div', {className: 'num'}, exCorrect + '/' + exTotalQ),
              React.createElement('div', {className: 'label'}, 'Correct')
            )
          ),

          // Results by level
          React.createElement('div', {className: 'card', style: {marginTop:'16px'}},
            React.createElement('h2', {style: {marginBottom:'12px'}}, 'Performance by Stage'),
            ['Remember', 'Understand', 'Apply', 'Analyze'].map(function(level) {
              var levelResults = exResults.filter(function(r) { return r.level === level; });
              var levelCorrect = levelResults.filter(function(r) { return r.correct; }).length;
              var levelTotal = levelResults.length;
              if (levelTotal === 0) return null;
              var pct = Math.round(levelCorrect / levelTotal * 100);
              var levelColor = {Remember: '#324A84', Understand: '#D67635', Apply: '#7E9470', Analyze: '#8E44AD'}[level];
              return React.createElement('div', {key: level, style: {marginBottom:'10px'}},
                React.createElement('div', {style: {display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}},
                  React.createElement('span', {style: {fontSize:'13px',fontWeight:600,color: levelColor}}, level),
                  React.createElement('span', {style: {fontSize:'12px',color:'#718096'}}, levelCorrect + '/' + levelTotal)
                ),
                React.createElement('div', {className: 'progress-bar', style: {height:'6px'}},
                  React.createElement('div', {className: 'progress-fill',
                    style: {width: pct + '%', background: levelColor}})
                )
              );
            })
          ),

          // Word breakdown
          React.createElement('div', {className: 'card', style: {marginTop:'12px'}},
            React.createElement('h2', {style: {marginBottom:'12px'}}, 'Words Practiced'),
            React.createElement('div', {className: 'word-list'},
              Object.keys(wordResults).map(function(wi) {
                var wr = wordResults[wi];
                var w = getWord(parseInt(wi));
                var allCorrect = wr.correct === wr.total;
                return React.createElement('div', {className: 'word-row', key: wi},
                  React.createElement('span', null,
                    React.createElement('strong', null, w.german)),
                  React.createElement('span', {style: {color:'#718096'}}, w.english),
                  React.createElement('span', {style: {color: allCorrect ? '#7E9470' : '#D67635', fontWeight:600}},
                    wr.correct + '/' + wr.total + (allCorrect ? ' \u2705' : ' \u26A0\uFE0F'))
                );
              })
            )
          ),

          // Weak words encouragement
          weakWords.length > 0 ? React.createElement('div', {className: 'tip-box',
            style: {marginTop:'12px',background:'#FFF8E1',borderColor:'#E9B746'}},
            React.createElement('strong', null, '\uD83D\uDCA1 Focus words: '),
            weakWords.map(function(wi) { return getWord(wi).german; }).join(', '),
            ' — these will appear more often in future exercises.'
          ) : React.createElement('div', {className: 'tip-box',
            style: {marginTop:'12px',background:'#f0fdf4',borderColor:'#7E9470'}},
            React.createElement('strong', null, '\uD83C\uDF1F Perfect session! '),
            'All words answered correctly. They\'ll be reviewed at longer intervals now.'
          ),

          // Buttons
          React.createElement('div', {style: {display:'flex',gap:'10px',marginTop:'16px'}},
            React.createElement('button', {
              className: 'btn btn-primary',
              style: {flex:1},
              onClick: function() { setView('dashboard'); }
            }, 'Back to Dashboard'),
            totalLearned >= 5 ? React.createElement('button', {
              className: 'btn btn-secondary',
              style: {flex:1},
              onClick: startExercise
            }, 'Practice Again') : null
          )
        )
      )
    );
  }

  // ===== NAV HELPER =====
  function renderNav(active) {
    var langFlagUrl = 'https://flagcdn.com/w40/de.png'; // German flag default
    var items = [
      {id: 'dashboard', icon: '\uD83C\uDFE0', label: 'Home'},
      {id: 'progress', icon: '\uD83D\uDCC8', label: 'Progress'},
      {id: 'browse', icon: '\uD83D\uDCDA', label: 'Browse'},
      {id: 'settings', icon: '\u2699\uFE0F', label: 'Settings'}
    ];
    return React.createElement(React.Fragment, null,
      React.createElement('nav', {className: 'nav'},
        onHome ? React.createElement('button', {
          key: 'lang',
          onClick: onHome,
          style: {minWidth:'46px',padding:'10px 4px 8px',display:'flex',alignItems:'center',justifyContent:'center'}
        }, React.createElement('img', {
          src: langFlagUrl,
          alt: 'Language',
          style: {width:'24px',height:'18px',objectFit:'cover',borderRadius:'2px'}
        })) : null,
        items.map(function(item) {
          return React.createElement('button', {
            key: item.id,
            className: active === item.id ? 'active' : '',
            onClick: function() { setView(item.id); }
          }, item.icon + ' ' + item.label);
        })
      ),
      syncEmail ? React.createElement('div', {className: 'sync-bar'},
        React.createElement('div', {className: 'sync-dot ' +
          (syncStatus === 'syncing' ? 'syncing' : syncStatus === 'error' ? 'offline' : 'online')}),
        React.createElement('span', null,
          syncMsg || ('\u2601\uFE0F ' + syncEmail)
        )
      ) : null
    );
  }

  // ===== DASHBOARD =====
  if (view === "dashboard") {
    var pendingReviews = reviewsDue.length;
    var hasNextBatch = nextBatch !== null;
    var isSunday = today.getDay() === 0;
    var todayLearnCount = todayCompleted.learnCount || 0;

    // Schedule status
    var scheduleText = '';
    var scheduleColor = '';
    var scheduleIcon = '';
    if (scheduleGap > 0) {
      scheduleText = scheduleGap + ' batch' + (scheduleGap > 1 ? 'es' : '') + ' ahead';
      scheduleColor = '#27AE60'; scheduleIcon = '\uD83D\uDE80';
    } else if (scheduleGap < 0) {
      scheduleText = Math.abs(scheduleGap) + ' batch' + (Math.abs(scheduleGap) > 1 ? 'es' : '') + ' behind';
      scheduleColor = '#E74C3C'; scheduleIcon = '\u26A0\uFE0F';
    } else {
      scheduleText = 'On track';
      scheduleColor = '#2E86C1'; scheduleIcon = '\u2705';
    }

    return (
      React.createElement('div', {className: 'app'},
        renderNav('dashboard'),
        React.createElement('div', {className: 'content'},
          React.createElement('div', {style: {display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}},
            React.createElement('div', null,
              React.createElement('h1', {style: {marginBottom:'2px'}}, "Today's Plan"),
              React.createElement('p', {style: {fontSize:'12px',color:'#718096'}},
                formatDate(today) + ' \u2022 Day ' + studyDay + ' \u2022 Week ' + weekNum)
            ),
            React.createElement('span', {className: 'phase-indicator',
              style: {background: phaseColors[phase] + '22', color: phaseColors[phase]}},
              'Phase ' + phase + ': ' + phaseNames[phase])
          ),

          // Schedule indicator
          studyDay > 0 ? React.createElement('div', {
            style: {display:'flex',alignItems:'center',gap:'6px',padding:'8px 12px',
              background: scheduleColor + '11',borderRadius:'8px',margin:'8px 0',
              border:'1px solid ' + scheduleColor + '33'}},
            React.createElement('span', null, scheduleIcon),
            React.createElement('span', {style: {fontSize:'12px',fontWeight:600,color: scheduleColor}},
              scheduleText),
            React.createElement('span', {style: {fontSize:'11px',color:'#718096',marginLeft:'auto'}},
              batchesCompleted + '/' + batches.length + ' batches \u2022 ' +
              todayLearnCount + ' today')
          ) : null,

          React.createElement('div', {className: 'stat-grid'},
            React.createElement('div', {className: 'stat'},
              React.createElement('div', {className: 'num'}, totalLearned),
              React.createElement('div', {className: 'label'}, 'Words learned')
            ),
            React.createElement('div', {className: 'stat'},
              React.createElement('div', {className: 'num'}, Math.round(totalLearned/1500*100) + '%'),
              React.createElement('div', {className: 'label'}, 'Overall progress')
            )
          ),

          React.createElement('div', {className: 'progress-bar', style: {height:'10px',marginBottom:'16px'}},
            React.createElement('div', {className: 'progress-fill',
              style: {width: (totalLearned/1500*100) + '%',
                background:'linear-gradient(90deg,#27AE60,#2ECC71)'}})
          ),

          // Sunday rest suggestion (but still allow learning)
          isSunday ? React.createElement('div', {className: 'sunday-banner'},
            React.createElement('div', {className: 'icon'}, '\uD83D\uDCA4'),
            React.createElement('h2', {style: {color:'#1B4F72',marginBottom:'8px'}}, 'Rest Day'),
            React.createElement('p', {style: {fontSize:'13px',color:'#718096'}},
              'Sunday is your rest day! But you can still learn if you want.')
          ) : null,

          today < startDate ? React.createElement('div', {className: 'card card-accent'},
            React.createElement('div', {className: 'empty-state'},
              React.createElement('div', {className: 'icon'}, '\uD83D\uDCC5'),
              React.createElement('p', null, 'Your plan starts on ',
                React.createElement('strong', null, formatDate(startDate))),
              React.createElement('p', {style: {fontSize:'12px',marginTop:'4px'}},
                'Get your flashcard notebook ready!')
            )
          ) :

          React.createElement(React.Fragment, null,
            // Completed batches today
            todayLearnCount > 0 ? React.createElement('div', {
              className: 'card', style: {background:'#EAFAF1',borderColor:'#27AE60'}},
              React.createElement('span', {style: {color:'#27AE60',fontWeight:600}},
                '\u2705 ' + todayLearnCount + ' batch' + (todayLearnCount > 1 ? 'es' : '') + ' learned today!')
            ) : null,

            // Next batch to learn (always shown if available)
            hasNextBatch ? React.createElement('div', {className: 'card card-accent'},
              React.createElement('div', {style: {display:'flex',justifyContent:'space-between',alignItems:'center'}},
                React.createElement('div', null,
                  React.createElement('div', {className: 'review-type-label',
                    style: {color:'#27AE60'}},
                    todayLearnCount === 0 ? '\uD83C\uDF31 New Words' : '\uD83C\uDF31 Learn More'),
                  React.createElement('strong', null, 'Batch ' + nextBatch),
                  React.createElement('span', {style: {fontSize:'12px',color:'#718096',marginLeft:'8px'}},
                    batches[nextBatch-1].length + ' words')
                ),
                React.createElement('button', {
                  className: 'btn btn-success btn-sm',
                  style: {width:'auto'},
                  onClick: function() { startSession("learn", nextBatch); }
                }, todayLearnCount === 0 ? 'Start Learning' : 'Learn Next Batch')
              ),
              React.createElement('div', {className: 'word-list', style: {maxHeight:'100px',marginTop:'8px'}},
                batches[nextBatch-1].map(function(wi, i) {
                  var wd = getWord(wi);
                  return React.createElement('div', {className: 'word-row', key: i},
                    React.createElement('span', {className: 'tag ' + wd.typeClass}, wd.type),
                    React.createElement('strong', null, wd.german),
                    React.createElement('span', null, wd.english)
                  );
                })
              )
            ) :

            React.createElement('div', {
              className: 'card', style: {background:'#FEF9E7'}},
              React.createElement('span', {style: {color:'#B7950B',fontWeight:600}},
                '\uD83C\uDFC6 All 1500 words introduced! Focus on reviews.')
            ),

            // Reviews section
            reviewsDue.length > 0 ? React.createElement('div', null,
              React.createElement('h2', {style: {marginTop:'16px'}},
                '\uD83D\uDD04 Reviews Due (' + reviewsDue.length + ')'),
              reviewsDue.map(function(r, i) {
                var badgeColors = {2:'#F39C12',3:'#E74C3C',5:'#8E44AD',7:'#1B4F72'};
                return React.createElement('div', {className: 'card', key: i, style: {padding:'12px'}},
                  React.createElement('div', {style: {display:'flex',justifyContent:'space-between',alignItems:'center'}},
                    React.createElement('div', {style: {display:'flex',alignItems:'center',gap:'10px'}},
                      React.createElement('div', {className: 'task-badge',
                        style: {background: badgeColors[r.interval]}}, '+' + r.interval),
                      React.createElement('div', null,
                        React.createElement('div', {className: 'review-type-label',
                          style: {color: badgeColors[r.interval]}},
                          REVIEW_LABELS[r.interval]),
                        React.createElement('span', {style: {fontSize:'12px',color:'#718096'}},
                          'Batch ' + r.batch + ' \u2022 ' + batches[r.batch-1].length + ' words')
                      )
                    ),
                    React.createElement('button', {
                      className: 'btn btn-primary btn-sm',
                      style: {width:'auto'},
                      onClick: function() { startSession("review", r.batch, r.interval); }
                    }, 'Review')
                  )
                );
              })
            ) : React.createElement('div', {
              className: 'card', style: {background:'#EAFAF1',marginTop:'12px',textAlign:'center'}},
              React.createElement('span', {style: {color:'#27AE60'}},
                '\u2705 All reviews completed for today!')
            ),

            // Exercise section
            totalLearned >= 5 ? React.createElement('div', {className: 'card card-accent', style: {marginTop:'12px',
              borderColor:'#324A84',background:'#324A8408'}},
              React.createElement('div', {style: {display:'flex',justifyContent:'space-between',alignItems:'center'}},
                React.createElement('div', null,
                  React.createElement('div', {className: 'review-type-label', style: {color:'#324A84'}},
                    '\uD83C\uDFAF Practice Mode'),
                  React.createElement('div', {style: {display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'4px'}},
                    exerciseStats.weak.length > 0 ? React.createElement('span', {
                      style: {fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'#E74C3C18',color:'#E74C3C',fontWeight:600}
                    }, exerciseStats.weak.length + ' weak') : null,
                    exerciseStats.due.length > 0 ? React.createElement('span', {
                      style: {fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'#D6763518',color:'#D67635',fontWeight:600}
                    }, exerciseStats.due.length + ' due') : null,
                    exerciseStats.neverPracticed.length > 0 ? React.createElement('span', {
                      style: {fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'#324A8418',color:'#324A84',fontWeight:600}
                    }, exerciseStats.neverPracticed.length + ' new') : null,
                    exerciseStats.weak.length === 0 && exerciseStats.due.length === 0 && exerciseStats.neverPracticed.length === 0 ?
                      React.createElement('span', {
                        style: {fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'#7E947018',color:'#7E9470',fontWeight:600}
                      }, '\u2705 All caught up!') : null
                  )
                ),
                React.createElement('button', {
                  className: 'btn btn-sm',
                  disabled: exerciseLoading,
                  style: {width:'auto',background:'#324A84',color:'#fff',border:'none'},
                  onClick: startExercise
                }, exerciseLoading ? '\u2728 Generating...' : 'Exercise')
              )
            ) : null,

            // Behind schedule tip
            scheduleGap < -2 ? React.createElement('div', {className: 'tip-box',
              style: {background:'#FDEDEC',borderColor:'#F5B7B1'}},
              React.createElement('strong', null, '\u26A0\uFE0F Catching up: '),
              'You\'re ' + Math.abs(scheduleGap) + ' batches behind. Try learning 2-3 batches today to catch up! No pressure though \u2014 go at your own pace.'
            ) :

            // Science tip
            React.createElement('div', {className: 'tip-box', style: {marginTop:'16px'}},
              React.createElement('strong', null, '\uD83D\uDCA1 Science Tip: '),
              SCIENCE_TIPS[studyDay % SCIENCE_TIPS.length]
            )
          )
        )
      )
    );
  }

  // ===== PROGRESS VIEW =====
  if (view === "progress") {
    // Compute memory stages for all words
    var stageCounts = [0, 0, 0, 0, 0, 0]; // index 0 = not learned, 1-5 = stages
    Object.keys(progress).forEach(function(k) {
      var stage = getMemoryStage(progress[k]);
      stageCounts[stage]++;
    });
    var notLearned = 1500 - totalLearned;
    var maxStageCount = Math.max.apply(null, stageCounts.slice(1).concat([1])); // for bar scaling

    return (
      React.createElement('div', {className: 'app'},
        renderNav('progress'),
        React.createElement('div', {className: 'content'},
          React.createElement('h1', null, 'Your Progress'),

          React.createElement('div', {className: 'stat-grid'},
            React.createElement('div', {className: 'stat'},
              React.createElement('div', {className: 'num'}, totalLearned),
              React.createElement('div', {className: 'label'}, 'Learned')
            ),
            React.createElement('div', {className: 'stat'},
              React.createElement('div', {className: 'num'}, stageCounts[5]),
              React.createElement('div', {className: 'label'}, 'Mastered')
            ),
            React.createElement('div', {className: 'stat'},
              React.createElement('div', {className: 'num'}, notLearned),
              React.createElement('div', {className: 'label'}, 'Remaining')
            ),
            React.createElement('div', {className: 'stat'},
              React.createElement('div', {className: 'num'}, Math.ceil(notLearned / 8)),
              React.createElement('div', {className: 'label'}, 'Days to go')
            )
          ),

          // Memory Stages Bar Chart
          React.createElement('h2', null, 'Memory Stages'),
          React.createElement('div', {className: 'card memory-stages-card'},
            React.createElement('p', {style: {fontSize:'12px',color:'#94a3b8',marginBottom:'16px',lineHeight:'1.5'}},
              'Words move up through 5 memory stages as you review them. Higher stages need less frequent review.'),

            // Bar chart
            React.createElement('div', {className: 'stage-chart'},
              MEMORY_STAGES.map(function(stage, i) {
                var count = stageCounts[stage.level];
                var pct = totalLearned > 0 ? Math.round(count / totalLearned * 100) : 0;
                var barWidth = maxStageCount > 0 ? Math.max(count / maxStageCount * 100, count > 0 ? 4 : 0) : 0;

                return React.createElement('div', {key: i, className: 'stage-row'},
                  // Stage label
                  React.createElement('div', {className: 'stage-label'},
                    React.createElement('span', {className: 'stage-dot', style: {background: stage.color}}),
                    React.createElement('span', {className: 'stage-name'}, stage.name)
                  ),
                  // Bar
                  React.createElement('div', {className: 'stage-bar-track'},
                    React.createElement('div', {className: 'stage-bar-fill',
                      style: {width: barWidth + '%', background: stage.color}
                    })
                  ),
                  // Count
                  React.createElement('div', {className: 'stage-count'},
                    React.createElement('span', {style: {fontWeight:600}}, count),
                    React.createElement('span', {className: 'stage-pct'}, pct > 0 ? ' (' + pct + '%)' : '')
                  )
                );
              })
            ),

            // Not learned row
            totalLearned < 1500 ? React.createElement('div', {className: 'stage-row', style: {marginTop:'12px',paddingTop:'12px',borderTop:'1px solid #F5EBDC'}},
              React.createElement('div', {className: 'stage-label'},
                React.createElement('span', {className: 'stage-dot', style: {background: '#CBD5E0'}}),
                React.createElement('span', {className: 'stage-name', style: {color:'#94a3b8'}}, 'Not started')
              ),
              React.createElement('div', {className: 'stage-bar-track'},
                React.createElement('div', {className: 'stage-bar-fill',
                  style: {width: (notLearned / 1500 * 100) + '%', background: '#CBD5E0'}
                })
              ),
              React.createElement('div', {className: 'stage-count', style: {color:'#94a3b8'}},
                React.createElement('span', {style: {fontWeight:600}}, notLearned)
              )
            ) : null,

            // Stage legend
            React.createElement('div', {className: 'stage-legend'},
              MEMORY_STAGES.map(function(stage, i) {
                return React.createElement('div', {key: i, className: 'stage-legend-item', style: {background: stage.bg, borderColor: stage.color}},
                  React.createElement('div', {style: {fontWeight:600,fontSize:'12px',color: stage.color, fontFamily:'Montserrat,sans-serif'}},
                    'Lv.' + stage.level + ' ' + stage.name),
                  React.createElement('div', {style: {fontSize:'11px',color:'#64748b',marginTop:'2px'}}, stage.desc)
                );
              })
            )
          ),

          React.createElement('h2', null, 'By Category'),
          React.createElement('div', {className: 'card', style: {maxHeight:'300px',overflowY:'auto'}},
            cats.map(function(cat, ci) {
              var catWords = [];
              words.forEach(function(w, wi) { if (w[2] === ci) catWords.push(wi); });
              var learned = catWords.filter(function(wi) { return progress[wi]?.learned; }).length;
              return React.createElement('div', {key: ci, style: {margin:'6px 0'}},
                React.createElement('div', {style: {display:'flex',justifyContent:'space-between',fontSize:'12px'}},
                  React.createElement('span', null, cat),
                  React.createElement('span', {style: {fontWeight:500,color:'#64748b'}}, learned + '/' + catWords.length)
                ),
                React.createElement('div', {className: 'progress-bar', style: {height:'5px'}},
                  React.createElement('div', {className: 'progress-fill',
                    style: {width: (catWords.length ? learned/catWords.length*100 : 0) + '%',
                      background:'#324A84'}})
                )
              );
            })
          )
        )
      )
    );
  }

  // ===== BROWSE VIEW =====
  if (view === "browse") {
    var filtered = words.map(function(w, i) {
      return {idx: i, german: w[0], english: w[1], catIdx: w[2], typeIdx: w[3]};
    }).filter(function(w) {
      if (searchTerm && !w.german.toLowerCase().includes(searchTerm.toLowerCase())
          && !w.english.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterType >= 0 && w.typeIdx !== filterType) return false;
      return true;
    }).slice(0, 100);

    return (
      React.createElement('div', {className: 'app'},
        renderNav('browse'),
        React.createElement('div', {className: 'content'},
          React.createElement('h1', null, 'Browse All Words'),
          React.createElement('input', {
            type: 'text',
            placeholder: 'Search German or English...',
            value: searchTerm,
            onChange: function(e) { setSearchTerm(e.target.value); },
            style: {marginBottom:'8px'}
          }),

          React.createElement('div', {className: 'tabs'},
            React.createElement('button', {
              className: 'tab' + (filterType === -1 ? ' active' : ''),
              onClick: function() { setFilterType(-1); }
            }, 'All types'),
            TYPE_NAMES.map(function(t, i) {
              return React.createElement('button', {
                key: i,
                className: 'tab' + (filterType === i ? ' active' : ''),
                onClick: function() { setFilterType(i); }
              }, t);
            })
          ),

          React.createElement('p', {style: {fontSize:'11px',color:'#718096',marginBottom:'6px'}},
            'Showing ' + filtered.length + ' of 1500 words'),

          React.createElement('div', {style: {maxHeight:'500px',overflowY:'auto'}},
            filtered.map(function(w, i) {
              var conf = progress[w.idx]?.confidence || 0;
              var isLearned = progress[w.idx]?.learned;
              var icons = ['','\u274C','\uD83E\uDD14','\uD83D\uDE10','\u2705'];
              return React.createElement('div', {className: 'word-row', key: i},
                React.createElement('div', {style: {flex:1}},
                  typeof WORD_EMOJIS !== 'undefined' ? React.createElement('span', {style: {marginRight:'4px'}}, WORD_EMOJIS[w.idx]) : null,
                  React.createElement('strong', null, w.german),
                  React.createElement('span', {className: 'tag ' + TYPE_TAGS[w.typeIdx],
                    style: {marginLeft:'6px'}}, TYPE_NAMES[w.typeIdx])
                ),
                React.createElement('span', {style: {color:'#718096',flex:1}}, w.english),
                React.createElement('span', {style: {fontSize:'11px'}},
                  isLearned ? icons[conf] : '\u2B24')
              );
            })
          )
        )
      )
    );
  }

  // ===== SETTINGS =====
  if (view === "settings") {
    return (
      React.createElement('div', {className: 'app'},
        renderNav('settings'),
        React.createElement('div', {className: 'content'},
          React.createElement('h1', null, 'Settings'),

          React.createElement('div', {className: 'card'},
            React.createElement('div', {className: 'settings-row'},
              React.createElement('span', null, 'Start date'),
              React.createElement('input', {
                type: 'date',
                value: dateKey(startDate),
                style: {width:'auto'},
                onChange: function(e) {
                  var d = new Date(e.target.value + 'T00:00:00');
                  if (!isNaN(d)) setStartDate(d);
                }
              })
            ),
            React.createElement('div', {className: 'settings-row'},
              React.createElement('span', null, 'Current study day'),
              React.createElement('strong', null, studyDay)
            ),
            React.createElement('div', {className: 'settings-row'},
              React.createElement('span', null, 'Week / Phase'),
              React.createElement('span', null, 'Week ' + weekNum + ' / Phase ' + phase)
            ),
            React.createElement('div', {className: 'settings-row'},
              React.createElement('span', null, 'Auto-save'),
              React.createElement('span', {style: {color:'#27AE60',fontWeight:600}}, '\u2705 Enabled')
            )
          ),

          React.createElement('h2', null, 'Cloud Sync'),
          React.createElement('div', {className: 'card'},
            React.createElement('p', {style: {fontSize:'12px',color:'#718096',marginBottom:'10px'}},
              'Sync progress across devices. Enter the same email on each device to keep them in sync.'),
            syncEmail ?
              React.createElement('div', null,
                React.createElement('div', {className: 'settings-row'},
                  React.createElement('span', null, 'Synced as'),
                  React.createElement('strong', {style: {fontSize:'12px'}}, syncEmail)
                ),
                React.createElement('div', {className: 'settings-row'},
                  React.createElement('span', null, 'Status'),
                  React.createElement('span', {style: {color: syncStatus === 'error' ? '#E74C3C' : '#27AE60', fontWeight:600, fontSize:'12px'}},
                    syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Error' : 'Connected')
                ),
                React.createElement('div', {className: 'btn-group', style: {marginTop:'10px'}},
                  React.createElement('button', {className: 'btn btn-primary btn-sm',
                    onClick: function() { connectSync(syncEmail); }},
                    'Sync Now'),
                  React.createElement('button', {className: 'btn btn-secondary btn-sm',
                    style: {color:'#E74C3C'},
                    onClick: disconnectSync},
                    'Disconnect')
                )
              ) :
              React.createElement('div', null,
                React.createElement('input', {
                  type: 'email',
                  id: 'sync-email-input',
                  placeholder: 'Enter your email...',
                  style: {marginBottom:'8px'}
                }),
                React.createElement('button', {
                  className: 'btn btn-primary btn-sm',
                  onClick: function() {
                    var email = document.getElementById('sync-email-input').value.trim();
                    if (email && email.includes('@')) connectSync(email);
                    else alert('Please enter a valid email');
                  }
                }, 'Connect')
              )
          ),

          React.createElement('h2', null, 'Daily Reminder'),
          React.createElement('div', {className: 'card'},
            React.createElement('p', {style: {fontSize:'12px',color:'#718096',marginBottom:'10px'}},
              'Get a daily push notification reminding you to study. Works on Android and iOS (Add to Home Screen required).'),
            !('PushManager' in window) ?
              React.createElement('p', {style: {fontSize:'12px',color:'#E74C3C'}},
                'Push notifications are not supported in this browser. On iOS, add this app to your Home Screen first.') :
            pushEnabled ?
              React.createElement('div', null,
                React.createElement('div', {className: 'settings-row'},
                  React.createElement('span', null, 'Status'),
                  React.createElement('span', {style: {color:'#27AE60',fontWeight:600}}, '\uD83D\uDD14 Active')
                ),
                React.createElement('div', {className: 'settings-row'},
                  React.createElement('span', null, 'Remind me at'),
                  React.createElement('select', {
                    value: reminderHour,
                    style: {padding:'6px 10px',borderRadius:'6px',border:'1px solid #e2e8f0',fontSize:'13px'},
                    onChange: function(e) {
                      var hour = parseInt(e.target.value);
                      setReminderHour(hour);
                      localStorage.setItem('vocab_reminder_hour', hour);
                      if (pushSubscription) {
                        updateReminderHour(pushSubscription.endpoint, hour);
                      }
                    }
                  },
                    React.createElement('option', {value: 6}, '6:00 AM'),
                    React.createElement('option', {value: 7}, '7:00 AM'),
                    React.createElement('option', {value: 8}, '8:00 AM'),
                    React.createElement('option', {value: 9}, '9:00 AM'),
                    React.createElement('option', {value: 10}, '10:00 AM'),
                    React.createElement('option', {value: 11}, '11:00 AM'),
                    React.createElement('option', {value: 12}, '12:00 PM'),
                    React.createElement('option', {value: 13}, '1:00 PM'),
                    React.createElement('option', {value: 14}, '2:00 PM'),
                    React.createElement('option', {value: 15}, '3:00 PM'),
                    React.createElement('option', {value: 16}, '4:00 PM'),
                    React.createElement('option', {value: 17}, '5:00 PM'),
                    React.createElement('option', {value: 18}, '6:00 PM'),
                    React.createElement('option', {value: 19}, '7:00 PM'),
                    React.createElement('option', {value: 20}, '8:00 PM'),
                    React.createElement('option', {value: 21}, '9:00 PM')
                  )
                ),
                React.createElement('button', {
                  className: 'btn btn-secondary btn-sm',
                  style: {marginTop:'10px',color:'#E74C3C'},
                  onClick: function() {
                    setPushLoading(true);
                    if (pushSubscription) {
                      deactivatePushSubscription(pushSubscription.endpoint).then(function() {
                        pushSubscription.unsubscribe();
                        setPushSubscription(null);
                        setPushEnabled(false);
                        setPushLoading(false);
                      });
                    }
                  }
                }, 'Disable Reminders')
              ) :
              React.createElement('button', {
                className: 'btn btn-primary',
                disabled: pushLoading,
                onClick: function() {
                  setPushLoading(true);
                  registerServiceWorker().then(function(reg) {
                    if (!reg) {
                      alert('Service Worker not supported');
                      setPushLoading(false);
                      return;
                    }
                    return Notification.requestPermission().then(function(perm) {
                      if (perm !== 'granted') {
                        alert('Notification permission denied. Please enable it in your browser settings.');
                        setPushLoading(false);
                        return;
                      }
                      return subscribeToPush(reg).then(function(sub) {
                        return savePushSubscription(sub, syncEmail, reminderHour).then(function(ok) {
                          if (ok) {
                            setPushSubscription(sub);
                            setPushEnabled(true);
                          } else {
                            alert('Failed to save subscription. Please try again.');
                          }
                          setPushLoading(false);
                        });
                      });
                    });
                  }).catch(function(err) {
                    alert('Failed to enable notifications: ' + err.message);
                    setPushLoading(false);
                  });
                }
              }, pushLoading ? 'Enabling...' : '\uD83D\uDD14 Enable Daily Reminder')
          ),

          React.createElement('h2', null, 'Reset'),
          React.createElement('div', {className: 'card'},
            React.createElement('p', {style: {fontSize:'12px',color:'#94a3b8',marginBottom:'10px'}},
              'This will permanently delete all your learning progress. This action cannot be undone.'),

            // Step 0: Show reset button
            resetStep === 0 ? React.createElement('button', {
              className: 'btn btn-secondary',
              style: {color:'#E74C3C'},
              onClick: function() { setResetStep(1); }
            }, 'Reset All Progress') : null,

            // Step 1: Are you sure?
            resetStep === 1 ? React.createElement('div', null,
              React.createElement('p', {style: {fontSize:'13px',color:'#E74C3C',fontWeight:600,marginBottom:'10px'}},
                '\u26A0\uFE0F Are you sure? All your progress will be permanently lost.'),
              React.createElement('div', {className: 'btn-group'},
                React.createElement('button', {
                  className: 'btn btn-secondary btn-sm',
                  onClick: function() { setResetStep(0); }
                }, 'Cancel'),
                React.createElement('button', {
                  className: 'btn btn-sm',
                  style: {background:'#E74C3C',color:'#fff'},
                  onClick: function() { setResetStep(2); setResetPass(''); setResetError(''); }
                }, 'Yes, reset everything')
              )
            ) : null,

            // Step 2: Enter password
            resetStep === 2 ? React.createElement('div', null,
              React.createElement('p', {style: {fontSize:'13px',color:'#2E3033',fontWeight:600,marginBottom:'10px'}},
                '\uD83D\uDD12 Enter your password to confirm reset'),
              React.createElement('input', {
                type: 'password',
                value: resetPass,
                placeholder: 'Password',
                style: {marginBottom:'8px'},
                onChange: function(e) { setResetPass(e.target.value); setResetError(''); },
                onKeyDown: function(e) { if (e.key === 'Enter') document.getElementById('reset-confirm-btn')?.click(); }
              }),
              resetError ? React.createElement('p', {style: {color:'#E74C3C',fontSize:'12px',marginBottom:'8px'}}, resetError) : null,
              React.createElement('div', {className: 'btn-group'},
                React.createElement('button', {
                  className: 'btn btn-secondary btn-sm',
                  onClick: function() { setResetStep(0); setResetPass(''); setResetError(''); }
                }, 'Cancel'),
                React.createElement('button', {
                  id: 'reset-confirm-btn',
                  className: 'btn btn-sm',
                  style: {background:'#E74C3C',color:'#fff'},
                  disabled: resetStep === 3,
                  onClick: function() {
                    if (!resetPass.trim()) { setResetError('Please enter your password'); return; }
                    setResetStep(3);
                    fetch(VERIFY_URL, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ password: resetPass })
                    }).then(function(res) { return res.json(); }).then(function(data) {
                      if (data.ok) {
                        setProgress({});
                        setTodayCompleted({learnCount: 0, learnedBatches: [], reviews: {}});
                        setResetStep(0);
                        setResetPass('');
                        alert('All progress has been reset.');
                      } else {
                        setResetError(data.error || 'Incorrect password');
                        setResetStep(2);
                      }
                    }).catch(function() {
                      setResetError('Connection error. Please try again.');
                      setResetStep(2);
                    });
                  }
                }, resetStep === 3 ? 'Verifying...' : 'Confirm Reset')
              )
            ) : null
          ),

          React.createElement('h2', null, 'Backup & Restore'),
          React.createElement('div', {className: 'card'},
            React.createElement('p', {style: {fontSize:'12px',color:'#94a3b8',marginBottom:'10px'}},
              'Your progress saves automatically to this browser. Use export/import for backup or to transfer between devices.'),
            React.createElement('div', {className: 'btn-group'},
              React.createElement('button', {className: 'btn btn-primary', onClick: exportProgress},
                '\uD83D\uDCBE Export Backup'),
              React.createElement('label', {className: 'btn btn-secondary', style: {cursor:'pointer'}},
                '\uD83D\uDCC2 Import',
                React.createElement('input', {
                  type: 'file', accept: '.json',
                  onChange: importProgress,
                  style: {display:'none'}
                })
              )
            )
          ),

          onHome ? React.createElement('div', {className: 'card', style: {marginTop:'16px'}},
            React.createElement('h2', null, 'Language'),
            React.createElement('button', {
              className: 'btn btn-secondary',
              style: {marginTop:'8px'},
              onClick: onHome
            }, '\uD83C\uDF10 Switch Language')
          ) : null
        )
      )
    );
  }

  return null;
}

// ===== HOME SCREEN (Language Picker) =====
const VERIFY_URL = SUPABASE_URL + '/functions/v1/verify-password';

function Home() {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('vocab_language') || null; } catch { return null; }
  });
  const [authenticated, setAuthenticated] = useState(() => {
    try { return localStorage.getItem('vocab_auth') === 'true'; } catch { return false; }
  });
  const [pendingLang, setPendingLang] = useState(null);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  function trySelectLanguage(lang) {
    if (authenticated) {
      localStorage.setItem('vocab_language', lang);
      setLanguage(lang);
    } else {
      setPendingLang(lang);
      setPassInput('');
      setPassError('');
    }
  }

  function submitPassword() {
    if (!passInput.trim()) return;
    setPassLoading(true);
    setPassError('');
    fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passInput })
    }).then(function(res) { return res.json(); }).then(function(data) {
      setPassLoading(false);
      if (data.ok) {
        localStorage.setItem('vocab_auth', 'true');
        localStorage.setItem('vocab_language', pendingLang);
        setAuthenticated(true);
        setLanguage(pendingLang);
        setPendingLang(null);
      } else {
        setPassError(data.error || 'Incorrect password');
      }
    }).catch(function() {
      setPassLoading(false);
      setPassError('Connection error. Please try again.');
    });
  }

  function goHome() {
    localStorage.removeItem('vocab_language');
    setLanguage(null);
  }

  if (language === 'german' && authenticated) {
    return React.createElement(App, {onHome: goHome});
  }

  if (language === 'english' && authenticated) {
    return React.createElement('div', {className: 'app'},
      React.createElement('div', {className: 'home-header'},
        React.createElement('button', {onClick: goHome, style: {background:'none',border:'none',color:'#fff',fontSize:'14px',cursor:'pointer'}}, '\u2190 Back'),
        React.createElement('span', {style: {fontSize:'15px',fontWeight:600}}, 'English Vocabulary'),
        React.createElement('span', null, '')
      ),
      React.createElement('div', {className: 'content', style: {textAlign:'center',paddingTop:'60px'}},
        React.createElement('div', {style: {fontSize:'64px',marginBottom:'16px'}}, '\uD83C\uDDEC\uD83C\uDDE7'),
        React.createElement('h1', null, 'Coming Soon!'),
        React.createElement('p', {style: {color:'#718096',margin:'12px 0'}}, 'English vocabulary course is under development.'),
        React.createElement('button', {className: 'btn btn-primary', style: {marginTop:'20px',maxWidth:'200px',margin:'20px auto'}, onClick: goHome}, 'Back to Home')
      )
    );
  }

  // Password prompt
  if (pendingLang) {
    return React.createElement('div', {className: 'app'},
      React.createElement('div', {className: 'home-header'},
        React.createElement('button', {onClick: function() { setPendingLang(null); }, style: {background:'none',border:'none',color:'#fff',fontSize:'14px',cursor:'pointer'}}, '\u2190 Back'),
        React.createElement('span', {style: {fontSize:'15px',fontWeight:700}}, 'Vocabulary Study'),
        React.createElement('span', null, '')
      ),
      React.createElement('div', {className: 'content', style: {paddingTop:'60px',textAlign:'center'}},
        React.createElement('div', {style: {fontSize:'48px',marginBottom:'12px'}}, '\uD83D\uDD12'),
        React.createElement('h1', {style: {fontSize:'18px',marginBottom:'16px'}}, 'Enter password to continue'),
        React.createElement('input', {
          type: 'password',
          value: passInput,
          placeholder: 'Password',
          style: {maxWidth:'240px',margin:'0 auto',display:'block',textAlign:'center'},
          onChange: function(e) { setPassInput(e.target.value); setPassError(''); },
          onKeyDown: function(e) { if (e.key === 'Enter' && !passLoading) submitPassword(); }
        }),
        passError ? React.createElement('p', {style: {color:'#E74C3C',fontSize:'12px',marginTop:'8px'}}, passError) : null,
        React.createElement('button', {
          className: 'btn btn-primary',
          style: {marginTop:'16px',maxWidth:'240px'},
          disabled: passLoading,
          onClick: submitPassword
        }, passLoading ? 'Verifying...' : 'Enter')
      )
    );
  }

  // Home screen - language picker
  return React.createElement('div', {className: 'app'},
    React.createElement('div', {className: 'home-header'},
      React.createElement('span', null, ''),
      React.createElement('span', {style: {fontSize:'15px',fontWeight:700}}, 'Vocabulary Study'),
      React.createElement('span', null, '')
    ),
    React.createElement('div', {className: 'content', style: {paddingTop:'max(32px, env(safe-area-inset-top, 32px))'}},
      React.createElement('div', {style: {textAlign:'center',marginBottom:'30px'}},
        React.createElement('img', {src: 'uniques-logo.png', alt: 'UniqueS', style: {width:'160px',marginBottom:'16px'}}),
        React.createElement('h1', {style: {fontSize:'20px',marginBottom:'4px',fontFamily:'Montserrat,sans-serif'}}, 'What would you like to study today?'),
        React.createElement('p', {style: {color:'#7E9470',fontSize:'13px'}}, 'Choose a language to get started')
      ),
      React.createElement('div', {className: 'language-grid'},
        React.createElement('button', {className: 'language-card', onClick: function() { trySelectLanguage('german'); }},
          React.createElement('div', {className: 'language-flag'},
            React.createElement('img', {src: 'https://flagcdn.com/w80/de.png', alt: 'German flag'})),
          React.createElement('div', {className: 'language-name'}, 'German'),
          React.createElement('div', {className: 'language-desc'}, '1500 words \u2022 A1-B1'),
          React.createElement('div', {className: 'language-tag active-tag'}, 'Active')
        ),
        React.createElement('button', {className: 'language-card', onClick: function() { trySelectLanguage('english'); }},
          React.createElement('div', {className: 'language-flag'},
            React.createElement('img', {src: 'https://flagcdn.com/w80/gb.png', alt: 'English flag'})),
          React.createElement('div', {className: 'language-name'}, 'English'),
          React.createElement('div', {className: 'language-desc'}, 'Coming soon'),
          React.createElement('div', {className: 'language-tag soon-tag'}, 'Soon')
        )
      ),

    ),
    React.createElement('div', {style: {padding:'12px 16px',textAlign:'center',fontSize:'11px',color:'#A0AEC0',lineHeight:'1.6',flexShrink:0}},
      React.createElement('div', null, '\u00A9 2026 Tam Tran Thanh. All rights reserved.'),
      React.createElement('div', null, 'Contact us: ',
        React.createElement('a', {href: 'mailto:uniques@officience.com', style: {color:'#D67635',textDecoration:'none'}}, 'uniques@officience.com')
      )
    )
  );
}

ReactDOM.render(React.createElement(Home), document.getElementById('root'));
