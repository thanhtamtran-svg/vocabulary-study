-- Enable Row-Level Security (RLS) on all tables.
--
-- Background: as of 2026-06-08 the project's tables had RLS disabled,
-- meaning anyone with the public anon key (which ships in the browser
-- bundle) could read or write every row in every table. Supabase
-- flagged this as a critical issue.
--
-- Strategy:
--   * Private tables (vocab_progress, push_subscriptions) — touched
--     only by edge functions which use the service-role key. Service
--     role bypasses RLS, so these get RLS enabled with NO policies.
--     That blocks all access via the anon/REST surface.
--   * Shared-content tables (vocab_images, vocab_ipa,
--     vocab_definitions, vocab_explanations, vocab_sentences) — the
--     browser reads these directly via PostgREST. They need a public
--     SELECT policy. Writes still go through edge functions only.

-- ===== Private tables: lock down completely =====
alter table public.vocab_progress       enable row level security;
alter table public.push_subscriptions   enable row level security;

-- ===== Shared-content tables: read-only for anon, write via edge functions =====
alter table public.vocab_images         enable row level security;
alter table public.vocab_ipa            enable row level security;
alter table public.vocab_definitions    enable row level security;
alter table public.vocab_explanations   enable row level security;
alter table public.vocab_sentences      enable row level security;

-- Public read policies. Use anon role explicitly so the policy applies
-- to unauthenticated requests (which is how the app calls these tables).
create policy "anon_read_vocab_images"
  on public.vocab_images for select to anon using (true);

create policy "anon_read_vocab_ipa"
  on public.vocab_ipa for select to anon using (true);

create policy "anon_read_vocab_definitions"
  on public.vocab_definitions for select to anon using (true);

create policy "anon_read_vocab_explanations"
  on public.vocab_explanations for select to anon using (true);

create policy "anon_read_vocab_sentences"
  on public.vocab_sentences for select to anon using (true);

-- No INSERT/UPDATE/DELETE policies for anon on any table. Writes are
-- only possible via edge functions (which use the service-role key
-- and bypass RLS).
