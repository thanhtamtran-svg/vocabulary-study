import React, { useEffect, useRef } from 'react';
import { speakPattern } from '../lib/speech';

// Flashcard for the Hören & Sprechen A1 sentence-pattern course.
//
// en-de (default, production practice — Pimsleur "anticipation"):
//   front = English situation cue + "check by ear" buttons that play the
//   German WITHOUT flipping, so the learner says it aloud, compares by ear,
//   and only then flips for the text. No autoplay on the front.
// de-en (recognition / listening day): front = German (autoplays in App),
//   back = meaning.
// Listen-only announcements are always de-en.
//
// Notes (grammar trap, swap-ins, everyday wording, tracks) live under the
// card in PatternNotes so the fixed-height card never overflows.

var FORMAL_LABEL = { du: 'to a friend · du', Sie: 'formal · Sie', ihr: 'to a group · ihr' };

// "[slot]" -> highlighted span; everything else plain text.
export function renderSlots(text, keyPrefix) {
  var out = [];
  var re = /\[([^\]]*)\]/g, last = 0, m, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    var shown = m[1].split(' / ')[0];
    out.push(<span key={keyPrefix + i++} className="pattern-slot">{shown || '…'}</span>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// One dialogue turn per line; single sentences stay one line.
function Lines({ text, keyPrefix }) {
  var turns = String(text).split(/\s+—\s+/);
  return <>{turns.map(function(t, i) {
    return <div key={keyPrefix + i} className={turns.length > 1 ? 'pattern-turn' : undefined}>
      {turns.length > 1 ? <span className="pattern-turn-mark">{i % 2 === 0 ? 'A' : 'B'}</span> : null}
      <span>{renderSlots(t, keyPrefix + i + '_')}</span>
    </div>;
  })}</>;
}

function AudioButtons({ text, onFront }) {
  var cancelRef = useRef(null);
  useEffect(function() { return function() { if (cancelRef.current) cancelRef.current(); }; }, [text]);
  function play(e, opts) {
    e.stopPropagation();
    if (cancelRef.current) cancelRef.current();
    cancelRef.current = speakPattern(text, opts);
  }
  return <div className="pattern-audio" onClick={function(e) { e.stopPropagation(); }}>
    <button type="button" className="pattern-audio-btn" aria-label="Play the German sentence"
      onClick={function(e) { play(e, {}); }}>{'🔊'}{onFront ? ' Check by ear' : ' Play'}</button>
    <button type="button" className="pattern-audio-btn" aria-label="Play slowly"
      onClick={function(e) { play(e, { slow: true }); }}>{'🐢 Slow'}</button>
    {!onFront ? <button type="button" className="pattern-audio-btn" aria-label="Play three times with pauses, to shadow along"
      onClick={function(e) { play(e, { times: 3 }); }}>{'🔁 ×3'}</button> : null}
  </div>;
}

export default React.memo(function PatternCard({ word, flipped, onFlip, direction }) {
  var meta = word.meta || {};
  var enFirst = direction !== 'de-en' && !meta.listenOnly;
  var pattern = meta.pattern || word.german;
  var formal = meta.formal ? FORMAL_LABEL[meta.formal] : null;

  function flip() {
    // Revealing the German side in production mode: play it once.
    if (enFirst && !flipped) speakPattern(pattern);
    onFlip();
  }
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
  }

  var chips = <div className="pattern-chips">
    <span className={'tag ' + word.typeClass}>{word.type}</span>
    {formal ? <span className="pattern-chip">{formal}</span> : null}
  </div>;

  // Answer side: sentence, its meaning right under it, then the audio row —
  // the buttons must not split the German from what it means.
  var germanFace = <>
    {chips}
    <div className="pattern-german"><Lines text={pattern} keyPrefix="g" /></div>
    <div className="pattern-meaning">{String(meta.cue || word.english).replace(/[[\]]/g, '')}</div>
    <AudioButtons text={pattern} onFront={false} />
  </>;

  return (
    <div className="flashcard-container"
      tabIndex={0}
      role="button"
      aria-label={(enFirst ? 'Say in German: ' + word.english : 'Pattern: ' + word.german) +
        '. ' + (flipped ? 'Showing answer.' : 'Press Enter or Space to flip.')}
      onClick={flip}
      onKeyDown={handleKeyDown}>
      <div className={'flashcard pattern-card' + (flipped ? ' flipped' : '')}>
        <div className="flashcard-face flashcard-front">
          {enFirst ? <>
            <div className="pattern-prompt">Say it in German, then check</div>
            <div className="pattern-chips">
              {formal ? <span className="pattern-chip on-brand">{formal}</span> : null}
            </div>
            <div className="pattern-cue"><Lines text={meta.cue || word.english} keyPrefix="c" /></div>
            <AudioButtons text={pattern} onFront={true} />
            <div className="flashcard-meta">{word.cat}</div>
            <div style={{marginTop:'6px',fontSize:'11px',opacity:0.6}}>Say it out loud · tap to see it</div>
          </> : <>
            <div className="pattern-german on-brand"><Lines text={pattern} keyPrefix="f" /></div>
            <AudioButtons text={pattern} onFront={false} />
            {formal ? <span className="pattern-chip on-brand">{formal}</span> : null}
            <div className="flashcard-meta">{word.cat}</div>
            <div style={{marginTop:'6px',fontSize:'11px',opacity:0.6}}>Tap to see the meaning</div>
          </>}
        </div>
        <div className="flashcard-face flashcard-back pattern-back">
          {enFirst ? germanFace : <>
            {chips}
            <div className="pattern-meaning big">{word.english}</div>
            <div className="pattern-german small"><Lines text={pattern} keyPrefix="b" /></div>
            <AudioButtons text={pattern} onFront={false} />
          </>}
        </div>
      </div>
    </div>
  );
});

