-- Durable, cross-isolate rate limiting (B-022).
--
-- Problem: the edge functions counted requests in an in-memory Map.
-- Each Deno isolate has its own Map and isolates recycle constantly,
-- so the counter resets between requests — a burst of login attempts
-- spread across fresh isolates never tripped the limit. Verified live
-- 2026-07-14: 15 rapid unauthenticated calls, zero 429s. The real
-- exposure is verify-password brute-forcing.
--
-- Fix: keep the count in Postgres, shared by all isolates. This table
-- is private (RLS on, no policies) so only edge functions using the
-- service-role key can touch it — same pattern as vocab_progress.

create table if not exists public.rate_limits (
  bucket       text primary key,               -- e.g. "verify-password:1.2.3.4"
  count        int not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- No policies on purpose: anon/REST cannot read or write; only the
-- service-role key (edge functions) reaches this table.

-- Atomic check-and-increment. Returns TRUE when the request is allowed,
-- FALSE when it exceeds p_max within the p_window_seconds window.
-- The single upsert with RETURNING makes concurrent calls race-safe:
-- each caller sees a consistent post-increment count.
create or replace function public.check_rate_limit(
  p_bucket text,
  p_max int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits (bucket, count, window_start)
    values (p_bucket, 1, now())
  on conflict (bucket) do update
    set count = case
          when public.rate_limits.window_start
               < now() - make_interval(secs => p_window_seconds)
            then 1
          else public.rate_limits.count + 1
        end,
        window_start = case
          when public.rate_limits.window_start
               < now() - make_interval(secs => p_window_seconds)
            then now()
          else public.rate_limits.window_start
        end
  returning count into v_count;

  -- Opportunistic cleanup so the table can't grow without bound as new
  -- IPs appear. Cheap at this project's scale (single-user traffic).
  delete from public.rate_limits
    where window_start < now() - interval '1 day';

  return v_count <= p_max;
end;
$$;

-- Lock the function down to the service role only. Postgres grants
-- EXECUTE to PUBLIC by default, which would let the anon key (shipped in
-- the browser) call this RPC via PostgREST and inflate the counter for
-- someone else's bucket (e.g. "verify-password:<victim-ip>") to lock
-- them out, or spam arbitrary buckets to bloat the table. Only edge
-- functions (service-role key) should reach it.
revoke execute on function public.check_rate_limit(text, int, int)
  from public, anon, authenticated;

grant execute on function public.check_rate_limit(text, int, int)
  to service_role;
