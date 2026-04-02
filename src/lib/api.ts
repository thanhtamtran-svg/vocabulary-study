import { SUPABASE_URL, SUPABASE_KEY } from './supabase';

const EXPLAIN_URL = SUPABASE_URL + '/functions/v1/explain-word';

// In-memory request caches (session-lifetime, no TTL)
const imageCache = new Map<string, { url: string; credit: string; link: string | null } | null>();
const ipaDefCache = new Map<string, { ipa: string | null; definition: string | null }>();
const cachedExplanationCache = new Map<string, string | null>();
const explanationCache = new Map<string, string>();

// Check cache only — no API generation (fast, free)
export async function fetchWordImage(germanWord, englishWord, wordType) {
  var cacheKey = germanWord.toLowerCase().trim();
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);
  try {
    var cacheRes = await fetch(SUPABASE_URL + '/rest/v1/vocab_images?word=eq.' + encodeURIComponent(germanWord.toLowerCase()) + '&select=image_base64', {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    if (cacheRes.ok) {
      var cacheData = await cacheRes.json();
      if (cacheData && cacheData.length > 0 && cacheData[0].image_base64) {
        var cachedResult = { url: cacheData[0].image_base64, credit: 'AI Generated', link: null };
        imageCache.set(cacheKey, cachedResult);
        return cachedResult;
      }
    }
    return null;
  } catch(e) {
    console.warn('Image cache check failed:', e);
    return null;
  }
}

// Generate image via API — only called when user taps "Generate Image" button
export async function generateWordImage(germanWord, englishWord, wordType) {
  var cacheKey = germanWord.toLowerCase().trim();
  try {
    var res = await fetch(SUPABASE_URL + '/functions/v1/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: germanWord, english: englishWord, type: wordType || '' })
    });
    if (!res.ok) return null;
    var data = await res.json();
    if (data.image) {
      var genResult = { url: data.image, credit: 'AI Generated', link: null };
      imageCache.set(cacheKey, genResult);
      return genResult;
    }
    return null;
  } catch(e) {
    console.warn('Image generation failed:', e);
    return null;
  }
}

export async function fetchIPAAndDefinition(germanWord, englishWord) {
  var key = germanWord.toLowerCase().trim();
  if (ipaDefCache.has(key)) return ipaDefCache.get(key);
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

    if (cachedIpa && cachedDef) {
      var result = { ipa: cachedIpa, definition: cachedDef };
      ipaDefCache.set(key, result);
      return result;
    }

    // Generate missing via edge function
    var res = await fetch(SUPABASE_URL + '/functions/v1/generate-ipa-def', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: germanWord, english: englishWord })
    });
    if (!res.ok) {
      var fallback = { ipa: cachedIpa, definition: cachedDef };
      ipaDefCache.set(key, fallback);
      return fallback;
    }
    var data = await res.json();
    var genResult = { ipa: data.ipa || cachedIpa, definition: data.definition || cachedDef };
    ipaDefCache.set(key, genResult);
    return genResult;
  } catch(e) {
    return { ipa: null, definition: null };
  }
}

export async function fetchCachedExplanation(word, lang?) {
  var prefix = lang === 'en' ? 'en:' : '';
  var cacheKey = prefix + word.toLowerCase().trim();
  if (cachedExplanationCache.has(cacheKey)) return cachedExplanationCache.get(cacheKey);
  var url = SUPABASE_URL + '/rest/v1/vocab_explanations?word=eq.' + encodeURIComponent(cacheKey) + '&select=explanation';
  var res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    }
  });
  if (!res.ok) return null;
  var data = await res.json();
  if (data && data.length > 0) {
    cachedExplanationCache.set(cacheKey, data[0].explanation);
    return data[0].explanation;
  }
  cachedExplanationCache.set(cacheKey, null);
  return null;
}

export async function fetchExplanation(word, wordType, lang?) {
  var prefix = lang === 'en' ? 'en:' : '';
  var cacheKey = prefix + word.toLowerCase().trim();
  if (explanationCache.has(cacheKey)) return explanationCache.get(cacheKey);
  const res = await fetch(EXPLAIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    body: JSON.stringify({ word: word, type: wordType || '', lang: lang || 'de' })
  });
  if (!res.ok) throw new Error('Failed to fetch explanation');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  explanationCache.set(cacheKey, data.explanation);
  return data.explanation;
}
