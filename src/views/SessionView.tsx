import React from 'react';
import { DUAL_CODING_TIPS, REVIEW_LABELS, REVIEW_METHODS } from '../lib/constants';
import Flashcard from '../components/Flashcard';
import ConfidenceButtons from '../components/ConfidenceButtons';
import AiExplainBox from '../components/AiExplainBox';
import PatternCard, { PatternNotes } from '../components/PatternCard';

export default React.memo(function SessionView({
  sessionWords, sessionType, currentIdx, flipped, setFlipped,
  streak, rateWord, setView,
  wordImage, imageLoading, wordIPA, wordDefinition, defImage, wordExtras, progress,
  aiExplanation, aiLoading, aiError, aiSaveStatus,
  setAiExplanation, setAiLoading, setAiError, setAiSaveStatus,
  hideAiExplain, lang, emojis, vietnameseDef, onGenerateImage, direction
}) {
  var w = sessionWords[currentIdx];
  // Sentence-pattern course rows carry meta (see patterns-a1-data.ts)
  var isPattern = !!(w && w.meta && w.meta.pattern);
  var tip = DUAL_CODING_TIPS[currentIdx % DUAL_CODING_TIPS.length];
  var isLearn = sessionType.type === "learn";
  // Opened from an exercise link in a separate tab: view-only, no rating, so
  // this tab never writes progress that the exercise tab would then overwrite.
  var isLookup = sessionType.type === "lookup";
  var reviewInterval = sessionType.interval;

  return (
    <div className="app">
      <div className="session-header">
        <button onClick={function() { setView(sessionType.type === 'browse' ? 'browse' : 'dashboard'); }}>{'\u2190'} Back</button>
        <span style={{fontSize:'13px',fontWeight:600}}>
          {/* Patterns, en->de: the German is the answer — title with the situation instead */}
          {sessionType.type === 'browse' || isLookup ? (isPattern && direction !== 'de-en' && !w.meta.listenOnly ? w.cat : w.german)
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
            style={{width: ((currentIdx)/sessionWords.length*100) + '%', background:'var(--success)'}} />
        </div>

        {streak >= 3 ? <div style={{textAlign:'center',fontSize:'12px',color:'var(--warning)',fontWeight:600,margin:'4px 0'}}>
          {'\uD83D\uDD25 ' + streak + (isPattern ? ' in a row!' : ' word streak!')}
        </div> : null}

        {isPattern ? <PatternCard
          word={w}
          flipped={flipped}
          onFlip={function() { setFlipped(!flipped); }}
          direction={direction}
        /> : <Flashcard
          word={w}
          flipped={flipped}
          onFlip={function() { setFlipped(!flipped); }}
          wordIPA={wordIPA}
          wordDefinition={wordDefinition}
          defImage={defImage}
          wordExtras={wordExtras}
          progress={progress}
          wordImage={wordImage}
          imageLoading={imageLoading}
          emojis={emojis}
          lang={lang}
          vietnameseDef={vietnameseDef}
          onGenerateImage={onGenerateImage}
        />}

        {isLearn && !flipped && !isPattern ? <div className="dual-coding-prompt">
          <strong>{'\uD83C\uDFA8'} Dual Coding: </strong>{tip}
        </div> : null}

        {/* Word image (front side) */}
        {!flipped && !isPattern ? <div className="word-image-container">
          {imageLoading ? <div style={{textAlign:'center',color:'var(--text-faint)',padding:'20px',fontSize:'12px'}}>
            <div className="spinner" style={{width:'24px',height:'24px',margin:'0 auto 8px'}}></div>
            Generating image...
          </div> : null}
          {wordImage ? <div>
            <img src={wordImage.url} alt={w.english} className="word-image"
              style={{borderRadius:'12px',maxHeight:'200px',objectFit:'contain',background:'var(--card)'}} />
          </div> : null}
          {!imageLoading && !wordImage ? <div style={{textAlign:'center',fontSize:'48px',padding:'20px'}}>
            {/* Per-word emoji from the emojis prop; the old global
                WORD_EMOJIS check never resolved in module scope, so
                every word showed the generic book fallback. */}
            {(emojis && emojis[w.idx]) || '\uD83D\uDCDA'}
          </div> : null}
        </div> : null}

        {!isLearn && !flipped && reviewInterval ? <div className="tip-box">
          <strong>{'\uD83C\uDFAF'} Method: </strong>{REVIEW_METHODS[reviewInterval]}
        </div> : null}

        {flipped ? <>
          {isPattern ? <PatternNotes word={w} /> : null}
          {isLearn && isPattern ? <div className="dual-coding-prompt">
            <strong>{'\uD83D\uDDE3\uFE0F'} Say it about you: </strong>
            {'swap in your own words and say the whole sentence out loud, twice.'}
          </div> : isLearn ? <div className="dual-coding-prompt">
            <strong>{'\u270D\uFE0F'} Elaboration: </strong>
            {'Create a personal sentence using "'}<em>{w.german}</em>
            {'" connected to your own life.'}
          </div> : null}
          {isLookup ? <p style={{textAlign:'center',fontSize:'12px',color:'var(--text-muted)',margin:'8px 0'}}>
            Close this tab to return to your exercise.
          </p> : <>
            <p style={{textAlign:'center',fontSize:'12px',color:'var(--text-muted)',margin:'8px 0'}}>
              How well did you know this?
            </p>
            <ConfidenceButtons onRate={rateWord} />
          </>}

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
            explainOpts={isPattern ? {kind: 'pattern'} : undefined}
          /> : null}
        </> : null}
      </div>
    </div>
  );
})
