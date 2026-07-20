import React, { useState } from 'react';
import Nav from '../components/Nav';
import { REVIEW_LABELS, SCIENCE_TIPS, MEMORY_STAGES } from '../lib/constants';
import { formatDate } from '../lib/dates';

export default React.memo(function Dashboard({
  onNavigate, onHome, syncEmail, syncStatus, syncMsg, langFlag,
  today, studyDay, weekNum, phase, phaseNames, phaseColors,
  totalLearned, batchesCompleted, batches, scheduleGap,
  todayCompleted, nextBatch, reviewsDue, startSession, getWord,
  dailyStreak, weekDays, exerciseStats, exerciseLoading, startExercise,
  startDate, isSunday, formatDateFn, totalWords, cats, variant, words
}) {
  var pendingReviews = reviewsDue.length;
  var hasNextBatch = nextBatch !== null;
  var totalW = totalWords || 1500;
  // For A1.1 variant: show "Lektion X" label instead of "Batch X"
  function batchLabel(batchIdx) {
    if (variant !== 'a11' || !batches || !words || !cats || !batchIdx) return 'Batch ' + batchIdx;
    var firstWi = batches[batchIdx - 1] && batches[batchIdx - 1][0];
    if (firstWi === undefined) return 'Batch ' + batchIdx;
    var catIdx = words[firstWi] && words[firstWi][2];
    if (catIdx === undefined) return 'Batch ' + batchIdx;
    var catLabel = cats[catIdx] || '';
    // Count which batch this is within the Lektion
    var idxInLektion = 0;
    for (var i = 0; i < batchIdx; i++) {
      if (batches[i] && words[batches[i][0]] && words[batches[i][0]][2] === catIdx) idxInLektion++;
    }
    return catLabel + ' (' + idxInLektion + ')';
  }
  var todayLearnCount = todayCompleted.learnCount || 0;
  // Random tip — stable per mount (new on each page load/refresh)
  var [tipIdx] = useState(() => Math.floor(Math.random() * SCIENCE_TIPS.length));

  // Schedule status
  var scheduleText = '';
  var scheduleColor = '';
  var scheduleIcon = '';
  if (scheduleGap > 0) {
    scheduleText = scheduleGap + ' batch' + (scheduleGap > 1 ? 'es' : '') + ' ahead';
    scheduleColor = 'var(--success)'; scheduleIcon = '\uD83D\uDE80';
  } else if (scheduleGap < 0) {
    scheduleText = Math.abs(scheduleGap) + ' batch' + (Math.abs(scheduleGap) > 1 ? 'es' : '') + ' behind';
    scheduleColor = 'var(--danger)'; scheduleIcon = '\u26A0\uFE0F';
  } else {
    scheduleText = 'On track';
    scheduleColor = '#2E86C1'; scheduleIcon = '\u2705';
  }

  return (
    <div className="app">
      <Nav active="dashboard" onNavigate={onNavigate} onHome={onHome}
        syncEmail={syncEmail} syncStatus={syncStatus} syncMsg={syncMsg} langFlag={langFlag} />
      <div className="content">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
          <div>
            <h1 style={{marginBottom:'2px'}}>Today's Plan</h1>
            <p style={{fontSize:'12px',color:'var(--text-muted)'}}>
              {formatDate(today) + ' \u2022 Day ' + studyDay + ' \u2022 Week ' + weekNum}
            </p>
          </div>
          <span className="phase-indicator"
            style={{background: phaseColors[phase] + '22', color: phaseColors[phase]}}>
            {'Phase ' + phase + ': ' + phaseNames[phase]}
          </span>
        </div>

        {/* Schedule indicator */}
        {studyDay > 0 ? <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 12px',
          background: scheduleColor + '11',borderRadius:'8px',margin:'8px 0',
          border:'1px solid ' + scheduleColor + '33'}}>
          <span>{scheduleIcon}</span>
          <span style={{fontSize:'12px',fontWeight:600,color: scheduleColor}}>
            {scheduleText}
          </span>
          <span style={{fontSize:'11px',color:'var(--text-muted)',marginLeft:'auto'}}>
            {batchesCompleted + '/' + batches.length + ' batches \u2022 ' +
            todayLearnCount + ' today'}
          </span>
        </div> : null}

        <div className="stat-grid">
          <div className="stat">
            <div className="num">{totalLearned}</div>
            <div className="label">Words learned</div>
          </div>
          <div className="stat">
            <div className="num">{Math.round(totalLearned/totalW*100) + '%'}</div>
            <div className="label">Overall progress</div>
          </div>
        </div>

        <div className="progress-bar" style={{height:'10px',marginBottom:'16px'}}
          role="progressbar" aria-valuenow={totalLearned} aria-valuemin={0} aria-valuemax={totalW}
          aria-label={totalLearned + ' of ' + totalW + ' words learned'}>
          <div className="progress-fill"
            style={{width: (totalLearned/totalW*100) + '%',
              background:'linear-gradient(90deg,#27AE60,#2ECC71)'}} />
        </div>

        {/* Sunday rest suggestion (but still allow learning) */}
        {isSunday ? <div className="sunday-banner">
          <div className="icon">{'\uD83D\uDCA4'}</div>
          <h2 style={{color:'var(--chip-text)',marginBottom:'8px'}}>Rest Day</h2>
          <p style={{fontSize:'13px',color:'var(--text-muted)'}}>
            Sunday is your rest day! But you can still learn if you want.
          </p>
        </div> : null}

        {today < startDate ? <div className="card card-accent">
          <div className="empty-state">
            <div className="icon">{'\uD83D\uDCC5'}</div>
            <p>Your plan starts on {' '}
              <strong>{formatDate(startDate)}</strong>
            </p>
            <p style={{fontSize:'12px',marginTop:'4px'}}>
              Get your flashcard notebook ready!
            </p>
          </div>
        </div> :

        <>
          {/* Daily Streak Widget */}
          <div className="card" style={{
            background: dailyStreak.status === 'danger' ? 'var(--danger-bg)' :
              dailyStreak.status === 'warning' ? 'var(--warning-bg)' :
              dailyStreak.studiedToday ? 'var(--success-bg)' : 'var(--card)',
            borderColor: dailyStreak.status === 'danger' ? 'var(--danger)' :
              dailyStreak.status === 'warning' ? 'var(--gold)' :
              dailyStreak.studiedToday ? 'var(--sage)' : 'var(--border)',
            padding: '16px', textAlign: 'center'
          }}>
            {/* Flame + streak count */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'12px'}}>
              <span style={{fontSize:'32px'}}>
                {dailyStreak.count > 0 ? '\uD83D\uDD25' : '\u2744\uFE0F'}
              </span>
              <span style={{fontSize:'28px',fontWeight:800,fontFamily:'Montserrat,sans-serif',
                color: dailyStreak.count > 0 ? 'var(--accent)' : 'var(--text-faint)'}}>
                {dailyStreak.count}
              </span>
              <span style={{fontSize:'14px',fontWeight:600,color:'var(--text-muted)'}}>
                {dailyStreak.count === 1 ? 'day streak' : 'day streak'}
              </span>
            </div>

            {/* Warning/danger messages \u2014 ladder tightened 2026-07-20:
                2 missed = yellow, 3 = red last-chance, 4+ = lost.
                Concrete numbers (days missed, streak size) motivate
                better than the old vague "at risk" copy. */}
            {dailyStreak.status === 'warning' && !dailyStreak.studiedToday ? <div style={{
              fontSize:'13px',color:'var(--accent)',fontWeight:600,marginBottom:'10px',
              padding:'6px 12px',background:'var(--warning-bg)',borderRadius:'8px',border:'1px solid var(--card-border)'
            }}>{'\u26A0\uFE0F ' + dailyStreak.realMissed + ' days missed \u2014 study today to keep your ' + dailyStreak.count + '-day streak!'}</div> : null}

            {dailyStreak.status === 'danger' ? <div style={{
              fontSize:'13px',color:'var(--danger)',fontWeight:600,marginBottom:'10px',
              padding:'6px 12px',background:'var(--danger-bg)',borderRadius:'8px',border:'1px solid var(--danger-border)'
            }}>{'\uD83D\uDEA8 Last chance! One more missed day and your ' + dailyStreak.count + '-day streak resets to zero.'}</div> : null}

            {dailyStreak.status === 'lost' ? <div style={{
              fontSize:'13px',color:'var(--text-muted)',marginBottom:'10px'
            }}>{'Your streak has reset. Start again today \u2014 day 1 is the hardest, and you\u2019ve done it before.'}</div> : null}

            {/* Weekly calendar */}
            <div style={{display:'flex',justifyContent:'center',gap:'6px',marginBottom:'12px'}}>
              {weekDays.map(function(wd, i) {
                return <div key={i} style={{textAlign:'center',width:'32px'}}>
                  <div style={{fontSize:'10px',color:'var(--text-faint)',marginBottom:'4px',fontWeight:600}}>{wd.label}</div>
                  <div style={{
                    width:'28px',height:'28px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'14px',margin:'0 auto',
                    background: wd.studied ? 'var(--sage)' : wd.isToday ? 'var(--warning-bg)' : 'transparent',
                    color: wd.studied ? '#fff' : 'var(--text-faint)',
                    border: wd.isToday && !wd.studied ? '2px dashed var(--accent)' :
                      wd.isPast && !wd.studied ? '1px solid var(--danger-tint)' : '1px solid transparent',
                    fontWeight: wd.isToday ? 700 : 400
                  }}>{wd.studied ? '\u2713' : wd.isPast && !wd.studied ? '\u2022' : ''}</div>
                </div>;
              })}
            </div>

            {/* Milestone progress */}
            {dailyStreak.count > 0 ? (function() {
              var milestones = [7, 14, 30, 60, 100, 365];
              var next = milestones.find(function(m) { return m > dailyStreak.count; }) || 365;
              var prev = milestones.filter(function(m) { return m <= dailyStreak.count; });
              var prevM = prev.length > 0 ? prev[prev.length - 1] : 0;
              var pct = Math.min(100, Math.round((dailyStreak.count - prevM) / (next - prevM) * 100));
              return <div style={{marginTop:'4px'}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text-faint)',marginBottom:'4px'}}>
                  <span>{dailyStreak.count + ' days'}</span>
                  <span>{'\uD83C\uDFC6 ' + next + ' days'}</span>
                </div>
                <div style={{height:'6px',background:'var(--border)',borderRadius:'3px',overflow:'hidden'}}>
                  <div style={{height:'100%',width: pct + '%',
                    background:'linear-gradient(90deg, var(--accent), var(--gold))',borderRadius:'3px',
                    transition:'width 0.5s ease'}} />
                </div>
              </div>;
            })() : null}

            {/* Studied today confirmation */}
            {dailyStreak.studiedToday ? <div style={{
              fontSize:'12px',color:'var(--sage)',fontWeight:600,marginTop:'8px'
            }}>{'\u2705 ' + todayLearnCount + ' batch' + (todayLearnCount > 1 ? 'es' : '') + ' learned today!'}</div> : null}
          </div>

          {/* Next batch to learn (always shown if available) */}
          {hasNextBatch ? <div className="card card-accent">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div className="review-type-label"
                  style={{color:'var(--success)'}}>
                  {todayLearnCount === 0 ? '\uD83C\uDF31 New Words' : '\uD83C\uDF31 Learn More'}
                </div>
                <strong>{batchLabel(nextBatch)}</strong>
                <span style={{fontSize:'12px',color:'var(--text-muted)',marginLeft:'8px'}}>
                  {batches[nextBatch-1].length + ' words'}
                </span>
              </div>
              <button
                className="btn btn-success btn-sm"
                style={{width:'auto'}}
                onClick={function() { startSession("learn", nextBatch); }}
              >{todayLearnCount === 0 ? 'Start Learning' : 'Learn Next Batch'}</button>
            </div>
            <div className="word-list" style={{maxHeight:'100px',marginTop:'8px'}}>
              {batches[nextBatch-1].map(function(wi, i) {
                var wd = getWord(wi);
                return <div className="word-row" key={i}>
                  <span className={'tag ' + wd.typeClass}>{wd.type}</span>
                  <strong>{wd.german}</strong>
                  <span>{wd.english}</span>
                </div>;
              })}
            </div>
          </div> :

          <div className="card" style={{background:'var(--warning-bg)'}}>
            <span style={{color:'var(--warning-text)',fontWeight:600}}>
              {'\uD83C\uDFC6 All ' + totalW + ' words introduced! Focus on reviews.'}
            </span>
          </div>}

          {/* Reviews section — per-word based */}
          {reviewsDue.length > 0 ? <div>
            <h2 style={{marginTop:'16px'}}>
              {'\uD83D\uDD04 Words Due for Review (' + reviewsDue.length + ')'}
            </h2>
            <div className="card" style={{padding:'14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:'14px',fontWeight:600,color:'var(--text)',marginBottom:'4px'}}>
                    {reviewsDue.length + ' word' + (reviewsDue.length !== 1 ? 's' : '') + ' need review'}
                  </div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {/* Group by stage */}
                    {[1,2,3,4,5].map(function(stage) {
                      var count = reviewsDue.filter(function(w) { return w.stage === stage; }).length;
                      if (count === 0) return null;
                      var stageInfo = MEMORY_STAGES[stage - 1];
                      return <span key={stage} style={{
                        fontSize:'11px',padding:'2px 8px',borderRadius:'10px',
                        background: stageInfo.bg, color: stageInfo.color, fontWeight:600
                      }}>{count + ' ' + stageInfo.name}</span>;
                    })}
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{width:'auto'}}
                  onClick={function() { startSession("review", null, null); }}
                >Review</button>
              </div>
            </div>
          </div> : <div
            className="card" style={{background:'var(--success-bg)',marginTop:'12px',textAlign:'center'}}>
            <span style={{color:'var(--success)'}}>
              {'\u2705 All reviews completed for today!'}
            </span>
          </div>}

          {/* Exercise section */}
          {totalLearned >= 5 ? <div className="card card-accent" style={{marginTop:'12px',
            borderColor:'var(--brand)',background:'#324A8408'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div className="review-type-label" style={{color:'var(--brand)'}}>
                  {'\uD83C\uDFAF Practice Mode'}
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'4px'}}>
                  {exerciseStats.weak.length > 0 ? <span
                    style={{fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'#E74C3C18',color:'var(--danger)',fontWeight:600}}
                  >{exerciseStats.weak.length + ' weak'}</span> : null}
                  {exerciseStats.due.length > 0 ? <span
                    style={{fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'#D6763518',color:'var(--accent)',fontWeight:600}}
                  >{exerciseStats.due.length + ' due'}</span> : null}
                  {exerciseStats.neverPracticed.length > 0 ? <span
                    style={{fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'#324A8418',color:'var(--brand)',fontWeight:600}}
                  >{exerciseStats.neverPracticed.length + ' new'}</span> : null}
                  {exerciseStats.weak.length === 0 && exerciseStats.due.length === 0 && exerciseStats.neverPracticed.length === 0 ?
                    <span
                      style={{fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'var(--sage-tint)',color:'var(--sage)',fontWeight:600}}
                    >{'\u2705 All caught up!'}</span> : null}
                </div>
              </div>
              <button
                className="btn btn-sm"
                disabled={exerciseLoading}
                style={{width:'auto',background:'var(--brand)',color:'var(--on-tint)',border:'none'}}
                onClick={startExercise}
              >{exerciseLoading ? '\u2728 Generating...' : 'Exercise'}</button>
            </div>
          </div> : null}

          {/* Behind schedule tip */}
          {scheduleGap < -2 ? <div className="tip-box"
            style={{background:'var(--danger-bg)',borderColor:'var(--danger-border)'}}>
            <strong>{'\u26A0\uFE0F'} Catching up: </strong>
            {"You're " + Math.abs(scheduleGap) + ' batch' + (Math.abs(scheduleGap) > 1 ? 'es' : '') + ' behind. Try learning 2-3 batches today to catch up! No pressure though \u2014 go at your own pace.'}
          </div> :

          /* Science tip — random on each page load */
          <div className="tip-box" style={{marginTop:'16px'}}>
            <strong>{'\uD83D\uDCA1'} </strong>
            {SCIENCE_TIPS[tipIdx]}
          </div>}
        </>}
      </div>
    </div>
  );
})
