import React from 'react';
import Nav from '../components/Nav';
import { MEMORY_STAGES } from '../lib/constants';
import { getMemoryStage } from '../lib/memory-stages';

export default React.memo(function ProgressView({
  onNavigate, onHome, syncEmail, syncStatus, syncMsg,
  progress, totalLearned, words, cats
}) {
  // Compute memory stages for all words
  var stageCounts = [0, 0, 0, 0, 0, 0]; // index 0 = not learned, 1-5 = stages
  Object.keys(progress).forEach(function(k) {
    var stage = getMemoryStage(progress[k]);
    stageCounts[stage]++;
  });
  var notLearned = 1500 - totalLearned;
  var maxStageCount = Math.max.apply(null, stageCounts.slice(1).concat([1])); // for bar scaling

  return (
    <div className="app">
      <Nav active="progress" onNavigate={onNavigate} onHome={onHome}
        syncEmail={syncEmail} syncStatus={syncStatus} syncMsg={syncMsg} />
      <div className="content">
        <h1>Your Progress</h1>

        <div className="stat-grid">
          <div className="stat">
            <div className="num">{totalLearned}</div>
            <div className="label">Learned</div>
          </div>
          <div className="stat">
            <div className="num">{stageCounts[5]}</div>
            <div className="label">Mastered</div>
          </div>
          <div className="stat">
            <div className="num">{notLearned}</div>
            <div className="label">Remaining</div>
          </div>
          <div className="stat">
            <div className="num">{Math.ceil(notLearned / 8)}</div>
            <div className="label">Batches left</div>
          </div>
        </div>

        {/* Memory Stages Bar Chart */}
        <h2>Memory Stages</h2>
        <div className="card memory-stages-card">
          <p style={{fontSize:'12px',color:'#94a3b8',marginBottom:'16px',lineHeight:'1.5'}}>
            Words move up through 5 memory stages as you review them. Higher stages need less frequent review.
          </p>

          {/* Bar chart */}
          <div className="stage-chart">
            {MEMORY_STAGES.map(function(stage, i) {
              var count = stageCounts[stage.level];
              var pct = totalLearned > 0 ? Math.round(count / totalLearned * 100) : 0;
              var barWidth = maxStageCount > 0 ? Math.max(count / maxStageCount * 100, count > 0 ? 4 : 0) : 0;

              return <div key={i} className="stage-row">
                {/* Stage label */}
                <div className="stage-label">
                  <span className="stage-dot" style={{background: stage.color}} />
                  <span className="stage-name">{stage.name}</span>
                </div>
                {/* Bar */}
                <div className="stage-bar-track">
                  <div className="stage-bar-fill"
                    style={{width: barWidth + '%', background: stage.color}}
                  />
                </div>
                {/* Count */}
                <div className="stage-count">
                  <span style={{fontWeight:600}}>{count}</span>
                  <span className="stage-pct">{pct > 0 ? ' (' + pct + '%)' : ''}</span>
                </div>
              </div>;
            })}
          </div>

          {/* Not learned row */}
          {totalLearned < 1500 ? <div className="stage-row" style={{marginTop:'12px',paddingTop:'12px',borderTop:'1px solid #F5EBDC'}}>
            <div className="stage-label">
              <span className="stage-dot" style={{background: '#CBD5E0'}} />
              <span className="stage-name" style={{color:'#94a3b8'}}>Not started</span>
            </div>
            <div className="stage-bar-track">
              <div className="stage-bar-fill"
                style={{width: (notLearned / 1500 * 100) + '%', background: '#CBD5E0'}}
              />
            </div>
            <div className="stage-count" style={{color:'#94a3b8'}}>
              <span style={{fontWeight:600}}>{notLearned}</span>
            </div>
          </div> : null}

          {/* Stage legend */}
          <div className="stage-legend">
            {MEMORY_STAGES.map(function(stage, i) {
              return <div key={i} className="stage-legend-item" style={{background: stage.bg, borderColor: stage.color}}>
                <div style={{fontWeight:600,fontSize:'12px',color: stage.color, fontFamily:'Montserrat,sans-serif'}}>
                  {'Lv.' + stage.level + ' ' + stage.name}
                </div>
                <div style={{fontSize:'11px',color:'#64748b',marginTop:'2px'}}>{stage.desc}</div>
              </div>;
            })}
          </div>
        </div>

        <h2>By Category</h2>
        <div className="card" style={{maxHeight:'300px',overflowY:'auto'}}>
          {cats.map(function(cat, ci) {
            var catWords = [];
            words.forEach(function(w, wi) { if (w[2] === ci) catWords.push(wi); });
            var learned = catWords.filter(function(wi) { return progress[wi]?.learned; }).length;
            return <div key={ci} style={{margin:'6px 0'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
                <span>{cat}</span>
                <span style={{fontWeight:500,color:'#64748b'}}>{learned + '/' + catWords.length}</span>
              </div>
              <div className="progress-bar" style={{height:'5px'}}>
                <div className="progress-fill"
                  style={{width: (catWords.length ? learned/catWords.length*100 : 0) + '%',
                    background:'#324A84'}} />
              </div>
            </div>;
          })}
        </div>
      </div>
    </div>
  );
})
