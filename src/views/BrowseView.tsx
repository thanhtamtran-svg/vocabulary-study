import React from 'react';
import Nav from '../components/Nav';
import { TYPE_TAGS, TYPE_NAMES } from '../lib/constants';

export default React.memo(function BrowseView({
  onNavigate, onHome, syncEmail, syncStatus, syncMsg, langFlag,
  words, progress, searchTerm, setSearchTerm, filterType, setFilterType,
  getWord, setSessionWords, setSessionType, setCurrentIdx, setFlipped, setStreak, setView,
  emojis
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
        syncEmail={syncEmail} syncStatus={syncStatus} syncMsg={syncMsg} langFlag={langFlag} />
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

        <p style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'6px'}}>
          {'Showing ' + filtered.length + ' of ' + words.length + ' words'}
        </p>

        <div style={{maxHeight:'500px',overflowY:'auto'}}>
          {filtered.map(function(w, i) {
            var key = String(words[w.idx][0]).toLowerCase().trim();
            var conf = progress[key]?.confidence || 0;
            var isLearned = progress[key]?.learned;
            var icons = ['','\u274C','\uD83E\uDD14','\uD83D\uDE10','\u2705'];
            // 4 even columns (PM request 2026-07-20): word | type | meaning | status.
            // Grid (not flex) so every row's columns line up down the page;
            // .browse-row is Browse-only \u2014 .word-row stays for the other views.
            return <div className="browse-row" key={i}
              onClick={function() {
                var wordData = {idx: w.idx, ...getWord(w.idx)};
                setSessionWords([wordData]);
                setSessionType({type: 'browse', batchIdx: 0, interval: 0});
                setCurrentIdx(0);
                setFlipped(false);
                setStreak(0);
                setView('session');
              }}>
              <strong className="browse-word">
                {emojis ? <span style={{marginRight:'4px'}}>{emojis[w.idx]}</span> : null}
                {w.german}
              </strong>
              <span className={'tag ' + TYPE_TAGS[w.typeIdx]}>{TYPE_NAMES[w.typeIdx]}</span>
              <span className="browse-meaning">{w.english}</span>
              <span className="browse-status">
                {isLearned ? icons[conf] : '\u2B24'}
              </span>
            </div>;
          })}
        </div>
      </div>
    </div>
  );
})
