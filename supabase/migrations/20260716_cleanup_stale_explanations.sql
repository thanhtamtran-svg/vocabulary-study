-- B-019 part 2: purge stale OLD-format German explanations.
--
-- Background: the German AI-teacher prompt changed on 2026-06-23 (new
-- ÖSD A1 format). Rows saved under the old format (headings "Key
-- Grammar Point" / "Word Family") could not be deleted from the client
-- (RLS blocks anon DELETE — by design), so ~300 of them lingered. The
-- client already refuses to display them and regenerates on demand, so
-- deleting is purely garbage collection: each row regenerates with the
-- new format the next time its word's "Explain" is clicked.
--
-- English (en:) and Vietnamese (vi:) rows are untouched.

DELETE FROM public.vocab_explanations
WHERE word NOT LIKE 'en:%'
  AND word NOT LIKE 'vi:%'
  AND (
    explanation LIKE '%## Key Grammar Point%'
    OR explanation LIKE '%Word Family%'
  );
