-- Flashcard back side: example sentences + synonyms/antonyms (2026-10-17).
--
-- The German definition line ("Eine Person, die Sachen in einem Geschäft
-- an Kunden gibt.") was too hard for an A1 learner. The back now shows an
-- A1 example sentence (with an English translation on tap) and, when they
-- exist, synonyms/antonyms. One AI call per word, cached here forever.
--
-- Candidates are stored unfiltered: "same level" is decided client-side by
-- keeping only words that are in the current course's own word list, so
-- one row serves both the Schritte A1 and German 1500 courses.
--
-- Shared-content cache, same pattern as vocab_definitions (20260608):
-- the browser reads it directly (public SELECT), writes go through the
-- generate-ipa-def edge function (service-role key) only.

create table if not exists public.vocab_word_extras (
  word       text primary key,              -- lowercase German word, e.g. "der verkäufer"
  examples   jsonb not null default '[]',   -- [{"de": "...", "en": "..."}]
  synonyms   jsonb not null default '[]',   -- ["der Kunde", ...] German, nouns with article
  antonyms   jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.vocab_word_extras enable row level security;

create policy "anon_read_vocab_word_extras"
  on public.vocab_word_extras for select to anon using (true);
