// Deep link to a single word card, opened in a new tab from exercises so the
// learner can review the word without leaving the exercise.
// URL shape: ?lang=<german|german_a11|german_patterns|english>&word=<word text as in data>

var LANG_PARAM = 'lang';
var WORD_PARAM = 'word';

export function wordLinkHref(lang, word) {
  var url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(LANG_PARAM, lang);
  url.searchParams.set(WORD_PARAM, word);
  return url.href;
}

export function readWordLink() {
  try {
    var params = new URLSearchParams(window.location.search);
    var lang = params.get(LANG_PARAM);
    var word = params.get(WORD_PARAM);
    return lang && word ? {lang: lang, word: word} : null;
  } catch (e) { return null; }
}

// Drop the params once consumed so a reload or Back goes to the normal app.
export function clearWordLink() {
  try {
    var url = new URL(window.location.href);
    url.searchParams.delete(LANG_PARAM);
    url.searchParams.delete(WORD_PARAM);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch (e) { /* ignore */ }
}

export function findWordIndex(words, word) {
  for (var i = 0; i < words.length; i++) {
    if (words[i][0] === word) return i;
  }
  return -1;
}
