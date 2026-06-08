# Definition of Done

Established 2026-06-08. The checklist Claude must run through before
calling work "done." Not a process to slow things down — a memory aid
so the same kind of bug doesn't bite twice.

## Why this exists

This is a solo project: there's no second engineer to catch mistakes
in review. Auto-deploy means a bad commit reaches the live PC and
phone within ~2 minutes. The 2026-05-29 streak/sync incident showed
how a small sync logic regression can silently destroy days of work.
DoD makes the checks explicit so they don't get skipped under time
pressure.

## How to apply

Every task fits into one of three tiers based on what it touches.
Higher tier inherits all checks from lower tiers.

The user is non-technical and won't track this. Claude is the one
who walks through the checklist before reporting completion. When in
doubt, pick the higher tier.

---

## Tier 1 — Every commit (always)

- [ ] `npm run build` passes — no TypeScript errors, no Vite errors.
- [ ] `npm test` passes — all existing tests still green.
- [ ] No hardcoded secrets — no API key, password, email, or token
      in code that gets committed. Service-role keys belong in env
      vars only.
- [ ] No accidental `console.log` left in shipped code (debug-only
      logs are fine in scripts/).
- [ ] Commit message explains *why* the change exists, not just what.
- [ ] Changes are pushed to `main` (no dangling local-only work).
- [ ] Claude has verified the change actually matches what the user
      asked for — not just "code compiles" but "code does what the
      user wanted."
- [ ] **[CHANGELOG.md](CHANGELOG.md) updated** with a user-friendly
      entry under today's date (skip for trivial typo / comment /
      format-only commits). Use plain language, not commit message
      jargon.
- [ ] **[PRODUCT_BACKLOG.md](PRODUCT_BACKLOG.md) updated** if the
      commit completed a backlog item (move to "Completed" section)
      or revealed a new one (add to the right priority bucket).

## Tier 2 — User-facing UI or behavior change

Inherits Tier 1, plus:

- [ ] Verified live on PC after auto-deploy (~2 min wait, then hard
      refresh).
- [ ] Verified live on phone if the change touches:
      - Flashcard layout / Browse view / Settings view
      - PWA / service worker / install prompt
      - Anything that renders differently on small screens
- [ ] One-sentence user-facing explanation: "before X → after Y."
- [ ] No regression in a related screen (e.g. if Flashcard changes,
      check Browse view still renders the word correctly).

## Tier 3 — Data, sync, security, or database

Inherits Tier 2, plus:

- [ ] **Regression test written and passing.** The exact scenario
      that triggered (or could trigger) the bug becomes a test in
      `src/**/*.test.ts`. Examples of code paths in this tier:
      `mergeProgress`, `dailyStreak`, `migrateProgress*`, anything
      under `supabase/functions/`, anything touching `cloud_*` or
      `vocab_progress`.
- [ ] **Cloud state inspected before and after.** Pull current
      Supabase row, note relevant fields. After the change is live,
      verify those fields look correct.
- [ ] **Edge cases enumerated:** what happens if user is offline?
      If data is mid-migration? If multiple devices race? If the
      relevant field is missing from the remote? At least one of
      these must have a written-down answer.
- [ ] **Rollback path exists.** The commit is revertable. No data
      is destroyed. If a migration is involved, there is either an
      inverse migration or a documented manual rollback.
- [ ] **Trade-off statement included** when reporting completion:
      what can break, who/what is at risk, how to detect it.

## Tier 3-Security — Anything touching auth, secrets, or RLS

Inherits Tier 3, plus:

- [ ] **Threat model written out before coding.** Who is the
      attacker (random internet stranger? curious user? compromised
      device?), what can they do today, what should they not be
      able to do after the change. Skip this and code first → easy
      to miss the actual threat.
- [ ] **Public probe.** After deploy, simulate the attacker with
      `curl` and verify they can't do what they shouldn't. Don't
      assume RLS or auth checks work — verify them live.
- [ ] **Secrets in env vars only.** Never in code, never in commit
      messages, never in chat history that gets logged.
- [ ] **No new public endpoint without auth or rate-limit.** Every
      new edge function or REST endpoint must either require a
      session token or have a per-IP rate limit (or both).
- [ ] **Existing security guarantees not weakened.** RLS still on,
      CORS allowlist still tight, session-token rotation still
      works.
- [ ] **Logged in security audit memory.** Add a brief note to
      [streak/sync history](C:\Users\ASUS\.claude\projects\e--Projects-vocabulary-study\memory\project_streak_sync_history.md)
      or a new security memory so the pattern is searchable later.

## What's not in scope (yet)

Things we *could* add but deliberately keep out for now to avoid DoD
becoming a checklist no one follows:

- Performance budgets (no perf-critical paths yet).
- Accessibility audit (single user, who can see the screen).
- Cross-browser testing (Chrome on both devices).
- E2E tests (Vitest unit tests are enough for the data layer; UI is
  verified manually).

These get added only when the project hits a scale or shape that
justifies them.

## How tests get written

- Test files live next to the code they test: `foo.ts` →
  `foo.test.ts`.
- Run with `npm test` (one-shot) or `npm run test:watch` (re-runs
  on save).
- Test framework is Vitest — same Vite config, no extra setup.
- Test the pure functions, not the React components. UI is verified
  on real devices (see Tier 2).
- Each Tier 3 fix should land with at least one new test that
  *would have caught the bug being fixed*. If the bug couldn't have
  been caught by a unit test (e.g. it was a UI rendering issue),
  document why no test was added.

## When DoD changes

The user can edit this file directly. If a tier check becomes more
trouble than it's worth, lower it. If a new class of bug emerges,
add a check. DoD is a tool, not a contract.
