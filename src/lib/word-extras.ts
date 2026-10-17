// "Same level" filter for synonyms/antonyms on the flashcard back: keep only
// candidates that exist in the current course's own word list (the AI's
// suggestions are stored unfiltered, shared by both German courses).

function norm(s) {
  return String(s).toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, ' ')       // "Sie (formal)" → "sie"
    .replace(/^(der|die|das)\s+/, '')        // match nouns with or without article
    .replace(/\s+/g, ' ')
    .trim();
}

// words: course rows [german, english, cat, type]. Returns a lookup
// normalised-form → word index (first occurrence wins).
export function buildWordIndex(words) {
  var index = new Map();
  for (var i = 0; i < words.length; i++) {
    var k = norm(words[i][0]);
    if (k && !index.has(k)) index.set(k, i);
  }
  return index;
}

// candidates: German strings from the AI. selfIdx: the card's own word, never
// listed. Returns [{wi, german, english}] for the in-course matches.
export function matchCourseWords(candidates, index, words, selfIdx) {
  var seen = {};
  var result = [];
  (candidates || []).forEach(function(c) {
    var wi = index.get(norm(c));
    if (wi === undefined || wi === selfIdx || seen[wi]) return;
    seen[wi] = true;
    result.push({wi: wi, german: words[wi][0], english: words[wi][1]});
  });
  return result;
}
