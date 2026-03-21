import React from 'react';
import { SUPABASE_URL, SUPABASE_KEY } from '../lib/supabase.js';
import { fetchExplanation, fetchCachedExplanation } from '../lib/api.js';

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

export default function AiExplainBox({
  word, aiExplanation, aiLoading, aiError, aiSaveStatus,
  setAiExplanation, setAiLoading, setAiError, setAiSaveStatus
}) {
  function handleExplain() {
    setAiLoading(true);
    setAiError('');
    setAiSaveStatus('');
    fetchExplanation(word.german, word.type).then(function(text) {
      setAiExplanation(text);
      setAiLoading(false);
      setAiSaveStatus('saving');
      setTimeout(function() {
        fetchCachedExplanation(word.german).then(function(cached) {
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
          </span> : null}
          {aiSaveStatus === 'saved' ? <span style={{fontSize:'10px',color:'#27AE60',background:'#E8F8F0',padding:'2px 6px',borderRadius:'4px',fontWeight:600}}>
            {'\u2705'} Saved
          </span> : null}
        </span>
        <button
          className="btn btn-sm btn-secondary"
          style={{padding:'4px 8px',fontSize:'10px'}}
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
            acc.push(<div key={i} className="ai-bullet">{renderInline(line.replace(/^[-\u2022]\s/, ''), i)}</div>);
            return acc;
          }
          if (line.match(/^\|.*\|$/)) {
            var cells = line.split('|').filter(function(c) { return c.trim(); });
            if (cells.length >= 2) {
              acc.push(<div key={i} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'6px 12px', margin:'2px 0', borderRadius:'8px',
                background: i % 2 === 0 ? '#f8f6f0' : '#fff',
                fontSize:'13px', border:'1px solid #F5EBDC'
              }}>
                <span style={{color:'#7E9470',fontWeight:600,minWidth:'70px'}}>{cells[0].trim()}</span>
                <span style={{color:'#324A84',fontWeight:600}}>{renderInline(cells[1].trim(), i)}</span>
              </div>);
            }
            return acc;
          }
          acc.push(<div key={i} className="ai-line">{renderInline(line, i)}</div>);
          return acc;
        }, [])}
      </div>
    </div> : null}
  </>;
}
