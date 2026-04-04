var audioCache = new Map();
var sharedAudio = typeof window !== 'undefined' ? new Audio() : null;
var isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
var voicesLoaded = false;

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
  utterance.rate = lang === 'en' ? 1.0 : 0.85;

  // On iOS, voices may not be loaded yet — try to find one but speak regardless
  var voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    var prefix = lang === 'en' ? 'en' : 'de';
    var voice = voices.find(function(v) { return v.lang.startsWith(prefix); });
    if (voice) utterance.voice = voice;
  }

  // iOS workaround: speechSynthesis can get stuck, cancel and retry
  try {
    window.speechSynthesis.speak(utterance);
    // iOS sometimes pauses after first speak — resume it
    if (isMobile) {
      setTimeout(function() {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 100);
    }
  } catch(e) {
    // Silently fail
  }
}

export function speakGerman(text) {
  if (isMobile) {
    // On mobile, try Google TTS first (works on Android), fall back to browser TTS
    if (/Android/i.test(navigator.userAgent)) {
      speakWithGoogleTTS(text, 'de');
    } else {
      speakWithBrowserTTS(text, 'de');
    }
  } else {
    speakWithGoogleTTS(text, 'de');
  }
}

function cleanEnglishForSpeech(text) {
  return text
    .replace(/\s*\+\s*.*/g, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*=\s*\w.*$/, '')
    .replace(/\bsth\b/gi, 'something')
    .replace(/\bsb\b/gi, 'somebody')
    .replace(/\s*\/\s*/g, ' or ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function speakEnglish(text) {
  var clean = cleanEnglishForSpeech(text);
  if (isMobile) {
    if (/Android/i.test(navigator.userAgent)) {
      speakWithGoogleTTS(clean, 'en');
    } else {
      speakWithBrowserTTS(clean, 'en');
    }
  } else {
    speakWithGoogleTTS(clean, 'en');
  }
}

// Preload browser voices — critical for iOS
if (typeof window !== 'undefined' && window.speechSynthesis) {
  // Initial load attempt
  window.speechSynthesis.getVoices();
  // Listen for async voice loading (required on iOS/Chrome)
  window.speechSynthesis.onvoiceschanged = function() {
    voicesLoaded = true;
    window.speechSynthesis.getVoices();
  };
  // iOS workaround: trigger voice loading with a silent utterance
  if (isMobile) {
    var silentUtterance = new SpeechSynthesisUtterance('');
    silentUtterance.volume = 0;
    try { window.speechSynthesis.speak(silentUtterance); } catch(e) {}
  }
}
