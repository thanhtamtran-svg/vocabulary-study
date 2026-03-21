import React from 'react';
import Nav from '../components/Nav';
import { REVIEW_LABELS, SCIENCE_TIPS } from '../lib/constants';
import { formatDate } from '../lib/dates';

export default function Dashboard({
  onNavigate, onHome, syncEmail, syncStatus, syncMsg,
  today, studyDay, weekNum, phase, phaseNames, phaseColors,
  totalLearned, batchesCompleted, batches, scheduleGap,
  todayCompleted, nextBatch, reviewsDue, startSession, getWord,
  dailyStreak, weekDays, exerciseStats, exerciseLoading, startExercise,
  startDate, isSunday, formatDateFn
}) {
  var pendingReviews = reviewsDue.length;
  var hasNextBatch = nextBatch !== null;
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
    <div className="app">
      <Nav active="dashboard" onNavigate={onNavigate} onHome={onHome}
        syncEmail={syncEmail} syncStatus={syncStatus} syncMsg={syncMsg} />
      <div className="content">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
          <div>
            <h1 style={{marginBottom:'2px'}}>Today's Plan</h1>
            <p style={{fontSize:'12px',color:'#718096'}}>
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
          <span style={{fontSize:'11px',color:'#718096',marginLeft:'auto'}}>
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
            <div className="num">{Math.round(totalLearned/1500*100) + '%'}</div>
            <div className="label">Overall progress</div>
          </div>
        </div>

        <div className="progress-bar" style={{height:'10px',marginBottom:'16px'}}>
          <div className="progress-fill"
            style={{width: (totalLearned/1500*100) + '%',
              background:'linear-gradient(90deg,#27AE60,#2ECC71)'}} />
        </div>

        {/* Sunday rest suggestion (but still allow learning) */}
        {isSunday ? <div className="sunday-banner">
          <div className="icon">{'\uD83D\uDCA4'}</div>
          <h2 style={{color:'#1B4F72',marginBottom:'8px'}}>Rest Day</h2>
          <p style={{fontSize:'13px',color:'#718096'}}>
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
            background: dailyStreak.status === 'danger' ? '#FFF5F5' :
              dailyStreak.status === 'warning' ? '#FFFBEB' :
              dailyStreak.studiedToday ? '#F0FFF4' : '#FFFFFF',
            borderColor: dailyStreak.status === 'danger' ? '#E74C3C' :
              dailyStreak.status === 'warning' ? '#E9B746' :
              dailyStreak.studiedToday ? '#7E9470' : '#e2e8f0',
            padding: '16px', textAlign: 'center'
          }}>
            {/* Flame + streak count */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'12px'}}>
              <span style={{fontSize:'32px'}}>
                {dailyStreak.count > 0 ? '\uD83D\uDD25' : '\u2744\uFE0F'}
              </span>
              <span style={{fontSize:'28px',fontWeight:800,fontFamily:'Montserrat,sans-serif',
                color: dailyStreak.count > 0 ? '#D67635' : '#94a3b8'}}>
                {dailyStreak.count}
              </span>
              <span style={{fontSize:'14px',fontWeight:600,color:'#718096'}}>
                {dailyStreak.count === 1 ? 'day streak' : 'day streak'}
              </span>
            </div>

            {/* Warning/danger messages */}
            {dailyStreak.status === 'warning' && !dailyStreak.studiedToday ? <div style={{
              fontSize:'13px',color:'#D67635',fontWeight:600,marginBottom:'10px',
              padding:'6px 12px',background:'#FFF8F0',borderRadius:'8px',border:'1px solid #F5EBDC'
            }}>{'\u26A0\uFE0F Your streak is at risk! Study today to keep it going!'}</div> : null}

            {dailyStreak.status === 'danger' ? <div style={{
              fontSize:'13px',color:'#E74C3C',fontWeight:600,marginBottom:'10px',
              padding:'6px 12px',background:'#FEF2F2',borderRadius:'8px',border:'1px solid #FECACA'
            }}>{'\uD83D\uDEA8 Last chance! Study today or lose your ' + dailyStreak.count + '-day streak!'}</div> : null}

            {dailyStreak.status === 'lost' ? <div style={{
              fontSize:'13px',color:'#718096',marginBottom:'10px'
            }}>Start a new streak today! Every journey begins with one step.</div> : null}

            {/* Weekly calendar */}
            <div style={{display:'flex',justifyContent:'center',gap:'6px',marginBottom:'12px'}}>
              {weekDays.map(function(wd, i) {
                return <div key={i} style={{textAlign:'center',width:'32px'}}>
                  <div style={{fontSize:'10px',color:'#94a3b8',marginBottom:'4px',fontWeight:600}}>{wd.label}</div>
                  <div style={{
                    width:'28px',height:'28px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'14px',margin:'0 auto',
                    background: wd.studied ? '#7E9470' : wd.isToday ? '#FFF8F0' : 'transparent',
                    color: wd.studied ? '#fff' : '#94a3b8',
                    border: wd.isToday && !wd.studied ? '2px dashed #D67635' :
                      wd.isPast && !wd.studied ? '1px solid #E74C3C33' : '1px solid transparent',
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
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#94a3b8',marginBottom:'4px'}}>
                  <span>{dailyStreak.count + ' days'}</span>
                  <span>{'\uD83C\uDFC6 ' + next + ' days'}</span>
                </div>
                <div style={{height:'6px',background:'#e2e8f0',borderRadius:'3px',overflow:'hidden'}}>
                  <div style={{height:'100%',width: pct + '%',
                    background:'linear-gradient(90deg, #D67635, #E9B746)',borderRadius:'3px',
                    transition:'width 0.5s ease'}} />
                </div>
              </div>;
            })() : null}

            {/* Studied today confirmation */}
            {dailyStreak.studiedToday ? <div style={{
              fontSize:'12px',color:'#7E9470',fontWeight:600,marginTop:'8px'
            }}>{'\u2705 ' + todayLearnCount + ' batch' + (todayLearnCount > 1 ? 'es' : '') + ' learned today!'}</div> : null}
          </div>

          {/* Next batch to learn (always shown if available) */}
          {hasNextBatch ? <div className="card card-accent">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div className="review-type-label"
                  style={{color:'#27AE60'}}>
                  {todayLearnCount === 0 ? '\uD83C\uDF31 New Words' : '\uD83C\uDF31 Learn More'}
                </div>
                <strong>{'Batch ' + nextBatch}</strong>
                <span style={{fontSize:'12px',color:'#718096',marginLeft:'8px'}}>
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

          <div className="card" style={{background:'#FEF9E7'}}>
            <span style={{color:'#B7950B',fontWeight:600}}>
              {'\uD83C\uDFC6 All 1500 words introduced! Focus on reviews.'}
            </span>
          </div>}

          {/* Reviews section */}
          {reviewsDue.length > 0 ? <div>
            <h2 style={{marginTop:'16px'}}>
              {'\uD83D\uDD04 Reviews Due (' + reviewsDue.length + ')'}
            </h2>
            {reviewsDue.map(function(r, i) {
              var badgeColors = {2:'#F39C12',3:'#E74C3C',5:'#8E44AD',7:'#1B4F72'};
              return <div className="card" key={i} style={{padding:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div className="task-badge"
                      style={{background: badgeColors[r.interval]}}>{'+' + r.interval}</div>
                    <div>
                      <div className="review-type-label"
                        style={{color: badgeColors[r.interval]}}>
                        {REVIEW_LABELS[r.interval]}
                      </div>
                      <span style={{fontSize:'12px',color:'#718096'}}>
                        {'Batch ' + r.batch + ' \u2022 ' + batches[r.batch-1].length + ' words'}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{width:'auto'}}
                    onClick={function() { startSession("review", r.batch, r.interval); }}
                  >Review</button>
                </div>
              </div>;
            })}
          </div> : <div
            className="card" style={{background:'#EAFAF1',marginTop:'12px',textAlign:'center'}}>
            <span style={{color:'#27AE60'}}>
              {'\u2705 All reviews completed for today!'}
            </span>
          </div>}

          {/* Exercise section */}
          {totalLearned >= 5 ? <div className="card card-accent" style={{marginTop:'12px',
            borderColor:'#324A84',background:'#324A8408'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div className="review-type-label" style={{color:'#324A84'}}>
                  {'\uD83C\uDFAF Practice Mode'}
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'4px'}}>
                  {exerciseStats.weak.length > 0 ? <span
                    style={{fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'#E74C3C18',color:'#E74C3C',fontWeight:600}}
                  >{exerciseStats.weak.length + ' weak'}</span> : null}
                  {exerciseStats.due.length > 0 ? <span
                    style={{fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'#D6763518',color:'#D67635',fontWeight:600}}
                  >{exerciseStats.due.length + ' due'}</span> : null}
                  {exerciseStats.neverPracticed.length > 0 ? <span
                    style={{fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'#324A8418',color:'#324A84',fontWeight:600}}
                  >{exerciseStats.neverPracticed.length + ' new'}</span> : null}
                  {exerciseStats.weak.length === 0 && exerciseStats.due.length === 0 && exerciseStats.neverPracticed.length === 0 ?
                    <span
                      style={{fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'#7E947018',color:'#7E9470',fontWeight:600}}
                    >{'\u2705 All caught up!'}</span> : null}
                </div>
              </div>
              <button
                className="btn btn-sm"
                disabled={exerciseLoading}
                style={{width:'auto',background:'#324A84',color:'#fff',border:'none'}}
                onClick={startExercise}
              >{exerciseLoading ? '\u2728 Generating...' : 'Exercise'}</button>
            </div>
          </div> : null}

          {/* Behind schedule tip */}
          {scheduleGap < -2 ? <div className="tip-box"
            style={{background:'#FDEDEC',borderColor:'#F5B7B1'}}>
            <strong>{'\u26A0\uFE0F'} Catching up: </strong>
            {"You're " + Math.abs(scheduleGap) + ' batch' + (Math.abs(scheduleGap) > 1 ? 'es' : '') + ' behind. Try learning 2-3 batches today to catch up! No pressure though \u2014 go at your own pace.'}
          </div> :

          /* Science tip */
          <div className="tip-box" style={{marginTop:'16px'}}>
            <strong>{'\uD83D\uDCA1'} Science Tip: </strong>
            {SCIENCE_TIPS[studyDay % SCIENCE_TIPS.length]}
          </div>}
        </>}
      </div>
    </div>
  );
}
