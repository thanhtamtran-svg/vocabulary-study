import React from 'react';
import App from './App';
import { VOCAB_PATTERNS_DATA } from './patterns-a1-data';

// Lazy entry for the Hören & Sprechen A1 sentence-pattern course, so its
// ~120 KB of data only downloads when the learner opens that card.
export default function PatternsCourse({ onHome }) {
  return <App onHome={onHome} vocabData={VOCAB_PATTERNS_DATA} variant="patterns" />;
}
