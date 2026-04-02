import React from 'react';
import { speakGerman } from '../lib/speech';

export default React.memo(function Flashcard({
  word, flipped, onFlip, wordIPA, wordDefinition, defImage,
  wordImage, imageLoading, emojis, lang, vietnameseDef, onGenerateImage
}) {
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onFlip();
      speakGerman(word.german);
    }
  }

  return (
    <div className="flashcard-container"
      tabIndex={0}
      role="button"
      aria-label={'Flashcard for ' + word.german + '. ' + (flipped ? 'Showing answer: ' + word.english : 'Press Enter or Space to flip.')}
      onClick={function() { onFlip(); speakGerman(word.german); }}
      onKeyDown={handleKeyDown}>
      <div className={'flashcard' + (flipped ? ' flipped' : '')}>
        <div className="flashcard-face flashcard-front">
          {emojis ? <span style={{fontSize:'28px',display:'block',textAlign:'center',margin:'4px 0'}}>{emojis[word.idx]}</span> : null}
          <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px',justifyContent:'center'}}>
            <span className={'tag ' + word.typeClass}>{word.type}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="flashcard-word">{word.german}</div>
            <button className="speak-btn"
              aria-label={'Pronounce ' + word.german}
              onClick={function(e) { e.stopPropagation(); speakGerman(word.german); }}>
              {'\uD83D\uDD0A'}
            </button>
          </div>
          {wordIPA ? <div style={{
            fontSize:'14px',color:'#94a3b8',fontFamily:'serif',fontStyle:'italic',
            marginTop:'2px',letterSpacing:'0.5px'
          }}>{'/' + wordIPA + '/'}</div> : null}
          <div className="flashcard-meta">{word.cat}</div>
          <div style={{marginTop:'6px',fontSize:'11px',opacity:0.6}}>
            Tap to flip
          </div>
        </div>
        <div className="flashcard-face flashcard-back">
          {lang === 'en' ? <>
            {/* English back: definition + Vietnamese + cached image */}
            <div style={{
              fontSize:'14px',color:'#2E3033',lineHeight:'1.5',marginBottom:'6px',
              padding:'8px 12px',borderRadius:'8px',background:'#f0f7ff',
              textAlign:'center',fontWeight:500
            }}>{word.english}</div>
            {vietnameseDef ? <div style={{
              fontSize:'13px',color:'#718096',lineHeight:'1.4',
              padding:'6px 10px',borderRadius:'8px',background:'#f8f6f0',
              textAlign:'center',fontStyle:'italic'
            }}>{'\uD83C\uDDFB\uD83C\uDDF3 '}{vietnameseDef}</div> : null}
            {wordImage ? <img src={wordImage.url} alt=""
              style={{width:'100px',height:'100px',objectFit:'contain',borderRadius:'10px',
                background:'#fff',margin:'8px auto 0',display:'block'}}
            /> : null}
          </> : <>
            {/* German back: German definition + word + cached image */}
            {wordDefinition ? <div style={{
              fontSize:'14px',color:'#2E3033',lineHeight:'1.4',marginBottom:'8px',
              padding:'6px 10px',borderRadius:'8px',background:'#f8f6f0',
              fontStyle:'italic',textAlign:'center'
            }}>{wordDefinition}</div> : null}
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',marginTop:'0',gap:'6px'}}>
              <span style={{fontSize:'15px',color:'#718096'}}>{word.german}</span>
              {wordIPA ? <span style={{fontSize:'12px',color:'#b0b8c4',fontFamily:'serif',fontStyle:'italic'}}>
                {'/' + wordIPA + '/'}
              </span> : null}
              <button className="speak-btn back"
                aria-label={'Pronounce ' + word.german}
                onClick={function(e) { e.stopPropagation(); speakGerman(word.german); }}>
                {'\uD83D\uDD0A'}
              </button>
            </div>
            {wordImage ? <img src={wordImage.url} alt=""
              style={{width:'100px',height:'100px',objectFit:'contain',borderRadius:'10px',
                background:'#fff',margin:'8px auto 0',display:'block'}}
            /> : imageLoading ? <div style={{textAlign:'center',fontSize:'12px',color:'#94a3b8',margin:'8px 0'}}>
              Generating image...
            </div> : onGenerateImage ? <button
              onClick={function(e) { e.stopPropagation(); onGenerateImage(); }}
              style={{display:'block',margin:'8px auto 0',padding:'8px 16px',fontSize:'12px',
                borderRadius:'8px',border:'1px solid #cbd5e1',background:'#f8fafc',
                cursor:'pointer',color:'#64748b'}}
            >{'\uD83C\uDFA8 Generate Image'}</button> : null}
          </>}
        </div>
      </div>
    </div>
  );
})
