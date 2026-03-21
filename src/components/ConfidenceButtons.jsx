import React, { useEffect } from 'react';

export default function ConfidenceButtons({ onRate }) {
  // Number key shortcuts 1-4
  useEffect(function() {
    function handleKeyDown(e) {
      if (e.key === '1') { e.preventDefault(); onRate(1); }
      else if (e.key === '2') { e.preventDefault(); onRate(2); }
      else if (e.key === '3') { e.preventDefault(); onRate(3); }
      else if (e.key === '4') { e.preventDefault(); onRate(4); }
    }
    window.addEventListener('keydown', handleKeyDown);
    return function() { window.removeEventListener('keydown', handleKeyDown); };
  }, [onRate]);

  return (
    <div className="confidence-btns">
      <button className="conf-btn conf-1"
        aria-label="No idea - confidence 1"
        onClick={function(e) { e.stopPropagation(); onRate(1); }}>
        {'\u274C'}<br />No idea
      </button>
      <button className="conf-btn conf-2"
        aria-label="Partial - confidence 2"
        onClick={function(e) { e.stopPropagation(); onRate(2); }}>
        {'\uD83E\uDD14'}<br />Partial
      </button>
      <button className="conf-btn conf-3"
        aria-label="Slow recall - confidence 3"
        onClick={function(e) { e.stopPropagation(); onRate(3); }}>
        {'\uD83D\uDE10'}<br />Slow
      </button>
      <button className="conf-btn conf-4"
        aria-label="Instant recall - confidence 4"
        onClick={function(e) { e.stopPropagation(); onRate(4); }}>
        {'\u2705'}<br />Instant
      </button>
    </div>
  );
}
