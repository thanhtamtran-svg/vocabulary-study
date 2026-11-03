import React from 'react';
import { fetchExplanation, fetchCachedExplanation, clearExplanation } from '../lib/api';
import { speakGerman, speakPattern } from '../lib/speech';
import { speakEnglish } from '../lib/english-speech';
import { findVerb } from '../lib/verb-link';
import { wordLinkHref } from '../lib/word-link';

// Bold German text with each known verb turned into a link to its word card
// (new tab; from the installed app it opens in the browser). Capitalised words
// only count at the start, so nouns like "Essen" mid-phrase stay plain.
function linkVerbs(text, key) {
  var parts = text.split(/([A-Za-zÄÖÜäöüß]+)/);
  var seenWord = false;
  return parts.map(function(part, pi) {
    if (!/^[A-Za-zÄÖÜäöüß]+$/.test(part)) return part;
    var first = !seenWord;
    seenWord = true;
    var verb = (first || part === part.toLowerCase()) ? findVerb(part) : null;
    if (!verb) return part;
    return <a key={key + '_v' + pi} className="ai-verb-link"
      href={wordLinkHref(verb.lang, verb.word)} target="_blank" rel="noopener noreferrer"
      title={'Open "' + verb.word + '" in a new tab'}
      onClick={function(e) { e.stopPropagation(); }}
    >{part}</a>;
  });
}

