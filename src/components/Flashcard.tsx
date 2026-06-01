import React from 'react';
import { speakGerman } from '../lib/speech';
import { speakEnglish } from '../lib/english-speech';

// Gender-coded dot for German nouns — der=blue, die=red, das=green.
// Falls back to null for non-nouns and article-less nouns (country names).
function genderDot(germanWord) {
  if (typeof germanWord !== 'string') return null;
  if (germanWord.startsWith('der ')) return { color: '#3B82F6', label: 'der (masculine)' };
  if (germanWord.startsWith('die ')) return { color: '#EF4444', label: 'die (feminine/plural)' };
  if (germanWord.startsWith('das ')) return { color: '#22C55E', label: 'das (neuter)' };
  return null;
}

export default React.memo(function Flashcard({
  word, flipped, onFlip, wordIPA, wordDefinition, defImage,
  wordImage, imageLoading, emojis, lang, vietnameseDef, onGenerateImage
}) {
  var speak = lang === 'en' ? speakEnglish : speakGerman;
  var gender = lang === 'en' ? null : genderDot(word.german);

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onFlip();
      speak(word.german);
    }
  }

  return (
    <div className="flashcard-container"
      tabIndex={0}
      role="button"
      aria-label={'Flashcard for ' + word.german + '. ' + (flipped ? 'Showing answer: ' + word.english : 'Press Enter or Space to flip.')}
      onClick={function() { onFlip(); speak(word.german); }}
      onKeyDown={handleKeyDown}>
      <div className={'flashcard' + (flipped ? ' flipped' : '')}>
        <div className="flashcard-face flashcard-front">
          {gender ? <span
            aria-label={gender.label}
            title={gender.label}
            style={{
              display:'block',width:'28px',height:'28px',borderRadius:'50%',
              background: gender.color,margin:'4px auto',
              boxShadow:'0 1px 3px rgba(0,0,0,0.15)'
            }} /> : (emojis ? <span style={{fontSize:'28px',display:'block',textAlign:'center',margin:'4px 0'}}>{emojis[word.idx]}</span> : null)}
          <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px',justifyContent:'center'}}>
            <span className={'tag ' + word.typeClass}>{word.type}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="flashcard-word">{word.german}</div>
            <button className="speak-btn"
              aria-label={'Pronounce ' + word.german}
              onClick={function(e) { e.stopPropagation(); speak(word.german); }}>
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
            <div className={'flashcard-back-layout' + (wordImage ? ' has-image' : '')}>
              <div className="flashcard-back-text">
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
              </div>
              {wordImage ? <img src={wordImage.url} alt="" className="flashcard-back-image" /> : null}
            </div>
          </> : <>
            {/* German back: German definition + word + cached image */}
            <div className={'flashcard-back-layout' + (defImage ? ' has-image' : '')}>
              <div className="flashcard-back-text">
                {wordDefinition ? <div style={{
                  fontSize:'14px',color:'#2E3033',lineHeight:'1.4',marginBottom:'8px',
                  padding:'6px 10px',borderRadius:'8px',background:'#f8f6f0',
                  fontStyle:'italic',textAlign:'center'
                }}>{wordDefinition}</div> : null}
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',marginTop:'0',gap:'6px',flexWrap:'wrap'}}>
                  <span style={{fontSize:'15px',color:'#718096'}}>{word.german}</span>
                  {wordIPA ? <span style={{fontSize:'12px',color:'#b0b8c4',fontFamily:'serif',fontStyle:'italic'}}>
                    {'/' + wordIPA + '/'}
                  </span> : null}
                  <button className="speak-btn back"
                    aria-label={'Pronounce ' + word.german}
                    onClick={function(e) { e.stopPropagation(); speak(word.german); }}>
                    {'\uD83D\uDD0A'}
                  </button>
                </div>
              </div>
              {defImage ? <img src={defImage.url} alt="" className="flashcard-back-image" /> : null}
            </div>
          </>}
        </div>
      </div>
    </div>
  );
})