// Under-card notes, shown once the card is flipped.
export function PatternNotes({ word }) {
  var meta = word.meta || {};
  var swaps = (meta.slots || []).filter(function(s) { return s.alts && s.alts.length; }).slice(0, 2);
  var emptySlot = (meta.slots || []).some(function(s) { return !s.value; });
  var src = [];
  if (meta.tracks && meta.tracks.length) src.push('Track ' + meta.tracks.join(', '));
  if (meta.lektion && meta.lektion.length) src.push('Schritte L' + meta.lektion.join(', L'));
  if (meta.source === 'extra') src.push('not in the audio');
  return <div className="pattern-notes">
    {swaps.length ? <div className="pattern-note">
      <strong>{'🔄 Swap in your own words: '}</strong>
      {swaps.map(function(s, i) {
        return <span key={i}>{i > 0 ? ' · ' : ''}<span className="pattern-slot">{s.value}</span>
          {' → ' + s.alts.slice(0, 3).join(', ')}</span>;
      })}
    </div> : emptySlot ? <div className="pattern-note">
      <strong>{'🔄 Swap in your own words: '}</strong>{'fill the … with something true for you, and say it aloud.'}
    </div> : null}
    {meta.alts && meta.alts.length ? <div className="pattern-note">
      <strong>{'Also: '}</strong>{meta.alts.join(' / ')}
    </div> : null}
    {meta.also ? <div className="pattern-note">
      <strong>{'🗣️ In daily life: '}</strong>{meta.also.text}
      {meta.also.note ? <span className="pattern-note-faint">{' — ' + meta.also.note}</span> : null}
    </div> : null}
    {meta.note ? <div className="pattern-note">
      <strong>{'📐 Grammar: '}</strong>{meta.note.rule}
      {meta.note.example ? <span className="pattern-note-faint">{' — e.g. ' + meta.note.example}</span> : null}
    </div> : null}
    {src.length ? <div className="pattern-source">{src.join(' · ')}</div> : null}
  </div>;
}
