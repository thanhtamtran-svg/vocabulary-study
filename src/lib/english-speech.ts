var audioCache = new Map();
var sharedAudio = typeof window !== 'undefined' ? new Audio() : null;

function speakWithGoogleTTS(text) {
  if (!sharedAudio) {
    speakWithBrowserTTS(text);
    return;
  }

  // Stop any currently playing audio
  sharedAudio.pause();

  var cacheKey = text.toLowerCase().trim();
  if (audioCache.has(cacheKey)) {
    var cached = audioCache.get(cacheKey);
    sharedAudio.src = cached;
    sharedAudio.currentTime = 0;
    sharedAudio.play().catch(function() { speakWithBrowserTTS(text); });
    return;
  }

  var url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=' + encodeURIComponent(text);
  sharedAudio.src = url;
  sharedAudio.currentTime = 0;
  sharedAudio.play().then(function() {
    audioCache.set(cacheKey, url);
  }).catch(function() {
    // Google TTS blocked or failed — fall back to browser TTS
    speakWithBrowserTTS(text);
  });
}

function speakWithBrowserTTS(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.85;
  var voices = window.speechSynthesis.getVoices();
  var enVoice = voices.find(function(v) { return v.lang.startsWith('en'); });
  if (enVoice) utterance.voice = enVoice;
  window.speechSynthesis.speak(utterance);
}

export function speakEnglish(text) {
  speakWithGoogleTTS(text);
}

// Preload browser voices as fallback
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function() { window.speechSynthesis.getVoices(); };
}
