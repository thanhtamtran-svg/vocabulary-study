import React from 'react';
import { SUPABASE_URL, SUPABASE_KEY } from '../lib/supabase';
import { fetchExplanation, fetchCachedExplanation } from '../lib/api';
import { speakGerman } from '../lib/speech';
import { speakEnglish } from '../lib/english-speech';

// Parse markdown inline: **bold** and *italic*
function renderInline(text, key) {
  var parts = [];
  var re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  var last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={key + '_b' + m.index}>{m[1]}</strong>);
    else if (m[2]) parts.push(<em key={key + '_i' + m.index}>{m[2]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

export default React.memo(function AiExplainBox({
  word, aiExplanation, aiLoading, aiError, aiSaveStatus,
  setAiExplanation, setAiLoading, setAiError, setAiSaveStatus, lang
}) {
  var speak = lang === 'en' ? speakEnglish : speakGerman;
  function handleExplain() {
    setAiLoading(true);
    setAiError('');
    setAiSaveStatus('');
    fetchExplanation(word.german, word.type, lang).then(function(text) {
      setAiExplanation(text);
      setAiLoading(false);
      setAiSaveStatus('saving');
      setTimeout(function() {
        fetchCachedExplanation(word.german, lang).then(function(cached) {
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
    var wordLower = word.german.toLowerCase().trim();
    fetch(SUPABASE_URL + '/rest/v1/vocab_explanations?word=eq.' + encodeURIComponent(wordLower), {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });
  }

  return <>
    {/* AI Explain button */}
    {!aiExplanation && !aiLoading && !aiError ? <button
      className="btn btn-secondary"
      style={{marginTop:'10px',fontSize:'13px',gap:'6px'}}
      onClick={handleExplain}
    >{'\uD83E\uDD16'} Explain this word</button> : null}

    {/* Loading state */}
    {aiLoading ? <div className="ai-explain-box">
      <div style={{textAlign:'center',color:'#718096',padding:'16px'}}>
        {'\u23F3'} Asking AI teacher...
      </div>
    </div> : null}

    {/* Error state */}
    {aiError ? <div className="ai-explain-box"
      style={{borderColor:'#E74C3C',background:'#FEF5F5'}}>
      <p style={{color:'#E74C3C',fontSize:'12px',margin:0}}>{aiError}</p>
      <button className="btn btn-sm btn-secondary"
        style={{marginTop:'8px'}}
        onClick={handleRetry}
      >Retry</button>
    </div> : null}

    {/* Explanation result */}
    {aiExplanation ? <div className="ai-explain-box">
      <div className="ai-explain-header">
        <span style={{display:'flex',alignItems:'center',gap:'6px'}}>
          {'\uD83E\uDD16'} AI Teacher
          {aiSaveStatus === 'saving' ? <span style={{fontSize:'10px',color:'#F39C12',background:'#FEF9E7',padding:'2px 6px',borderRadius:'4px',fontWeight:600}}>
            {'\u23F3'} Saving...
          </span> : aiExplanation && !aiLoading ? <span style={{fontSize:'10px',color:'#27AE60',background:'#E8F8F0',padding:'2px 6px',borderRadius:'4px',fontWeight:600}}>
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
        {aiExplanation.split('\n').reduce(function(acc, line, i) {
          if (!line.trim() || line.match(/^-{3,}$/)) return acc;
          if (line.match(/^\|[-|\s]+\|$/)) return acc;
          if (line.match(/^#+\s/)) {
            acc.push(<div key={i} className="ai-section-title">{line.replace(/^#+\s/, '')}</div>);
            return acc;
          }
          if (line.match(/^[-\u2022]\s/)) {
            var bulletText = line.replace(/^[-\u2022]\s/, '');
            // Extract German phrase from conjugation bullets like "ich **werde** (I become)"
            var germanPhrase = bulletText.replace(/\s*\(.*\)\s*$/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').trim();
            if (lang !== 'en' && germanPhrase && germanPhrase.length > 1) {
              acc.push(<div key={i} className="ai-bullet" style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <span style={{flex:1}}>{renderInline(bulletText, i)}</span>
                <button className="speak-btn" style={{flexShrink:0,fontSize:'14px',padding:'2px 4px'}}
                  aria-label={'Read ' + germanPhrase + ' aloud'}
                  onClick={function() { speak(germanPhrase); }}
                >{'\uD83D\uDD0A'}</button>
              </div>);
            } else {
              acc.push(<div key={i} className="ai-bullet">{renderInline(bulletText, i)}</div>);
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
                background: i % 2 === 0 ? '#f8f6f0' : '#fff',
                fontSize:'13px', border:'1px solid #F5EBDC'
              }}>
                <span style={{color:'#7E9470',fontWeight:600,minWidth:'70px'}}>{cells[0].trim()}</span>
                <span style={{color:'#324A84',fontWeight:600,flex:1}}>{renderInline(cells[1].trim(), i)}</span>
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
