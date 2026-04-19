import React from 'react';
export default React.memo(function CompleteView({ sessionWords, sessionType, progress, setView, emojis }) {
  var batchWords = sessionWords;
  var keyOf = function(w) { return String(w.german).toLowerCase().trim(); };
  var avgConf = batchWords.reduce(function(s, w) {
    return s + (progress[keyOf(w)]?.confidence || 0);
  }, 0) / batchWords.length;

  return (
    <div className="app">
      <div className="content" style={{textAlign:'center',paddingTop:'max(40px, env(safe-area-inset-top, 40px))'}}>
        <div style={{fontSize:'64px',marginBottom:'12px'}}>{'\uD83C\uDF89'}</div>
        <h1>Session Complete!</h1>
        <p style={{color:'#718096',margin:'8px 0 20px'}}>
          {sessionType.type === "learn"
            ? 'Batch ' + sessionType.batchIdx + ' learned!'
            : 'Review completed!'}
        </p>
        <div className="stat-grid">
          <div className="stat">
            <div className="num">{batchWords.length}</div>
            <div className="label">Words practiced</div>
          </div>
          <div className="stat">
            <div className="num">{avgConf.toFixed(1)}</div>
            <div className="label">Avg confidence</div>
          </div>
        </div>

        <div className="card" style={{textAlign:'left'}}>
          <h2>Words in this session:</h2>
          <div className="word-list">
            {batchWords.map(function(w, i) {
              var conf = progress[keyOf(w)]?.confidence || 0;
              var icons = ['','\u274C','\uD83E\uDD14','\uD83D\uDE10','\u2705'];
              return <div className="word-row" key={i}>
                <span>
                  {emojis ? emojis[w.idx] + ' ' : ''}
                  <strong>{w.german}</strong>
                </span>
                <span>{w.english}</span>
                <span>{icons[conf]}</span>
              </div>;
            })}
          </div>
        </div>

        {sessionType.type === "learn" ? <div className="tip-box">
          <strong>{'\uD83E\uDDE0'} Thinking Pause: </strong>
          Take a 5-10 minute break now. Walk, stretch, or close your eyes and mentally replay these words. This rest helps your brain consolidate!
        </div> : null}

        <button
          className="btn btn-primary"
          style={{marginTop:'12px'}}
          onClick={function() { setView(sessionType && sessionType.type === 'browse' ? 'browse' : 'dashboard'); }}
        >{sessionType && sessionType.type === 'browse' ? 'Back to Browse' : 'Back to Dashboard'}</button>
      </div>
    </div>
  );
})
