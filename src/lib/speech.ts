import { SUPABASE_URL } from './supabase';

// Speech pipeline (voice upgrade 2026-07-17):
//   1. Cloud TTS — our `tts` edge function synthesizes with Google
//      Neural2 voices once per text and caches the MP3 forever in
//      Supabase storage. Natural voice, identical on every device.
//   2. translate.google.com fallback — the old undocumented endpoint,
//      kept only as a net while the cloud path is unconfigured/down.
//   3. Browser speechSynthesis — last resort; now RANKS voices
//      (natural/neural/Google first) instead of taking the first match,
//      which used to pick a robotic voice on PCs that had better ones.

var TTS_URL = SUPABASE_URL + '/functions/v1/tts';
var audioCache = new Map();      // cacheKey -> playable URL
var pendingTTS = new Map();      // cacheKey -> in-flight promise (dedupe)
var sharedAudio = typeof window !== 'undefined' ? new Audio() : null;
var isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
var cloudTTSBroken = false;      // set when the endpoint 5xx's — skip it for the session

function authHeader() {
  var token = '';
  try { token = localStorage.getItem('vocab_auth_token') || ''; } catch (e) {}
  return token ? 'Bearer ' + token : '';
}

function playUrl(url, onFail) {
  if (!sharedAudio) { onFail(); return; }
  sharedAudio.pause();
  sharedAudio.src = url;
  sharedAudio.currentTime = 0;
  sharedAudio.play().catch(onFail);
}

function speakWithCloudTTS(text, lang, onFail) {
  if (cloudTTSBroken || !sharedAudio) { onFail(); return; }
  var cacheKey = 'cloud:' + lang + ':' + text.toLowerCase().trim();
  if (audioCache.has(cacheKey)) {
    playUrl(audioCache.get(cacheKey), onFail);
    return;
  }
  var p = pendingTTS.get(cacheKey);
  if (!p) {
    var headers = { 'Content-Type': 'application/json' };
    var auth = authHeader();
    if (auth) headers['Authorization'] = auth;
    p = fetch(TTS_URL, {
      method: 'POST', headers: headers,
      body: JSON.stringify({ text: text, lang: lang })
    }).then(function(res) {
      if (res.status === 503 || res.status >= 500) cloudTTSBroken = true;
      if (!res.ok) throw new Error('tts ' + res.status);
      return res.json();
    }).then(function(data) {
      if (!data.url) throw new Error('no url');
      audioCache.set(cacheKey, data.url);
      return data.url;
    });
    pendingTTS.set(cacheKey, p);
    p.finally(function() { pendingTTS.delete(cacheKey); });
  }
  p.then(function(url) { playUrl(url, onFail); }).catch(onFail);
}

function speakWithGoogleTranslate(text, lang, onFail) {
  if (!sharedAudio) { onFail(); return; }
  var tl = lang === 'en' ? 'en' : 'de';
  var url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' + tl + '&q=' + encodeURIComponent(text);
  playUrl(url, onFail);
}

// Rank browser voices: platform "natural"/"neural" voices and Google's
// bundled voices sound far better than the default first match.
function pickBestVoice(voices, prefix) {
  var candidates = voices.filter(function(v) { return v.lang.toLowerCase().startsWith(prefix); });
  if (candidates.length === 0) return null;
  var score = function(v) {
    var n = v.name.toLowerCase();
    var s = 0;
    if (n.indexOf('natural') !== -1 || n.indexOf('neural') !== -1) s += 4;
    if (n.indexOf('online') !== -1) s += 2;       // Edge online voices
    if (n.indexOf('google') !== -1) s += 3;       // Chrome bundled
    if (n.indexOf('premium') !== -1 || n.indexOf('enhanced') !== -1) s += 2;
    if (v.localService === false) s += 1;         // cloud-backed usually better
    return s;
  };
  candidates.sort(function(a, b) { return score(b) - score(a); });
  return candidates[0];
}

function speakWithBrowserTTS(text, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'en' ? 'en-US' : 'de-DE';
  utterance.rate = lang === 'en' ? 1.0 : 0.85;

  var voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    var voice = pickBestVoice(voices, lang === 'en' ? 'en' : 'de');
    if (voice) utterance.voice = voice;
  }

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

function speak(text, lang) {
  // Cloud first everywhere; per-platform legacy fallbacks preserved.
  speakWithCloudTTS(text, lang, function() {
    if (!isMobile || /Android/i.test(navigator.userAgent)) {
      speakWithGoogleTranslate(text, lang, function() {
        speakWithBrowserTTS(text, lang);
      });
    } else {
      speakWithBrowserTTS(text, lang); // iOS
    }
  });
}

export function cleanGermanForSpeech(text) {
  return text.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

export function speakGerman(text) {
  speak(cleanGermanForSpeech(text), 'de');
}

export function cleanEnglishForSpeech(text) {
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
  speak(cleanEnglishForSpeech(text), 'en');
}

// Preload browser voices — critical for iOS
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function() {
    window.speechSynthesis.getVoices();
  };
  if (isMobile) {
    var silentUtterance = new SpeechSynthesisUtterance('');
    silentUtterance.volume = 0;
    try { window.speechSynthesis.speak(silentUtterance); } catch(e) {}
  }
}
