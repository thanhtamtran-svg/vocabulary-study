export function speakGerman(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'de-DE';
  utterance.rate = 0.85;
  // Try to find a German voice
  var voices = window.speechSynthesis.getVoices();
  var deVoice = voices.find(function(v) { return v.lang.startsWith('de'); });
  if (deVoice) utterance.voice = deVoice;
  window.speechSynthesis.speak(utterance);
}

// Preload voices (needed on some browsers)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = function() { window.speechSynthesis.getVoices(); };
}
