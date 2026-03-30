var audioCache = new Map();
var sharedAudio = typeof window !== 'undefined' ? new Audio() : null;
var isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function speakWithGoogleTTS(text, lang) {
  if (!sharedAudio) {
    speakWithBrowserTTS(text, lang);
    return;
  }

  sharedAudio.pause();

  var cacheKey = lang + ':' + text.toLowerCase().trim();
  if (audioCache.has(cacheKey)) {
    var cached = audioCache.get(cacheKey);
    sharedAudio.src = cached;
    sharedAudio.currentTime = 0;
    sharedAudio.play().catch(function() { speakWithBrowserTTS(text, lang); });
    return;
  }

  var tl = lang === 'en' ? 'en' : 'de';
  var url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + tl + '&q=' + encodeURIComponent(text);
  sharedAudio.src = url;
  sharedAudio.currentTime = 0;
  sharedAudio.play().then(function() {
    audioCache.set(cacheKey, url);
  }).catch(function() {
    speakWithBrowserTTS(text, lang);
  });
}

function speakWithBrowserTTS(text, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'en' ? 'en-US' : 'de-DE';
  utterance.rate = 0.85;
  var voices = window.speechSynthesis.getVoices();
  var prefix = lang === 'en' ? 'en' : 'de';
  var voice = voices.find(function(v) { return v.lang.startsWith(prefix); });
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function speakGerman(text) {
  if (isMobile) {
    speakWithBrowserTTS(text, 'de');
  } else {
    speakWithGoogleTTS(text, 'de');
  }
}

export function speakEnglish(text) {
  if (isMobile) {
    speakWithBrowserTTS(text, 'en');
  } else {
    speakWithGoogleTTS(text, 'en');
  }
}

// Preload browser voices
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function() { window.speechSynthesis.getVoices(); };
}
