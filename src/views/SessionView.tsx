import React from 'react';
import { DUAL_CODING_TIPS, REVIEW_LABELS, REVIEW_METHODS } from '../lib/constants';
import { speakGerman } from '../lib/speech';
import Flashcard from '../components/Flashcard';
import ConfidenceButtons from '../components/ConfidenceButtons';
import AiExplainBox from '../components/AiExplainBox';

export default React.memo(function SessionView({
  sessionWords, sessionType, currentIdx, flipped, setFlipped,
  streak, rateWord, setView,
  wordImage, imageLoading, wordIPA, wordDefinition, defImage,
  aiExplanation, aiLoading, aiError, aiSaveStatus,
  setAiExplanation, setAiLoading, setAiError, setAiSaveStatus,
  hideAiExplain, lang, emojis, vietnameseDef, onGenerateImage
}) {
  var w = sessionWords[currentIdx];
  var tip = DUAL_CODING_TIPS[currentIdx % DUAL_CODING_TIPS.length];
  var isLearn = sessionType.type === "learn";
  var reviewInterval = sessionType.interval;

  return (
    <div className="app">
      <div className="session-header">
        <button onClick={function() { setView(sessionType.type === 'browse' ? 'browse' : 'dashboard'); }}>{'\u2190'} Back</button>
        <span style={{fontSize:'13px',fontWeight:600}}>
          {sessionType.type === 'browse' ? w.german
            : isLearn ? 'Learn Batch ' + sessionType.batchIdx
            : sessionType.type === 'review' && !sessionType.batchIdx ? 'Review'
            : REVIEW_LABELS[reviewInterval] + ' (Batch ' + sessionType.batchIdx + ')'}
        </span>
        <span style={{fontSize:'12px'}}>
          {(currentIdx + 1) + '/' + sessionWords.length}
        </span>
      </div>

      <div className="content session-content">
        <div className="progress-bar">
          <div className="progress-fill"
            style={{width: ((currentIdx)/sessionWords.length*100) + '%', background:'#27AE60'}} />
        </div>

        {streak >= 3 ? <div style={{textAlign:'center',fontSize:'12px',color:'#F39C12',fontWeight:600,margin:'4px 0'}}>
          {'\uD83D\uDD25 ' + streak + ' word streak!'}
        </div> : null}

        <Flashcard
          word={w}
          flipped={flipped}
          onFlip={function() { setFlipped(!flipped); }}
          wordIPA={wordIPA}
          wordDefinition={wordDefinition}
          defImage={defImage}
          wordImage={wordImage}
          imageLoading={imageLoading}
          emojis={emojis}
          lang={lang}
          vietnameseDef={vietnameseDef}
          onGenerateImage={onGenerateImage}
        />

        {isLearn && !flipped ? <div className="dual-coding-prompt">
          <strong>{'\uD83C\uDFA8'} Dual Coding: </strong>{tip}
        </div> : null}

        {/* Word image or Generate button (outside flashcard) */}
        <div style={{textAlign:'center',margin:'8px 0'}}>
          {wordImage ? <img src={wordImage.url} alt={w.english}
            style={{borderRadius:'12px',maxHeight:'160px',objectFit:'contain',background:'#fff'}} />
          : imageLoading ? <div style={{color:'#a0aec0',padding:'12px',fontSize:'12px'}}>
            <div className="spinner" style={{width:'24px',height:'24px',margin:'0 auto 8px'}}></div>
            Generating image...
          </div>
          : onGenerateImage ? <button
            onClick={onGenerateImage}
            style={{padding:'8px 20px',fontSize:'13px',borderRadius:'8px',
              border:'1px solid #cbd5e1',background:'#f8fafc',cursor:'pointer',color:'#64748b'}}
          >{'\uD83C\uDFA8 Generate Image'}</button>
          : null}
        </div>

        {!isLearn && !flipped && reviewInterval ? <div className="tip-box">
          <strong>{'\uD83C\uDFAF'} Method: </strong>{REVIEW_METHODS[reviewInterval]}
        </div> : null}

        {flipped ? <>
          {isLearn ? <div className="dual-coding-prompt">
            <strong>{'\u270D\uFE0F'} Elaboration: </strong>
            {'Create a personal sentence using "'}<em>{w.german}</em>
            {'" connected to your own life.'}
          </div> : null}
          <p style={{textAlign:'center',fontSize:'12px',color:'#718096',margin:'8px 0'}}>
            How well did you know this?
          </p>
          <ConfidenceButtons onRate={rateWord} />

          {!hideAiExplain ? <AiExplainBox
            word={w}
            aiExplanation={aiExplanation}
            aiLoading={aiLoading}
            aiError={aiError}
            aiSaveStatus={aiSaveStatus}
            setAiExplanation={setAiExplanation}
            setAiLoading={setAiLoading}
            setAiError={setAiError}
            setAiSaveStatus={setAiSaveStatus}
            lang={lang}
          /> : null}
        </> : null}
      </div>
    </div>
  );
})
