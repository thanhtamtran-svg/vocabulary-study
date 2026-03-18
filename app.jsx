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

  // Word image state
  const [wordImage, setWordImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Cloud sync state
  const [syncEmail, setSyncEmail] = useState(() => {
    try { return localStorage.getItem(SYNC_EMAIL_KEY) || ''; } catch { return ''; }
  });
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, done, error
  const [syncMsg, setSyncMsg] = useState('');
  const syncRef = useRef(false);

  // Fetch image + autoplay pronunciation when session word changes
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
    // Autoplay pronunciation
    speakGerman(w.german);
  }, [view, currentIdx, sessionWords]);

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
    setAiExplanation('');
    setAiLoading(false);
    setAiError('');
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
      setAiExplanation('');
      setAiLoading(false);
      setAiError('');
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
                fetchExplanation(w.german).then(function(text) {
                  setAiExplanation(text);
                  setAiLoading(false);
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
                  fetchExplanation(w.german).then(function(text) {
                    setAiExplanation(text);
                    setAiLoading(false);
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
                React.createElement('span', null, '\uD83E\uDD16 AI Teacher'),
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
        React.createElement('div', {className: 'content', style: {textAlign:'center',paddingTop:'40px'}},
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

  // ===== NAV HELPER =====
  function renderNav(active) {
    var items = [
      {id: 'dashboard', icon: '\uD83C\uDFE0', label: 'Home'},
      {id: 'progress', icon: '\uD83D\uDCC8', label: 'Progress'},
      {id: 'browse', icon: '\uD83D\uDCDA', label: 'Browse'},
      {id: 'settings', icon: '\u2699\uFE0F', label: 'Settings'}
    ];
    return React.createElement(React.Fragment, null,
      React.createElement('nav', {className: 'nav'},
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
    var byConf = [0,0,0,0,0];
    Object.values(progress).forEach(function(p) {
      if (p.learned) byConf[p.confidence || 0]++;
    });

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
              React.createElement('div', {className: 'num'}, totalMastered),
              React.createElement('div', {className: 'label'}, 'Mastered (4/4)')
            ),
            React.createElement('div', {className: 'stat'},
              React.createElement('div', {className: 'num'}, 1500 - totalLearned),
              React.createElement('div', {className: 'label'}, 'Remaining')
            ),
            React.createElement('div', {className: 'stat'},
              React.createElement('div', {className: 'num'}, Math.ceil((1500 - totalLearned)/8)),
              React.createElement('div', {className: 'label'}, 'Days to go')
            )
          ),

          React.createElement('h2', null, 'Confidence Breakdown'),
          React.createElement('div', {className: 'card'},
            [{label:"Not started", count: 1500 - totalLearned, color:"#CBD5E0"},
             {label:"No recall (1)", count: byConf[1], color:"#E74C3C"},
             {label:"Partial (2)", count: byConf[2], color:"#F39C12"},
             {label:"Slow but correct (3)", count: byConf[3], color:"#F1C40F"},
             {label:"Instant recall (4)", count: byConf[4], color:"#27AE60"}
            ].map(function(item, i) {
              return React.createElement('div', {key: i, style: {margin:'6px 0'}},
                React.createElement('div', {style: {display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'2px'}},
                  React.createElement('span', null, item.label),
                  React.createElement('span', {style: {fontWeight:600}}, item.count)
                ),
                React.createElement('div', {className: 'progress-bar'},
                  React.createElement('div', {className: 'progress-fill',
                    style: {width: (item.count/1500*100) + '%', background: item.color}})
                )
              );
            })
          ),

          React.createElement('h2', null, 'By Category'),
          React.createElement('div', {className: 'card', style: {maxHeight:'300px',overflowY:'auto'}},
            cats.map(function(cat, ci) {
              var catWords = [];
              words.forEach(function(w, wi) { if (w[2] === ci) catWords.push(wi); });
              var learned = catWords.filter(function(wi) { return progress[wi]?.learned; }).length;
              return React.createElement('div', {key: ci, style: {margin:'6px 0'}},
                React.createElement('div', {style: {display:'flex',justifyContent:'space-between',fontSize:'11px'}},
                  React.createElement('span', null, cat),
                  React.createElement('span', null, learned + '/' + catWords.length)
                ),
                React.createElement('div', {className: 'progress-bar', style: {height:'5px'}},
                  React.createElement('div', {className: 'progress-fill',
                    style: {width: (catWords.length ? learned/catWords.length*100 : 0) + '%',
                      background:'#2E86C1'}})
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

          React.createElement('h2', null, 'Backup & Restore'),
          React.createElement('div', {className: 'card'},
            React.createElement('p', {style: {fontSize:'12px',color:'#718096',marginBottom:'10px'}},
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

          React.createElement('h2', null, 'Reset'),
          React.createElement('div', {className: 'card'},
            React.createElement('button', {
              className: 'btn btn-secondary',
              style: {color:'#E74C3C'},
              onClick: function() {
                if (confirm("Reset ALL progress? This cannot be undone!")) {
                  setProgress({});
                  setTodayCompleted({learn: false, reviews: {}});
                }
              }
            }, 'Reset All Progress')
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
const PASSWORDS = { german: 'tam', english: 'tam' };

function Home() {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('vocab_language') || null; } catch { return null; }
  });
  const [authenticated, setAuthenticated] = useState(() => {
    try { return localStorage.getItem('vocab_auth') === 'true'; } catch { return false; }
  });
  const [pendingLang, setPendingLang] = useState(null);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  function trySelectLanguage(lang) {
    if (authenticated) {
      localStorage.setItem('vocab_language', lang);
      setLanguage(lang);
    } else {
      setPendingLang(lang);
      setPassInput('');
      setPassError(false);
    }
  }

  function submitPassword() {
    if (passInput === PASSWORDS[pendingLang]) {
      localStorage.setItem('vocab_auth', 'true');
      localStorage.setItem('vocab_language', pendingLang);
      setAuthenticated(true);
      setLanguage(pendingLang);
      setPendingLang(null);
    } else {
      setPassError(true);
    }
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
          onChange: function(e) { setPassInput(e.target.value); setPassError(false); },
          onKeyDown: function(e) { if (e.key === 'Enter') submitPassword(); }
        }),
        passError ? React.createElement('p', {style: {color:'#E74C3C',fontSize:'12px',marginTop:'8px'}}, 'Incorrect password') : null,
        React.createElement('button', {
          className: 'btn btn-primary',
          style: {marginTop:'16px',maxWidth:'240px'},
          onClick: submitPassword
        }, 'Enter')
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
    React.createElement('div', {className: 'content', style: {paddingTop:'40px'}},
      React.createElement('div', {style: {textAlign:'center',marginBottom:'30px'}},
        React.createElement('div', {style: {fontSize:'48px',marginBottom:'8px'}}, '\uD83D\uDCDA'),
        React.createElement('h1', {style: {fontSize:'22px',marginBottom:'4px'}}, 'What would you like to study today?'),
        React.createElement('p', {style: {color:'#718096',fontSize:'13px'}}, 'Choose a language to get started')
      ),
      React.createElement('div', {className: 'language-grid'},
        React.createElement('button', {className: 'language-card', onClick: function() { trySelectLanguage('german'); }},
          React.createElement('div', {className: 'language-flag'}, '\uD83C\uDDE9\uD83C\uDDEA'),
          React.createElement('div', {className: 'language-name'}, 'German'),
          React.createElement('div', {className: 'language-desc'}, '1500 words \u2022 A1-B1'),
          React.createElement('div', {className: 'language-tag active-tag'}, 'Active')
        ),
        React.createElement('button', {className: 'language-card', onClick: function() { trySelectLanguage('english'); }},
          React.createElement('div', {className: 'language-flag'}, '\uD83C\uDDEC\uD83C\uDDE7'),
          React.createElement('div', {className: 'language-name'}, 'English'),
          React.createElement('div', {className: 'language-desc'}, 'Coming soon'),
          React.createElement('div', {className: 'language-tag soon-tag'}, 'Soon')
        )
      )
    )
  );
}

ReactDOM.render(React.createElement(Home), document.getElementById('root'));