// Parse markdown inline: **bold** and *italic*
function renderInline(text, key, withVerbLinks?) {
  var parts = [];
  var re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  var last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={key + '_b' + m.index}>{withVerbLinks ? linkVerbs(m[1], key + '_' + m.index) : m[1]}</strong>);
    else if (m[2]) parts.push(<em key={key + '_i' + m.index}>{m[2]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

export default React.memo(function AiExplainBox({
  word, aiExplanation, aiLoading, aiError, aiSaveStatus,
  setAiExplanation, setAiLoading, setAiError, setAiSaveStatus, lang, explainOpts
}) {
  // explainOpts {kind:'pattern'}: sentence-pattern AI tutor ('pat:' cache rows);
  // {kind:'exam2'|'exam3'}: Goethe Sprechen card, more ways to ask/answer ('exam:').
  // Absent for word courses.
  var isPattern = !!explainOpts && !!explainOpts.kind;
  var isExam = isPattern && explainOpts.kind !== 'pattern';
  var speak = lang === 'en' ? speakEnglish : isPattern ? speakPattern : speakGerman;
  function handleExplain() {
    setAiLoading(true);
    setAiError('');
    setAiSaveStatus('');
    fetchExplanation(word.german, word.type, lang, explainOpts).then(function(text) {
      setAiExplanation(text);
      setAiLoading(false);
      setAiSaveStatus('saving');
      setTimeout(function() {
        fetchCachedExplanation(word.german, lang, explainOpts).then(function(cached) {
          setAiSaveStatus(cached ? 'saved' : '');
        });
      }, 2000);
    }).catch(function(err) {
      setAiError('Could not load explanation. Try again.');
      setAiLoading(false);
    });
  }

  function handleRetry() {
    setAiError('');
    handleExplain();
  }

  function handleClear() {
    setAiExplanation('');
    setAiSaveStatus('');
    // B-019: the old anon REST DELETE was silently blocked by RLS (204,
    // zero rows deleted). Server-side clearing now goes through the
    // explain-word function and needs the session token; without one
    // (public A1.1 visitor) only the local display is cleared.
    clearExplanation(word.german, lang, explainOpts);
  }

  // Current "## " heading while rendering; verbs are linked in the pattern breakdown only.
  var section = '';
  // Exam tutor: "### " opens one mini dialogue; its "A:"/"B:" turns render
  // together in one box (question + answer + follow-up), not as loose bullets.
  var exchange = null;

  return <>
    {/* AI Explain button */}
    {!aiExplanation && !aiLoading && !aiError ? <button
      className="btn btn-secondary"
      style={{marginTop:'10px',fontSize:'13px',gap:'6px'}}
      onClick={handleExplain}
    >{'\uD83E\uDD16'} {isExam ? 'AI tutor: more ways to ask and answer' : isPattern ? 'AI tutor: explain this pattern' : 'Explain this word'}</button> : null}

    {/* Loading state */}
    {aiLoading ? <div className="ai-explain-box">
      <div style={{textAlign:'center',color:'var(--text-muted)',padding:'16px'}}>
        {'\u23F3'} Asking AI teacher...
      </div>
    </div> : null}

    {/* Error state */}
    {aiError ? <div className="ai-explain-box"
      style={{borderColor:'var(--danger)',background:'var(--danger-bg)'}}>
      <p style={{color:'var(--danger)',fontSize:'12px',margin:0}}>{aiError}</p>
      <button className="btn btn-sm btn-secondary"
        style={{marginTop:'8px'}}
        onClick={handleRetry}
      >Retry</button>
    </div> : null}

    {/* Explanation result */}
    {aiExplanation ? <div className="ai-explain-box">
      <div className="ai-explain-header">
        <span style={{display:'flex',alignItems:'center',gap:'6px'}}>
          {'\uD83E\uDD16'} {isPattern ? 'AI Tutor' : 'AI Teacher'}
          {aiSaveStatus === 'saving' ? <span style={{fontSize:'10px',color:'var(--warning)',background:'var(--warning-bg)',padding:'2px 6px',borderRadius:'4px',fontWeight:600}}>
            {'\u23F3'} Saving...
          </span> : aiExplanation && !aiLoading ? <span style={{fontSize:'10px',color:'var(--success)',background:'var(--success-bg)',padding:'2px 6px',borderRadius:'4px',fontWeight:600}}>
            {'\u2705'} Saved
          </span> : null}
        </span>
        <button
          className="btn btn-sm btn-secondary"
          style={{padding:'4px 8px',fontSize:'10px'}}
          aria-label="Close AI explanation"
          onClick={handleClear}
        >{'\u2715'}</button>
      </div>
      <div className="ai-explain-content">
        {(function() {
          var lines = aiExplanation.split('\n');
          var filtered = [];
          var skip = false;
          for (var li = 0; li < lines.length; li++) {
            var l = lines[li];
            if (l.match(/^#+\s/)) {
              var title = l.replace(/^#+\s/, '');
              skip = title.toLowerCase().startsWith('usage tip');
            }
            if (!skip) filtered.push(l);
          }
          return filtered;
        })().reduce(function(acc, line, i) {
          if (!line.trim() || line.match(/^-{3,}$/)) return acc;
          if (line.match(/^\|[-|\s]+\|$/)) return acc;
          if (isExam && line.match(/^###\s/)) {
            exchange = [];
            acc.push(<div key={i} className="ai-exchange">{exchange}</div>);
            return acc;
          }
          if (line.match(/^#+\s/)) {
            section = line.replace(/^#+\s/, '');
            exchange = null;
            acc.push(<div key={i} className="ai-section-title">{section}</div>);
            return acc;
          }
          if (line.match(/^[-\u2022]\s/)) {
            var bulletText = line.replace(/^[-\u2022]\s/, '');
            var speaker = exchange && bulletText.match(/^([AB]):\s*/);
            if (speaker) bulletText = bulletText.slice(speaker[0].length);
            var out = exchange || acc;
            var badge = speaker ? <span className={'ai-turn-mark ai-turn-' + speaker[1]}>{speaker[1]}</span> : null;
            var withVerbLinks = isPattern && section.toLowerCase() === 'pattern breakdown';
            // Extract German phrase: drop English translation after dash/en-dash/em-dash,
            // drop trailing parens (e.g. "ich **werde** (I become)"), strip markdown.
            var germanPhrase = bulletText
              .split(/\s+[\u2013\u2014\-]\s+/)[0]
              .replace(/\s*\(.*\)\s*$/, '')
              .replace(/\*\*(.+?)\*\*/g, '$1')
              .replace(/\*(.+?)\*/g, '$1')
              .trim();
            if (lang !== 'en' && germanPhrase && germanPhrase.length > 1) {
              out.push(<div key={i} className={speaker ? 'ai-turn' : 'ai-bullet'} style={{display:'flex',alignItems:'center',gap:'6px'}}>
                {badge}
                <span style={{flex:1}}>{renderInline(bulletText, i, withVerbLinks)}</span>
                <button className="speak-btn" style={{flexShrink:0,fontSize:'14px',padding:'2px 4px'}}
                  aria-label={'Read ' + germanPhrase + ' aloud'}
                  onClick={function() { speak(germanPhrase); }}
                >{'\uD83D\uDD0A'}</button>
              </div>);
            } else {
              out.push(<div key={i} className={speaker ? 'ai-turn' : 'ai-bullet'}>{badge}{renderInline(bulletText, i, withVerbLinks)}</div>);
            }
            return acc;
          }
          if (line.match(/^\|.*\|$/)) {
            var cells = line.split('|').filter(function(c) { return c.trim(); });
            if (cells.length >= 2) {
              var tableGerman = (cells[0].trim() + ' ' + cells[1].trim()).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/\s*\(.*\)\s*$/, '').trim();
              acc.push(<div key={i} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'6px 12px', margin:'2px 0', borderRadius:'8px',
                background: i % 2 === 0 ? 'var(--subtle-bg)' : 'var(--card)',
                fontSize:'13px', border:'1px solid var(--card-border)'
              }}>
                <span style={{color:'var(--sage)',fontWeight:600,minWidth:'70px'}}>{cells[0].trim()}</span>
                <span style={{color:'var(--brand)',fontWeight:600,flex:1}}>{renderInline(cells[1].trim(), i)}</span>
                {lang !== 'en' && tableGerman.length > 1 ? <button className="speak-btn" style={{flexShrink:0,fontSize:'14px',padding:'2px 4px',marginLeft:'4px'}}
                  aria-label={'Read ' + tableGerman + ' aloud'}
                  onClick={function() { speak(tableGerman); }}
                >{'\uD83D\uDD0A'}</button> : null}
              </div>);
            }
            return acc;
          }
          // Add speaker button to numbered German sentences (e.g. "1. Ich habe elf Freunde.")
          var numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
          if (numberedMatch) {
            var rawSentence = numberedMatch[2].replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
            acc.push(<div key={i} className="ai-line" style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <span style={{flex:1}}>{renderInline(line, i)}</span>
              <button className="speak-btn" style={{flexShrink:0,fontSize:'14px',padding:'2px 4px'}}
                aria-label="Read sentence aloud"
                onClick={function() { speak(rawSentence); }}
              >{'\uD83D\uDD0A'}</button>
            </div>);
            return acc;
          }
          acc.push(<div key={i} className="ai-line">{renderInline(line, i)}</div>);
          return acc;
        }, [])}
      </div>
    </div> : null}
  </>;
})
