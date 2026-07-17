-- TTS audio cache bucket (voice upgrade, 2026-07-17).
--
-- Stores MP3s synthesized once per (voice, text) by the `tts` edge
-- function. Public read: pronunciations of vocabulary words are not
-- sensitive, and a public URL lets the <audio> element stream straight
-- from storage with normal browser HTTP caching. Writes only via the
-- edge function (service role); no INSERT/UPDATE/DELETE policies for
-- anon, same model as vocab-images.

insert into storage.buckets (id, name, public)
values ('tts-audio', 'tts-audio', true)
on conflict (id) do nothing;
