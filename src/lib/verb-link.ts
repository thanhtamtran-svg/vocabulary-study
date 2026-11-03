// Map a conjugated German verb form ("kommt", "ist") to its word card, so the
// pattern tutor can link verbs to a lookup tab. A1.1 is checked first because
// it opens without the password; the full A1 deck covers the rest.
import { VOCAB_A11_DATA } from '../vocab-a11-data';
import { VOCAB_DATA } from '../vocab-data';
import { CONJUGATIONS, getConjugation } from './conjugations';

var VERB_TYPE = 1;
// Forms that are far more often another word: "bitte" = please, not "I ask".
var NOT_VERBS = ['bitte'];
var formIndex = null;

function addVerb(index, lang, word, known) {
  var inf = word.replace(/^sich\s+/, '').toLowerCase();
  if (!/^[a-zäöüß]+n$/.test(inf)) return; // single-word infinitives only
  var conj = getConjugation(inf);
  var forms = [inf];
  for (var p in conj) forms.push(conj[p].toLowerCase());
  for (var i = 0; i < forms.length; i++) {
    var prev = index.get(forms[i]);
    // Irregular tables beat guessed regular forms; otherwise first course wins.
    if (!prev || (known && !prev.known)) index.set(forms[i], {lang: lang, word: word, known: known});
  }
}

function buildIndex() {
  var index = new Map();
  [['german_a11', VOCAB_A11_DATA], ['german', VOCAB_DATA]].forEach(function(entry) {
    entry[1].words.forEach(function(w) {
      if (w[3] !== VERB_TYPE) return;
      addVerb(index, entry[0], w[0], !!CONJUGATIONS[w[0].toLowerCase()]);
    });
  });
  NOT_VERBS.forEach(function(w) { index.delete(w); });
  return index;
}

// Returns {lang, word} for the card to open, or null if the token is not a known verb.
export function findVerb(token) {
  if (!formIndex) formIndex = buildIndex();
  return formIndex.get(token.toLowerCase()) || null;
}
