import React from 'react';
import Nav from '../components/Nav.jsx';
import { WORD_EMOJIS } from '../emoji-data.js';
import { TYPE_TAGS, TYPE_NAMES } from '../lib/constants.js';

export default function BrowseView({
  onNavigate, onHome, syncEmail, syncStatus, syncMsg,
  words, progress, searchTerm, setSearchTerm, filterType, setFilterType,
  getWord, setSessionWords, setSessionType, setCurrentIdx, setFlipped, setStreak, setView
}) {
  var filtered = words.map(function(w, i) {
    return {idx: i, german: w[0], english: w[1], catIdx: w[2], typeIdx: w[3]};
  }).filter(function(w) {
    if (searchTerm && !w.german.toLowerCase().includes(searchTerm.toLowerCase())
        && !w.english.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType >= 0 && w.typeIdx !== filterType) return false;
    return true;
  }).slice(0, 100);

  return (
    <div className="app">
      <Nav active="browse" onNavigate={onNavigate} onHome={onHome}
        syncEmail={syncEmail} syncStatus={syncStatus} syncMsg={syncMsg} />
      <div className="content">
        <h1>Browse All Words</h1>
        <input
          type="text"
          placeholder="Search German or English..."
          value={searchTerm}
          onChange={function(e) { setSearchTerm(e.target.value); }}
          style={{marginBottom:'8px'}}
        />

        <div className="tabs">
          <button
            className={'tab' + (filterType === -1 ? ' active' : '')}
            onClick={function() { setFilterType(-1); }}
          >All types</button>
          {TYPE_NAMES.map(function(t, i) {
            return <button
              key={i}
              className={'tab' + (filterType === i ? ' active' : '')}
              onClick={function() { setFilterType(i); }}
            >{t}</button>;
          })}
        </div>

        <p style={{fontSize:'11px',color:'#718096',marginBottom:'6px'}}>
          {'Showing ' + filtered.length + ' of 1500 words'}
        </p>

        <div style={{maxHeight:'500px',overflowY:'auto'}}>
          {filtered.map(function(w, i) {
            var conf = progress[w.idx]?.confidence || 0;
            var isLearned = progress[w.idx]?.learned;
            var icons = ['','\u274C','\uD83E\uDD14','\uD83D\uDE10','\u2705'];
            return <div className="word-row" key={i}
              style={{cursor:'pointer'}}
              onClick={function() {
                var wordData = {idx: w.idx, ...getWord(w.idx)};
                setSessionWords([wordData]);
                setSessionType({type: 'browse', batchIdx: 0, interval: 0});
                setCurrentIdx(0);
                setFlipped(false);
                setStreak(0);
                setView('session');
              }}>
              <div style={{flex:1}}>
                {typeof WORD_EMOJIS !== 'undefined' ? <span style={{marginRight:'4px'}}>{WORD_EMOJIS[w.idx]}</span> : null}
                <strong>{w.german}</strong>
                <span className={'tag ' + TYPE_TAGS[w.typeIdx]}
                  style={{marginLeft:'6px'}}>{TYPE_NAMES[w.typeIdx]}</span>
              </div>
              <span style={{color:'#718096',flex:1}}>{w.english}</span>
              <span style={{fontSize:'11px'}}>
                {isLearned ? icons[conf] : '\u2B24'}
              </span>
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}
