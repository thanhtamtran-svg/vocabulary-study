# Communication Guide

How to communicate with me on this project.

## Who I am

I'm the **project manager** for vocabulary-study, not an engineer. I make
product and direction decisions; I rely on you (the AI assistant or any
collaborator) to translate those into technical work and to flag when a
technical reality should change my decision.

When you explain things to me, assume:

- I understand the product (a German/English vocabulary study app) and
  what users do with it.
- I do **not** read code fluently. I can recognize file names, follow
  high-level descriptions, and reason about features — but I will not
  understand jargon, type signatures, or framework internals without
  plain-language explanation.
- I care about **outcomes** (does the user see the right thing? does
  this last? does it scale?), not implementation details.

## How to explain things to me

- **Plain language first.** If you must use a technical term, define it
  on first use, in one short sentence. Example: "a validator (the piece
  of code that checks user input is safe before saving it)".
- **Use analogies and before/after examples** when describing how code
  behaves. "Before this change, the app said X. After, it says Y."
- **Avoid jargon dumps.** No bare references to frameworks, types,
  hooks, refs, or syntax unless you're explaining what they do in
  context.
- **File and line references are welcome** as `[name](path#Lline)` —
  I won't read the code, but they let me click through if I'm curious
  or want to share with someone technical.

## How to ask me questions

- **Ask whenever you're uncertain.** I'd rather answer a clarifying
  question than discover later that you assumed something I didn't
  mean. Don't proceed on a guess for anything that affects the product,
  the user experience, or is hard to reverse.
- **Don't assume.** If my request is vague ("fix the exercise screen"),
  ask which part, what behavior I want, and what success looks like.
- **Frame technical questions in product terms.** Instead of "should I
  use a useEffect or useMemo?", ask "should this run every time the
  page loads, or only when the word changes?"
- **One question at a time is fine.** Batching is fine when the
  questions are clearly related. Don't ask four unrelated things in one
  message.

## How to make recommendations

When you propose an approach, I want to see:

1. **Your recommendation, up front, in one sentence.** "I recommend
   doing X."
2. **A short trade-off comparison** of the realistic alternatives. A
   table or bulleted list comparing options on what actually matters:
   effort, risk, long-term maintainability, user impact, reversibility.
3. **Why your recommendation wins** in one or two sentences, grounded
   in those trade-offs.

Example shape:

> I recommend **Option B** (refactor the validator).
>
> | Option | Effort | Long-term cost | User impact |
> |---|---|---|---|
> | A: patch the symptom | 10 min | High — same bug returns | Low |
> | B: refactor the validator | 1 hour | Low — covers all cases | Medium |
> | C: rewrite from scratch | 1 day | Lowest, but risky now | High during rollout |
>
> B is the right call because the symptom in A will resurface every
> time we add a new word type, and C is more risk than we need today.

## My priorities

- **Sustainable and scalable over quick wins.** I would rather invest
  more time now in a solution that holds up as the app grows than ship
  a patch that I'll have to revisit. If you're choosing between a
  shortcut and a clean fix, default to the clean fix and tell me what
  it costs.
- **Tell me when a quick win is genuinely the right call** (e.g.,
  experimental feature, throwaway code) — but explain why, and what
  the eventual sustainable version would look like.
- **Flag tech debt and shortcuts honestly.** If you ship something
  partial, say so plainly and tell me what's left.
- **No silent assumptions about scope.** If my request implies a
  larger change than I might realize ("rename this field" → "but it's
  used in 40 places and the database column too"), surface that before
  doing the work.

## What I expect at the end of a task

- A **plain-language summary** of what changed and why.
- An honest note on **what's verified vs. unverified** (e.g., "build
  passes, but I couldn't test in the browser").
- **Next steps or open questions**, if any.
- File/line references for anything I might want to look at later.

## What to avoid

- Long technical explanations without a plain-language summary first.
- Acting on guesses about my intent. Ask.
- Shipping "temporary" fixes without naming them as such.
- Telling me the work is done when only part is done.
