var audioCache = new Map();
var currentAudio = null;

function speakWithGoogleTTS(text) {
  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  var cacheKey = text.toLowerCase().trim();
  if (audioCache.has(cacheKey)) {
    var cached = audioCache.get(cacheKey);
    cached.currentTime = 0;
    currentAudio = cached;
    cached.play().catch(function() { speakWithBrowserTTS(text); });
    return;
  }

  var url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=de&q=' + encodeURIComponent(text);
  var audio = new Audio(url);
  currentAudio = audio;
  audio.play().then(function() {
    audioCache.set(cacheKey, audio);
  }).catch(function() {
    // Google TTS blocked or failed — fall back to browser TTS
    speakWithBrowserTTS(text);
  });
}

function speakWithBrowserTTS(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE';
  utterance.rate = 0.85;
  var voices = window.speechSynthesis.getVoices();
  var deVoice = voices.find(function(v) { return v.lang.startsWith('de'); });
  if (deVoice) utterance.voice = deVoice;
  window.speechSynthesis.speak(utterance);
}

export function speakGerman(text) {
  speakWithGoogleTTS(text);
}

// Preload browser voices as fallback
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function() { window.speechSynthesis.getVoices(); };
}
