import React, { useState } from 'react';
import { dateKey } from '../lib/dates';

export default React.memo(function SetupScreen({ startDate, setStartDate, setStarted, importProgress, connectSync, syncStatus, syncMsg }) {
  var [emailInput, setEmailInput] = useState('');
  return (
    <div className="app">
      <div style={{padding:'24px',textAlign:'center'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>{'\uD83C\uDDE9\uD83C\uDDEA'}</div>
        <h1 style={{fontSize:'22px',marginBottom:'4px'}}>German 1500</h1>
        <p style={{color:'#718096',fontSize:'13px',marginBottom:'24px'}}>
          Master 1500 words with science-based spaced repetition
        </p>

        <div className="card" style={{
          background:'#F0F7FF',borderColor:'#BEE3F8',marginBottom:'16px',
          textAlign:'center'
        }}>
          <h2 style={{fontSize:'15px',marginBottom:'4px'}}>
            {'\u2601\uFE0F'} Already studying on another device?
          </h2>
          <p style={{fontSize:'12px',color:'#718096',margin:'0 0 12px'}}>
            Enter your email to sync your progress
          </p>
          <div style={{display:'flex',gap:'8px',maxWidth:'360px',margin:'0 auto'}}>
            <input
              type="email"
              placeholder="your@email.com"
              value={emailInput}
              onChange={function(e) { setEmailInput(e.target.value); }}
              onKeyDown={function(e) {
                if (e.key === 'Enter' && emailInput.trim()) connectSync(emailInput.trim());
              }}
              style={{
                flex:1,padding:'10px 12px',borderRadius:'8px',
                border:'1px solid #cbd5e1',fontSize:'14px',fontFamily:'inherit'
              }}
            />
            <button
              className="btn btn-primary btn-sm"
              disabled={!emailInput.trim() || syncStatus === 'syncing'}
              onClick={function() { connectSync(emailInput.trim()); }}
              style={{whiteSpace:'nowrap'}}
            >{syncStatus === 'syncing' ? 'Syncing...' : 'Sync'}</button>
          </div>
          {syncMsg ? <p style={{
            fontSize:'12px',marginTop:'8px',fontWeight:600,
            color: syncStatus === 'error' ? '#E74C3C' : '#27AE60'
          }}>{syncMsg}</p> : null}
        </div>

        <div className="card card-accent">
          <h2>When do you want to start?</h2>
          <p style={{fontSize:'12px',color:'#718096',margin:'6px 0 12px'}}>
            Pick your first study day (ideally a Monday)
          </p>
          <input
            type="date"
            value={dateKey(startDate)}
            onChange={function(e) {
              const d = new Date(e.target.value + 'T00:00:00');
              if (!isNaN(d)) setStartDate(d);
            }}
          />
        </div>

        <div className="card" style={{textAlign:'left'}}>
          <h2>Your daily commitment</h2>
          <div className="task-item">
            <div className="task-badge badge-new">8</div>
            <div>
              <strong>New words</strong>
              <br />
              <span style={{fontSize:'11px',color:'#718096'}}>
                Interleaved mix of nouns, verbs, adjectives
              </span>
            </div>
          </div>
          <div className="task-item">
            <div className="task-badge badge-r2">+</div>
            <div>
              <strong>2357 Reviews</strong>
              <br />
              <span style={{fontSize:'11px',color:'#718096'}}>
                Previous batches on schedule: Day +2, +3, +5, +7
              </span>
            </div>
          </div>
          <div style={{textAlign:'center',margin:'8px 0'}}>
            <span className="phase-indicator" style={{background:'#EBF5FB',color:'#1B4F72'}}>
              ~45-60 min/day {'\u2022'} 28 weeks
            </span>
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{marginTop:'12px'}}
          onClick={function() { setStarted(true); }}
        >Start My Journey</button>

        <div style={{marginTop:'16px'}}>
          <label className="btn btn-secondary btn-sm" style={{cursor:'pointer',display:'inline-flex'}}>
            Load Saved Progress
            <input
              type="file"
              accept=".json"
              onChange={importProgress}
              style={{display:'none'}}
            />
          </label>
        </div>
      </div>
    </div>
  );
})
