import { supabase } from './supabase';

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
  if (!supabase || !email) return null;
  var key = lang ? email + ':' + lang : email;
  var res = await supabase.from('vocab_progress').select('data').eq('user_email', key).single();
  if (res.error || !res.data) return null;
  return res.data.data;
}

export async function cloudPush(email, state, lang) {
  if (!supabase || !email) return false;
  var key = lang ? email + ':' + lang : email;
  var res = await supabase.from('vocab_progress').upsert({
    user_email: key,
    data: state,
    updated_at: new Date().toISOString()
  }, {onConflict: 'user_email'});
  return !res.error;
}
