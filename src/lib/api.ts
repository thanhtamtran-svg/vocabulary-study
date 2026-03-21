import { SUPABASE_URL, SUPABASE_KEY } from './supabase';

const EXPLAIN_URL = SUPABASE_URL + '/functions/v1/explain-word';

export async function fetchWordImage(germanWord, englishWord, wordType) {
  try {
    // First check cache via REST API (fast, no edge function call needed)
    // The image_base64 column may contain either:
    //   - A Storage URL (https://...) for new images
    //   - A base64 data URL (data:image/png;base64,...) for legacy images
    // Both work directly as <img src> values.
    var cacheRes = await fetch(SUPABASE_URL + '/rest/v1/vocab_images?word=eq.' + encodeURIComponent(germanWord.toLowerCase()) + '&select=image_base64', {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    if (cacheRes.ok) {
      var cacheData = await cacheRes.json();
      if (cacheData && cacheData.length > 0 && cacheData[0].image_base64) {
        return { url: cacheData[0].image_base64, credit: 'AI Generated', link: null };
      }
    }

    // Generate via edge function
    var res = await fetch(SUPABASE_URL + '/functions/v1/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: germanWord, english: englishWord, type: wordType || '' })
    });
    if (!res.ok) return null;
    var data = await res.json();
    if (data.image) {
      return { url: data.image, credit: 'AI Generated', link: null };
    }
    return null;
  } catch(e) {
    console.warn('Image fetch failed:', e);
    return null;
  }
}

export async function fetchIPAAndDefinition(germanWord, englishWord) {
  var key = germanWord.toLowerCase().trim();
  try {
    // Check both caches first
    var results = await Promise.all([
      fetch(SUPABASE_URL + '/rest/v1/vocab_ipa?word=eq.' + encodeURIComponent(key) + '&select=ipa', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      }).then(function(r) { return r.ok ? r.json() : []; }),
      fetch(SUPABASE_URL + '/rest/v1/vocab_definitions?word=eq.' + encodeURIComponent(key) + '&select=definition', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      }).then(function(r) { return r.ok ? r.json() : []; })
    ]);
    var cachedIpa = results[0]?.[0]?.ipa || null;
    var cachedDef = results[1]?.[0]?.definition || null;

    if (cachedIpa && cachedDef) return { ipa: cachedIpa, definition: cachedDef };

    // Generate missing via edge function
    var res = await fetch(SUPABASE_URL + '/functions/v1/generate-ipa-def', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: germanWord, english: englishWord })
    });
    if (!res.ok) return { ipa: cachedIpa, definition: cachedDef };
    var data = await res.json();
    return { ipa: data.ipa || cachedIpa, definition: data.definition || cachedDef };
  } catch(e) {
    return { ipa: null, definition: null };
  }
}

export async function fetchCachedExplanation(word) {
  var url = SUPABASE_URL + '/rest/v1/vocab_explanations?word=eq.' + encodeURIComponent(word.toLowerCase().trim()) + '&select=explanation';
  var res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    }
  });
  if (!res.ok) return null;
  var data = await res.json();
  if (data && data.length > 0) return data[0].explanation;
  return null;
}

export async function fetchExplanation(word, wordType) {
  const res = await fetch(EXPLAIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    body: JSON.stringify({ word: word, type: wordType || '' })
  });
  if (!res.ok) throw new Error('Failed to fetch explanation');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.explanation;
}
