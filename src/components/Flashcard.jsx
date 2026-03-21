import React from 'react';
import { WORD_EMOJIS } from '../emoji-data.js';
import { speakGerman } from '../lib/speech.js';

export default function Flashcard({
  word, flipped, onFlip, wordIPA, wordDefinition, defImage,
  wordImage, imageLoading
}) {
  return (
    <div className="flashcard-container"
      onClick={function() { onFlip(); speakGerman(word.german); }}>
      <div className={'flashcard' + (flipped ? ' flipped' : '')}>
        <div className="flashcard-face flashcard-front">
          <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
            {typeof WORD_EMOJIS !== 'undefined' ? <span style={{fontSize:'28px'}}>{WORD_EMOJIS[word.idx]}</span> : null}
            <span className={'tag ' + word.typeClass}>{word.type}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="flashcard-word">{word.german}</div>
            <button className="speak-btn"
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
          {/* AI cartoon image illustrating the definition (small, centered) */}
          {defImage ? <img
            src={defImage.url} alt=""
            style={{width:'110px',height:'110px',objectFit:'contain',borderRadius:'10px',
              background:'#fff',margin:'0 auto 10px',display:'block'}}
          /> : null}
          {/* German definition */}
          {wordDefinition ? <div style={{
            fontSize:'14px',color:'#2E3033',lineHeight:'1.4',marginBottom:'8px',
            padding:'6px 10px',borderRadius:'8px',background:'#f8f6f0',
            fontStyle:'italic',textAlign:'center'
          }}>{wordDefinition}</div> : null}
          {/* German word + IPA + speaker */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',marginTop:'0',gap:'6px'}}>
            <span style={{fontSize:'15px',color:'#718096'}}>{word.german}</span>
            {wordIPA ? <span style={{fontSize:'12px',color:'#b0b8c4',fontFamily:'serif',fontStyle:'italic'}}>
              {'/' + wordIPA + '/'}
            </span> : null}
            <button className="speak-btn back"
              onClick={function(e) { e.stopPropagation(); speakGerman(word.german); }}>
              {'\uD83D\uDD0A'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
