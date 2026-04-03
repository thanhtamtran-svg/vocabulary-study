import { SUPABASE_URL } from './supabase';

var SYNC_URL = SUPABASE_URL + '/functions/v1/sync-progress';

export function mergeProgress(local, remote) {
  var merged = {...local};
  Object.keys(remote).forEach(function(k) {
    if (!merged[k]) { merged[k] = remote[k]; return; }
    var lReviews = merged[k].reviews || [];
    var rReviews = remote[k].reviews || [];
    var allReviews = lReviews.slice();
    rReviews.forEach(function(rr) {
      var dup = allReviews.some(function(lr) { return lr.date === rr.date && lr.type === rr.type; });
      if (!dup) allReviews.push(rr);
    });
    merged[k] = {
      learned: merged[k].learned || remote[k].learned,
      confidence: Math.max(merged[k].confidence || 0, remote[k].confidence || 0),
      lastReview: merged[k].lastReview > remote[k].lastReview ? merged[k].lastReview : remote[k].lastReview,
      reviews: allReviews
    };
  });
  return merged;
}

export async function cloudPull(email, lang) {
  if (!email) return null;
  try {
    var res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pull', email: email, lang: lang })
    });
    if (!res.ok) return null;
    var json = await res.json();
    return json.data || null;
  } catch (e) {
    return null;
  }
}

export async function cloudPush(email, state, lang) {
  if (!email) return false;
  try {
    var res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'push', email: email, lang: lang, data: state })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
