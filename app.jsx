const {useState, useEffect, useCallback, useMemo} = React;

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
function App() {
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
    return {learn: false, reviews: {}};
  });

  // Session state (not persisted)
  const [sessionWords, setSessionWords] = useState([]);
  const [sessionType, setSessionType] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [streak, setStreak] = useState(0);

  // Browse state (hoisted to avoid hooks-in-conditional bug)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState(-1);

  const words = VOCAB_DATA.words;
  const batches = VOCAB_DATA.batches;
  const cats = VOCAB_DATA.cats;
  const today = useMemo(todayDate, []);
  const studyDay = useMemo(() => getStudyDay(startDate, today), [startDate, today]);
  const currentBatch = studyDay > 0 && studyDay <= batches.length ? studyDay : null;
  const weekNum = Math.ceil(studyDay / 6) || 1;
  const phase = weekNum <= 4 ? 1 : weekNum <= 14 ? 2 : weekNum <= 24 ? 3 : 4;
  const phaseNames = ["","Foundation","Acceleration","Peak Input","Consolidation"];
  const phaseColors = ["","#27AE60","#2E86C1","#8E44AD","#F39C12"];

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

  // Reviews due today
  const reviewsDue = useMemo(() => {
    const due = [];
    for (let bi = 1; bi <= Math.min(studyDay, batches.length); bi++) {
      let learnDate = new Date(startDate);
      let sd = 0;
      while (sd < bi) {
        if (learnDate.getDay() !== 0) sd++;
        if (sd < bi) learnDate.setDate(learnDate.getDate() + 1);
      }
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
  }, [studyDay, startDate, today, todayCompleted]);

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
        setTodayCompleted(tc => ({...tc, learn: true}));
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
            onClick: function() { setFlipped(!flipped); }},
            React.createElement('div', {className: 'flashcard' + (flipped ? ' flipped' : '')},
              React.createElement('div', {className: 'flashcard-face flashcard-front'},
                React.createElement('div', {style: {fontSize:'40px',marginBottom:'8px'}},
                  typeof WORD_EMOJIS !== 'undefined' ? WORD_EMOJIS[w.idx] : ''),
                React.createElement('span', {className: 'tag ' + w.typeClass,
                  style: {marginBottom:'12px'}}, w.type),
                React.createElement('div', {className: 'flashcard-word'}, w.german),
                React.createElement('div', {className: 'flashcard-meta'}, w.cat),
                React.createElement('div', {style: {marginTop:'16px',fontSize:'12px',opacity:0.7}},
                  'Tap to flip')
              ),
              React.createElement('div', {className: 'flashcard-face flashcard-back'},
                React.createElement('div', {style: {fontSize:'40px',marginBottom:'8px'}},
                  typeof WORD_EMOJIS !== 'undefined' ? WORD_EMOJIS[w.idx] : ''),
                React.createElement('span', {className: 'tag ' + w.typeClass,
                  style: {marginBottom:'8px'}}, w.type),
                React.createElement('div', {className: 'flashcard-english'}, w.english),
                React.createElement('div', {style: {fontSize:'16px',color:'#718096',marginTop:'4px'}}, w.german),
                React.createElement('div', {className: 'flashcard-category'}, w.cat)
              )
            )
          ),

          isLearn && !flipped ? React.createElement('div', {className: 'dual-coding-prompt'},
            React.createElement('strong', null, '\uD83C\uDFA8 Dual Coding: '), tip
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
            )
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
    return React.createElement('nav', {className: 'nav'},
      items.map(function(item) {
        return React.createElement('button', {
          key: item.id,
          className: active === item.id ? 'active' : '',
          onClick: function() { setView(item.id); }
        }, item.icon + ' ' + item.label);
      })
    );
  }

  // ===== DASHBOARD =====
  if (view === "dashboard") {
    var pendingReviews = reviewsDue.length;
    var hasNewBatch = currentBatch && currentBatch <= batches.length && !todayCompleted.learn;
    var isSunday = today.getDay() === 0;

    return (
      React.createElement('div', {className: 'app'},
        renderNav('dashboard'),
        React.createElement('div', {className: 'content'},
          React.createElement('div', {style: {display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}},
            React.createElement('div', null,
              React.createElement('h1', {style: {marginBottom:'2px'}}, "Today's Plan"),
              React.createElement('p', {style: {fontSize:'12px',color:'#718096'}},
                formatDate(today) + ' \u2022 Study Day ' + studyDay + ' \u2022 Week ' + weekNum)
            ),
            React.createElement('span', {className: 'phase-indicator',
              style: {background: phaseColors[phase] + '22', color: phaseColors[phase]}},
              'Phase ' + phase + ': ' + phaseNames[phase])
          ),

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

          // Sunday rest day
          isSunday ? React.createElement('div', {className: 'sunday-banner'},
            React.createElement('div', {className: 'icon'}, '\uD83D\uDCA4'),
            React.createElement('h2', {style: {color:'#1B4F72',marginBottom:'8px'}}, 'Rest Day'),
            React.createElement('p', {style: {fontSize:'13px',color:'#718096'}},
              'Sunday is your rest day! Your brain consolidates memories during rest. Try watching a German video or podcast for fun.')
          ) :

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
            // New words section
            hasNewBatch ? React.createElement('div', {className: 'card card-accent'},
              React.createElement('div', {style: {display:'flex',justifyContent:'space-between',alignItems:'center'}},
                React.createElement('div', null,
                  React.createElement('div', {className: 'review-type-label',
                    style: {color:'#27AE60'}}, '\uD83C\uDF31 New Words'),
                  React.createElement('strong', null, 'Batch ' + currentBatch),
                  React.createElement('span', {style: {fontSize:'12px',color:'#718096',marginLeft:'8px'}},
                    batches[currentBatch-1].length + ' words')
                ),
                React.createElement('button', {
                  className: 'btn btn-success btn-sm',
                  style: {width:'auto'},
                  onClick: function() { startSession("learn", currentBatch); }
                }, 'Start Learning')
              ),
              React.createElement('div', {className: 'word-list', style: {maxHeight:'100px',marginTop:'8px'}},
                batches[currentBatch-1].map(function(wi, i) {
                  var wd = getWord(wi);
                  return React.createElement('div', {className: 'word-row', key: i},
                    React.createElement('span', {className: 'tag ' + wd.typeClass}, wd.type),
                    React.createElement('strong', null, wd.german),
                    React.createElement('span', null, wd.english)
                  );
                })
              )
            ) :

            todayCompleted.learn && currentBatch ? React.createElement('div', {
              className: 'card', style: {background:'#EAFAF1',borderColor:'#27AE60'}},
              React.createElement('span', {style: {color:'#27AE60',fontWeight:600}},
                '\u2705 Batch ' + currentBatch + ' learned today!')
            ) :

            studyDay > batches.length ? React.createElement('div', {
              className: 'card', style: {background:'#FEF9E7'}},
              React.createElement('span', {style: {color:'#B7950B',fontWeight:600}},
                '\uD83C\uDFC6 All 1500 words introduced! Focus on reviews.')
            ) : null,

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
          )
        )
      )
    );
  }

  return null;
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));
