import React from 'react';

export default React.memo(function ExerciseComplete({
  exerciseSession, exerciseResults, getWord, totalLearned,
  startExercise, setView
}) {
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
    <div className="app">
      <div className="content" style={{paddingTop:'max(32px, env(safe-area-inset-top, 32px))'}}>
        <div style={{textAlign:'center',marginBottom:'24px'}}>
          <div style={{fontSize:'56px',marginBottom:'8px'}}>{exEmoji}</div>
          <h1 style={{marginBottom:'4px'}}>{exMessage}</h1>
          <p style={{color:'#718096',fontSize:'13px'}}>
            {'Exercise session complete' + (exDuration > 0 ? ' \u2022 ' + exDuration + ' min' : '')}
          </p>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat">
            <div className="num" style={{color: exPct >= 70 ? '#7E9470' : '#D67635'}}>{exPct + '%'}</div>
            <div className="label">Accuracy</div>
          </div>
          <div className="stat">
            <div className="num">{exCorrect + '/' + exTotalQ}</div>
            <div className="label">Correct</div>
          </div>
        </div>

        {/* Results by level */}
        <div className="card" style={{marginTop:'16px'}}>
          <h2 style={{marginBottom:'12px'}}>Performance by Stage</h2>
          {['Remember', 'Understand', 'Apply', 'Analyze'].map(function(level) {
            var levelResults = exResults.filter(function(r) { return r.level === level; });
            var levelCorrect = levelResults.filter(function(r) { return r.correct; }).length;
            var levelTotal = levelResults.length;
            if (levelTotal === 0) return null;
            var pct = Math.round(levelCorrect / levelTotal * 100);
            var levelColor = {Remember: '#324A84', Understand: '#D67635', Apply: '#7E9470', Analyze: '#8E44AD'}[level];
            return <div key={level} style={{marginBottom:'10px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                <span style={{fontSize:'13px',fontWeight:600,color: levelColor}}>{level}</span>
                <span style={{fontSize:'12px',color:'#718096'}}>{levelCorrect + '/' + levelTotal}</span>
              </div>
              <div className="progress-bar" style={{height:'6px'}}>
                <div className="progress-fill"
                  style={{width: pct + '%', background: levelColor}} />
              </div>
            </div>;
          })}
        </div>

        {/* Word breakdown */}
        <div className="card" style={{marginTop:'12px'}}>
          <h2 style={{marginBottom:'12px'}}>Words Practiced</h2>
          <div className="word-list">
            {Object.keys(wordResults).map(function(wi) {
              var wr = wordResults[wi];
              var w = getWord(parseInt(wi));
              var allCorrect = wr.correct === wr.total;
              return <div className="word-row" key={wi}>
                <span>
                  <strong>{w.german}</strong>
                </span>
                <span style={{color:'#718096'}}>{w.english}</span>
                <span style={{color: allCorrect ? '#7E9470' : '#D67635', fontWeight:600}}>
                  {wr.correct + '/' + wr.total + (allCorrect ? ' \u2705' : ' \u26A0\uFE0F')}
                </span>
              </div>;
            })}
          </div>
        </div>

        {/* Weak words encouragement */}
        {weakWords.length > 0 ? <div className="tip-box"
          style={{marginTop:'12px',background:'#FFF8E1',borderColor:'#E9B746'}}>
          <strong>{'\uD83D\uDCA1'} Focus words: </strong>
          {weakWords.map(function(wi) { return getWord(wi).german; }).join(', ')}
          {' \u2014 these will appear more often in future exercises.'}
        </div> : <div className="tip-box"
          style={{marginTop:'12px',background:'#f0fdf4',borderColor:'#7E9470'}}>
          <strong>{'\uD83C\uDF1F'} Perfect session! </strong>
          {"All words answered correctly. They'll be reviewed at longer intervals now."}
        </div>}

        {/* Buttons */}
        <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
          <button
            className="btn btn-primary"
            style={{flex:1}}
            onClick={function() { setView('dashboard'); }}
          >Back to Dashboard</button>
          {totalLearned >= 5 ? <button
            className="btn btn-secondary"
            style={{flex:1}}
            onClick={startExercise}
          >Practice Again</button> : null}
        </div>
      </div>
    </div>
  );
})
