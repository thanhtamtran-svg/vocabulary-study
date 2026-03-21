import React from 'react';
import { PRONOUNS, PRONOUN_KEYS } from '../lib/constants.js';
import { speakGerman } from '../lib/speech.js';

// Safe inline markdown renderer (no dangerouslySetInnerHTML)
function renderInline(text, key) {
  var parts = [];
  var re = /\*\*(.+?)\*\*/g;
  var last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(React.createElement('strong', { key: key + '_b' + m.index }, m[1]));
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

function renderSafeText(text) {
  if (!text) return null;
  return text.split('\n').map(function(line, i) {
    return React.createElement('div', { key: 'line_' + i }, renderInline(line, i));
  });
}

export default function ExerciseView({
  exerciseSession, exerciseIdx, exerciseAnswer, setExerciseAnswer,
  exerciseFeedback, exerciseSelectedIdx, setExerciseSelectedIdx,
  exerciseResults, exerciseWhyLoading, exerciseWhyText,
  checkExerciseAnswer, nextExerciseItem, explainWrongAnswer,
  setView, exerciseLoading
}) {
  var exItem = exerciseSession.items[exerciseIdx];
  var exTotal = exerciseSession.items.length;
  var exProgressPct = ((exerciseIdx + (exerciseFeedback ? 1 : 0)) / exTotal * 100);
  var levelColors = {Remember: '#324A84', Understand: '#D67635', Apply: '#7E9470', Analyze: '#8E44AD'};
  var levelIcons = {Remember: '\uD83E\uDDE0', Understand: '\uD83D\uDCA1', Apply: '\u270D\uFE0F', Analyze: '\uD83D\uDCD6'};

  return (
    <div className="app">
      <div className="content" style={{paddingTop:'max(16px, env(safe-area-inset-top, 16px))'}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
          <button
            className="btn btn-secondary btn-sm"
            style={{width:'auto',padding:'6px 12px'}}
            onClick={function() {
              if (exerciseResults.length > 0 && !confirm('Exit exercise? Your progress will be saved.')) return;
              setView('dashboard');
            }}
          >{'\u2190'} Exit</button>
          <span style={{fontSize:'13px',color:'#718096',fontWeight:600}}>
            {(exerciseIdx + 1) + ' / ' + exTotal}
          </span>
          <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'12px',fontWeight:600,
            background: levelColors[exItem.level] + '18', color: levelColors[exItem.level]}}>
            {levelIcons[exItem.level] + ' ' + exItem.level}
          </span>
        </div>

        {/* Progress bar */}
        <div className="progress-bar" style={{height:'6px',marginBottom:'20px'}}>
          <div className="progress-fill"
            style={{width: exProgressPct + '%', background: 'linear-gradient(90deg,#324A84,#7E9470)',
              transition: 'width 0.3s ease'}} />
        </div>

        {/* Word info badge */}
        <div style={{textAlign:'center',marginBottom:'12px'}}>
          <span className={'tag ' + exItem.wordInfo.typeClass}
            style={{fontSize:'11px'}}>{exItem.wordInfo.type}</span>
          <span style={{fontSize:'11px',color:'#94a3b8',marginLeft:'8px'}}>
            {exItem.wordInfo.cat}
          </span>
        </div>

        {/* Exercise card */}
        <div className="card" style={{
          border: exerciseFeedback ? ('2px solid ' + (exerciseFeedback.correct ? '#7E9470' : '#E74C3C')) : '2px solid #e2e8f0',
          transition: 'border-color 0.2s ease', minHeight:'180px'
        }}>

          {/* Prompt */}
          <p style={{fontSize:'15px',fontWeight:600,color:'#2E3033',marginBottom:'16px',lineHeight:'1.5'}}>
            {exItem.prompt}
          </p>

          {/* Listening: auto-play pronunciation */}
          {exItem.type === 'listening' && !exerciseFeedback ?
            <button
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',
                padding:'14px',borderRadius:'12px',background:'#324A8410',border:'2px solid #324A84',
                cursor:'pointer',marginBottom:'12px',width:'100%',fontSize:'15px',color:'#324A84',fontWeight:600}}
              onClick={function() { speakGerman(exItem.germanWord); }}
            >{'\uD83D\uDD0A'} Play again</button> : null}

          {/* All choice-based types (multiple_choice, reverse_choice, listening) */}
          {(exItem.type === 'multiple_choice' || exItem.type === 'reverse_choice' || exItem.type === 'listening') && !exerciseFeedback ?
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {exItem.options.map(function(opt, oi) {
                var isSelected = exerciseSelectedIdx === oi;
                return <button
                  key={oi}
                  style={{
                    padding:'12px 16px',textAlign:'left',borderRadius:'10px',fontSize:'14px',
                    border: isSelected ? '2px solid #324A84' : '2px solid #e2e8f0',
                    background: isSelected ? '#324A8410' : '#fff',
                    cursor:'pointer',transition:'all 0.15s ease',fontWeight: isSelected ? 600 : 400
                  }}
                  onClick={function() { setExerciseSelectedIdx(oi); }}
                >{opt.text}</button>;
              })}
            </div> : null}

          {/* Choice-based feedback state */}
          {(exItem.type === 'multiple_choice' || exItem.type === 'reverse_choice' || exItem.type === 'listening') && exerciseFeedback ?
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {exItem.options.map(function(opt, oi) {
                var isCorrect = opt.wi === exItem.wordIdx;
                var wasSelected = exerciseSelectedIdx === oi;
                return <div
                  key={oi}
                  style={{
                    padding:'12px 16px',borderRadius:'10px',fontSize:'14px',
                    border: '2px solid ' + (isCorrect ? '#7E9470' : (wasSelected && !isCorrect ? '#E74C3C' : '#e2e8f0')),
                    background: isCorrect ? '#7E947018' : (wasSelected && !isCorrect ? '#E74C3C10' : '#f8f9fa'),
                    fontWeight: isCorrect ? 600 : 400
                  }}
                >{(isCorrect ? '\u2705 ' : (wasSelected && !isCorrect ? '\u274C ' : '')) + opt.text}</div>;
              })}
            </div> : null}

          {/* Conjugation exercise: show pronoun prominently */}
          {exItem.type === 'conjugation' && !exerciseFeedback ?
            <div>
              <div style={{
                display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px',
                padding:'12px 16px',borderRadius:'10px',background:'#324A8410'
              }}>
                <span style={{fontSize:'20px',fontWeight:700,color:'#324A84'}}>
                  {exItem.pronoun}
                </span>
                <input
                  type="text" value={exerciseAnswer}
                  onChange={function(e) { setExerciseAnswer(e.target.value); }}
                  onKeyDown={function(e) {
                    if (e.key !== 'Enter') return;
                    if (exerciseFeedback) { nextExerciseItem(); }
                    else if (exerciseAnswer.trim()) { checkExerciseAnswer(); }
                  }}
                  placeholder={exItem.pronoun + ' ...'}
                  autoFocus={true} autoComplete="off" autoCapitalize="off"
                  style={{flex:1,padding:'10px 14px',fontSize:'16px',borderRadius:'8px',
                    border:'2px solid #e2e8f0',outline:'none',fontFamily:'inherit'}}
                />
              </div>
            </div> : null}

          {/* Conjugation feedback: show answer + full conjugation table */}
          {exItem.type === 'conjugation' && exerciseFeedback ?
            <div>
              {!exerciseFeedback.correct ? <div style={{
                padding:'12px 16px',borderRadius:'10px',fontSize:'15px',fontWeight:600,
                background:'#E74C3C10',border:'2px solid #E74C3C',marginBottom:'8px',
                textDecoration:'line-through',color:'#E74C3C'
              }}>{'\u274C ' + exItem.pronoun + ' ' + exerciseFeedback.userAnswer}</div> : null}
              <div style={{
                padding:'12px 16px',borderRadius:'10px',fontSize:'15px',fontWeight:600,
                background:'#7E947018',border:'2px solid #7E9470',marginBottom:'12px'
              }}>{'\u2705 ' + exItem.fullAnswer}</div>
              {/* Full conjugation table */}
              <div style={{
                padding:'12px',borderRadius:'10px',background:'#f8f6f0',border:'1px solid #e8e2d6'
              }}>
                <div style={{fontSize:'11px',fontWeight:700,color:'#D67635',
                  textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'8px'}}>
                  {'\uD83D\uDCDD Full conjugation: ' + exItem.infinitive}
                </div>
                {PRONOUNS.map(function(p, pi) {
                  var pk = PRONOUN_KEYS[pi];
                  var isTarget = pk === exItem.pronounKey;
                  return <div key={pi} style={{
                    display:'flex',justifyContent:'space-between',padding:'4px 8px',
                    borderRadius:'4px',fontSize:'13px',
                    background: isTarget ? '#324A8415' : 'transparent',
                    fontWeight: isTarget ? 700 : 400
                  }}>
                    <span style={{color:'#718096',minWidth:'70px'}}>{p}</span>
                    <span style={{color:'#2E3033'}}>{exItem.fullTable[pk]}</span>
                  </div>;
                })}
              </div>
            </div> : null}

          {/* Fill in blank / sentence complete / fill english input */}
          {(exItem.type === 'fill_blank' || exItem.type === 'sentence_complete' || exItem.type === 'fill_english') && !exerciseFeedback ?
            <div>
              {exItem.hint ? <p style={{fontSize:'12px',color:'#94a3b8',marginBottom:'8px'}}>
                {'\uD83D\uDCA1 Hint: ' + exItem.hint}
              </p> : null}
              <input
                type="text"
                value={exerciseAnswer}
                onChange={function(e) { setExerciseAnswer(e.target.value); }}
                onKeyDown={function(e) {
                  if (e.key !== 'Enter') return;
                  if (exerciseFeedback) { nextExerciseItem(); }
                  else if (exerciseAnswer.trim()) { checkExerciseAnswer(); }
                }}
                placeholder="Type your answer..."
                autoFocus={true}
                autoComplete="off"
                autoCapitalize="off"
                style={{
                  width:'100%',padding:'12px 16px',fontSize:'16px',borderRadius:'10px',
                  border:'2px solid #e2e8f0',outline:'none',boxSizing:'border-box',
                  fontFamily:'inherit'
                }}
              />
            </div> : null}

          {/* Text input feedback */}
          {(exItem.type === 'fill_blank' || exItem.type === 'sentence_complete' || exItem.type === 'fill_english') && exerciseFeedback ?
            <div>
              {!exerciseFeedback.correct ? <div style={{
                padding:'12px 16px',borderRadius:'10px',fontSize:'15px',fontWeight:600,
                background:'#E74C3C10',border:'2px solid #E74C3C',marginBottom:'8px',
                textDecoration:'line-through',color:'#E74C3C'
              }}>{'\u274C ' + exerciseFeedback.userAnswer}</div> : null}
              <div style={{
                padding:'12px 16px',borderRadius:'10px',fontSize:'15px',fontWeight:600,
                background: exerciseFeedback.correct ? '#7E947018' : '#7E947012',
                border: '2px solid #7E9470',
                marginBottom:'8px'
              }}>
                {'\u2705 ' + exerciseFeedback.correctAnswer}
              </div>
              {exerciseFeedback.sentence ? <p style={{fontSize:'13px',color:'#718096',fontStyle:'italic',marginTop:'8px'}}>
                {'\uD83D\uDDE3\uFE0F ' + exerciseFeedback.sentence}
              </p> : null}
            </div> : null}

          {/* Reading exercise — passage + multiple choice */}
          {(exItem.type === 'reading' || exItem.type === 'reading_comprehension') && exItem.passage ?
            <div>
              <div style={{
                padding:'14px 16px',borderRadius:'10px',background:'#f8f6f0',
                border:'1px solid #e8e2d6',marginBottom:'14px',lineHeight:'1.7',fontSize:'14px'
              }}>
                <div style={{fontSize:'11px',fontWeight:700,color:'#D67635',
                  textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'6px'}}>
                  {'\uD83D\uDCD6 ' + (exItem.passageTitle || 'Lesetext')}
                </div>
                <p style={{margin:0,color:'#2E3033'}}>{exItem.passage}</p>
              </div>
              {!exerciseFeedback ?
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {exItem.options.map(function(opt, oi) {
                    var isSelected = exerciseSelectedIdx === oi;
                    return <button
                      key={oi}
                      style={{
                        padding:'12px 16px',textAlign:'left',borderRadius:'10px',fontSize:'14px',
                        border: isSelected ? '2px solid #324A84' : '2px solid #e2e8f0',
                        background: isSelected ? '#324A8410' : '#fff',
                        cursor:'pointer',transition:'all 0.15s ease',fontWeight: isSelected ? 600 : 400
                      }}
                      onClick={function() { setExerciseSelectedIdx(oi); }}
                    >{opt.text}</button>;
                  })}
                </div> :
                <div>
                  <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'10px'}}>
                    {exItem.options.map(function(opt, oi) {
                      var isCorrect = exItem.type === 'reading_comprehension'
                        ? oi === exItem.correctIdx
                        : opt.wi === exItem.wordIdx;
                      var wasSelected = exerciseSelectedIdx === oi;
                      return <div
                        key={oi}
                        style={{
                          padding:'12px 16px',borderRadius:'10px',fontSize:'14px',
                          border: '2px solid ' + (isCorrect ? '#7E9470' : (wasSelected && !isCorrect ? '#E74C3C' : '#e2e8f0')),
                          background: isCorrect ? '#7E947018' : (wasSelected && !isCorrect ? '#E74C3C10' : '#f8f9fa'),
                          fontWeight: isCorrect ? 600 : 400
                        }}
                      >{(isCorrect ? '\u2705 ' : (wasSelected && !isCorrect ? '\u274C ' : '')) + opt.text}</div>;
                    })}
                  </div>
                  {exItem.passageTranslation ? <details style={{marginTop:'8px'}}>
                    <summary style={{fontSize:'12px',color:'#94a3b8',cursor:'pointer'}}>
                      Show English translation
                    </summary>
                    <p style={{fontSize:'12px',color:'#718096',marginTop:'4px',lineHeight:'1.5',fontStyle:'italic'}}>
                      {exItem.passageTranslation}
                    </p>
                  </details> : null}
                </div>
              }
            </div> : null}
        </div>

        {/* Feedback message */}
        {exerciseFeedback ? <div style={{
          textAlign:'center',padding:'12px',margin:'12px 0',borderRadius:'10px',
          background: exerciseFeedback.correct ? '#f0fdf4' : '#fef2f2',
          color: exerciseFeedback.correct ? '#166534' : '#991b1b',
          fontWeight:600,fontSize:'14px'
        }}>{exerciseFeedback.message}</div> : null}

        {/* "Why?" button for wrong answers */}
        {exerciseFeedback && !exerciseFeedback.correct ? <div style={{textAlign:'center', marginBottom:'8px'}}>
          {!exerciseWhyText ? <button
            style={{
              background: 'none', border: '1px solid #D67635', color: '#D67635',
              padding: '6px 16px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600
            }}
            disabled={exerciseWhyLoading}
            onClick={explainWrongAnswer}
          >{exerciseWhyLoading ? 'Thinking...' : '\uD83E\uDD14 Why was I wrong?'}</button> : null}
          {exerciseWhyText ? <div style={{
            textAlign: 'left', padding: '12px 16px', margin: '8px 0',
            background: '#FFF8F0', border: '1px solid #F5EBDC', borderRadius: '10px',
            fontSize: '13px', lineHeight: '1.6', color: '#2E3033'
          }}>
            <div style={{fontWeight: 700, color: '#D67635', marginBottom: '6px', fontSize: '13px'}}>{'\uD83D\uDCA1'} AI Teacher</div>
            <div>{renderSafeText(exerciseWhyText)}</div>
          </div> : null}
        </div> : null}

        {/* Action buttons */}
        <div style={{marginTop:'16px'}}>
          {!exerciseFeedback ?
            <button
              className="btn btn-primary"
              disabled={(exItem.type === 'multiple_choice' || exItem.type === 'reading' || exItem.type === 'reading_comprehension' || exItem.type === 'reverse_choice' || exItem.type === 'listening') ? exerciseSelectedIdx < 0 :
                !exerciseAnswer.trim()}
              onClick={checkExerciseAnswer}
            >Check Answer</button> :
            <button
              className="btn btn-primary"
              onClick={nextExerciseItem}
            >{exerciseIdx + 1 >= exTotal ? 'See Results' : 'Next \u2192'}</button>
          }
        </div>
      </div>
    </div>
  );
}
