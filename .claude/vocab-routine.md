# Vocab Addition Routine — Schritte Plus Neu A1.1

Established 2026-05-12. This document captures the default workflow for
adding new German A1.1 vocabulary to the project, so each addition
session can be fast and consistent.

## How it works in one sentence

User pastes a list of German words → I extract, classify, dedupe, and
show a preview table → user approves → I edit the file, build, commit,
and push (which auto-deploys to GitHub Pages).

## Trigger

Any message from the user that contains a list of German words is
treated as a vocab addition request. No special phrase needed.

The input may be:
- Plain text (`der Apfel — quả táo`, `Apfel = apple`, etc.)
- A screenshot / image with vocab tables
- A mix of formats — handle each entry independently

If the input is genuinely ambiguous (e.g. only one or two words, or
non-vocab content mixed in), confirm before starting the routine.

## Default decisions (do not re-ask each time)

These are pre-approved by the user. Apply them automatically.

| Decision | Default |
|---|---|
| **Translation source language** | Assume Vietnamese; convert to English in the file. |
| **Target file** | `src/vocab-a11-data.ts` (Schritte Plus Neu A1.1 variant). |
| **Duplicate handling (within A1.1 file)** | Silently skip words already in `src/vocab-a11-data.ts`. List skipped words in the summary, no need to ask per-word. |
| **Duplicate handling (cross-file)** | Cross-file matches don't block adding to A1.1. If a word is in `src/vocab-data.ts` but NOT in `src/vocab-a11-data.ts`, **add it to A1.1 anyway** so the A1.1 variant stays self-contained. Only pause and ask if the existing translation in `vocab-data.ts` looks like it might mean something different from what you'd write for A1.1 — e.g. different sense ("Bank" = bench vs. financial bank), different gender, or a translation that would confuse the A1.1 learner. |
| **Lektion classification** | Trust textbook themes (rooms → L4, shopping → L3, daily routine → L5, leisure → L6, school → L7, etc.). Do not override to "current Lektion". The app naturally pulls back to any Lektion with unlearned words, so urgent additions surface in the next session anyway. |
| **Word type (typeIdx)** | Classify based on the word: 0=Noun, 1=Verb, 2=Adjective, 3=Grammar, 4=Expression (multi-word phrases / sentences), 5=Foundational (single-word adverbs, connectors, time words). |
| **Insertion location** | Append at the end of each Lektion's section in the file, preceded by a `// Additional <theme>` comment. |
| **Commit + push** | After preview approval: edit → build → commit → push, all without re-asking. The auto-deploy workflow at `.github/workflows/deploy.yml` publishes to GitHub Pages automatically. |
| **Commit message format** | "Add N A1.1 vocabulary words across Lektion X–Y" with a per-Lektion breakdown in the body. Co-authored by Claude. |

## The one editorial gate

Approval of the **preview table** is the user's only required
confirmation per batch. Before showing the preview, never edit the
file. After the user says "yes" (or equivalent), proceed through edit
→ build → commit → push without further prompts.

## Steps I follow

1. **Extract** — parse the user's input into `(german, english_or_vietnamese)`
   pairs. For screenshots, OCR the German + meaning columns.
2. **Translate** Vietnamese → English for each entry. Use natural,
   simple English suitable for an A1.1 learner.
3. **Classify** each word:
   - Which Lektion does it thematically belong to? (1–7)
   - What word type? (0–5, see table above)
4. **Dedupe** — grep `src/vocab-a11-data.ts` for each German word.
   Words already present in A1.1 go into the "skipped duplicates" list.
   Then grep `src/vocab-data.ts` (main 1500-word file). A cross-file
   match does NOT skip the word — **still add it to A1.1** so the
   variant is self-contained. Only pause to ask if the existing
   translation in `vocab-data.ts` appears to mean something different
   from what you'd write for A1.1 (different sense, gender, or
   A1.1-inappropriate phrasing).
5. **Show preview table** — one row per new word, grouped by Lektion.
   Include a "skipped duplicates" section so the user can spot
   misclassifications.
6. **Wait for approval** — never skip this step.
7. **Edit** `src/vocab-a11-data.ts`. Use `Edit` tool with anchors at
   the end of each Lektion section (just before the `// ===== Cat N+1:`
   marker or the closing `],` of the words array for Lektion 7).
8. **Build** — `npm run build`. If it fails, fix and retry; never
   commit a broken build.
9. **Commit** with the message format above. Then push.
10. **Summarize** for the user: words added per Lektion, duplicates
    skipped, total entries before → after, build status, deploy status.

## Edge cases that DO warrant a pause

Pause and ask the user if:

- **Translation is ambiguous** — German word has multiple common
  meanings and Vietnamese context doesn't clarify (e.g. `umziehen` =
  "to move house" OR "to change clothes" — flag both, ask which to
  use, or include both in the English field separated by " / ").
- **Lektion classification is unclear** — word fits multiple lessons
  equally well. Default to your best guess but mention alternatives.
- **A cross-file duplicate has a divergent meaning** — the word
  already exists in `vocab-data.ts` (main course) AND the existing
  translation appears to mean something different from what you'd
  write for A1.1 (different sense, gender, A1.1-inappropriate
  phrasing). Flag the divergence; let the user decide which
  translation to use in A1.1. Cross-file duplicates with matching
  meanings are added to A1.1 without pausing (so the variant stays
  self-contained for any learner who only uses A1.1).
- **The input contains non-vocab content** — sentences for grammar
  examples, exercise instructions, etc. Confirm intent before adding.
- **An entry would break exercise generation** — e.g. multi-word
  entries with `?`, `:`, or special characters that the validators
  reject (though after commit `01e723b` most of these now pass).

## What changes in conversation feel

A typical future batch should look like this:

> **User:** [pastes list of words or screenshot]
>
> **Me:** Extracted N words. Here's the preview: [table]. M duplicates
> skipped. Ready to add?
>
> **User:** Yes
>
> **Me:** Done — N words added, build passed, committed (`<sha>`) and
> pushed. Live in ~2 min via auto-deploy.

Target: under 5 minutes end-to-end for a batch of ~30–50 words.

## When to revisit this routine

If any of these become true, propose upgrading from this codified
routine to a CLI script or in-app admin UI:

- Vocab batches happen daily (frequent enough that 5 minutes per batch
  becomes a noticeable cost).
- Batches regularly exceed 100 words (preview tables get unwieldy).
- The user wants to add vocab without me (e.g. from their phone, or
  when offline).
- The vocab source becomes structured enough that automation would be
  faster than the conversation flow (e.g. always exported from the
  same spreadsheet).

Until then, this routine is intentionally lightweight.
