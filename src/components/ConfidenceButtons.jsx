import React from 'react';

export default function ConfidenceButtons({ onRate }) {
  return (
    <div className="confidence-btns">
      <button className="conf-btn conf-1"
        onClick={function(e) { e.stopPropagation(); onRate(1); }}>
        {'\u274C'}<br />No idea
      </button>
      <button className="conf-btn conf-2"
        onClick={function(e) { e.stopPropagation(); onRate(2); }}>
        {'\uD83E\uDD14'}<br />Partial
      </button>
      <button className="conf-btn conf-3"
        onClick={function(e) { e.stopPropagation(); onRate(3); }}>
        {'\uD83D\uDE10'}<br />Slow
      </button>
      <button className="conf-btn conf-4"
        onClick={function(e) { e.stopPropagation(); onRate(4); }}>
        {'\u2705'}<br />Instant
      </button>
    </div>
  );
}
