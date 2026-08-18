# POS-484 — Migrate the rules quiz to the form runtime

https://linear.app/positiv/issue/POS-484/migrar-o-quiz-de-regras-para-o-novo-runtime

## What ships

`app/pages/events/application/rules/event-rules-page.tsx` stops being a
remix-forms/RHF hybrid and becomes a `FormRunner` flow: one question per screen,
per-question validation that blocks advancing, persistence across a refresh, and
a server that revalidates before it lets anyone through.

The quiz is **linear** — everybody answers all 14 questions. The veteran branch
left this ticket and became POS-501, last in the queue.

## Why the hydration hack can go

Today `clientLoader` + `HydrateFallback` exist for one reason: the questions are
shuffled with `Math.random()`, so server HTML never matches client HTML.

With the runtime that disappears for free. `useFormRuntime` starts
`isRestored: false` whenever persistence is on, and `FormRunner` draws a
`Skeleton` until the post-mount restore lands. The server renders the skeleton,
the first client render renders the same skeleton, and the shuffled questions
only appear on the render after mount. Nothing shuffled is ever hydrated.

This is load-bearing: **the deletion of `clientLoader` depends on persistence
being enabled on this form.** If persistence were off, `isRestored` starts true
and the mismatch comes back.

## Shape

```
app/components/forms/custom/rules/
  rules-questions.tsx      unchanged — 14 questions, one of them event-type aware
  build-rules-questions.ts NEW: getRulesFormQuestions -> Question[] (shuffled)
  rules-form-schema.tsx    kept, reshaped: one schema per question id
  shuffle-questions.ts     folded into build-rules-questions.ts
  single-select.tsx        DELETED — the runtime's default renderer draws radios
  multiple-select.tsx      DELETED — and checkboxes

app/pages/events/application/rules/
  event-rules-page.tsx     loader + action + FormRunner, no clientLoader
```

`SingleSelect`/`MultipleSelect` are RHF-`control`-bound and have no caller
outside this page. `render-question.tsx` already draws `radio` and `checkbox`
groups with accessible names, so no custom `renderQuestion` is needed.

Question kind follows today's rule: one correct answer -> `radio`, more than one
-> `checkbox`.

## Server revalidation

The action stops trusting the client:

```ts
// today
session.set("rulesCorrect", true)   // unconditional
```

New shape: parse the submitted answers, rebuild the schemas from
`getRulesFormSchema(eventType)` — keyed by question id, so shuffling is
irrelevant — validate every question, and

- invalid: respond `{ ok: false, errors: [{ questionId, message }] }` as JSON,
  no cookie
- valid: set `rulesCorrect`, fire `trackServerEvent("rules_quiz_passed")`,
  respond `{ ok: true }`

The commit step turns that JSON into a `CommitResult`; the runtime already routes
each rejected question back to its own screen with the server's message, and
`onDone` navigates to `EVENT_DATA(id)`.

A bare POST with no answers now fails validation for all 14 questions instead of
passing.

## Steps

Each step is red first, then green, then a commit. Steps 1-6 are pure logic and
need no component mounted.

| # | Step | What the test proves |
|---|---|---|
| 1 | `buildRulesQuestions(eventType)` returns 14 `Question`s with stable ids | ids match `getRulesFormQuestions` keys |
| 2 | one correct answer -> `radio`, several -> `checkbox`, options carry every answer | the input kind is derived, not configured |
| 3 | questions and options come back shuffled, and every call is a fresh order | shuffling survives the move |
| 4 | each question carries its own schema, and it rejects the wrong answer with today's message | `"Você escolheu a resposta errada"` et al. survive per question |
| 5 | `buildRulesFlow(questions)` walks every question once, in order, then `done` | the flow is linear |
| 6 | the flow ends with a `commit` step, and a rejection routes back to the right question | the commit contract is wired |
| 7 | action rejects a POST with no answers | the bypass is closed |
| 8 | action rejects a POST with one wrong answer, naming that question | server errors map to question ids |
| 9 | action accepts a fully correct POST, sets `rulesCorrect`, tracks the event | the happy path still opens the gate |
| 10 | page renders one question at a time, wrong answer shows inline and does not advance | the ticket's core UX |
| 11 | page keeps `RulesText` above the card while the quiz runs | rereading the rules survives |
| 12 | first screen does not steal focus; later screens do | the page does not open scrolled past the rules |
| 13 | a refresh mid-quiz resumes on the same question with answers intact | persistence is actually wired |
| 14 | `?q=n` mirrors the current step, and back walks the flow backwards | browser back inside one route |
| 15 | `?q=n` pointing past the first unanswered question clamps back to it | no deep-linking to the end |
| 16 | `clientLoader`, `HydrateFallback`, `SingleSelect`, `MultipleSelect` are gone | the cleanup half of the ticket |
| 17 | e2e: the application flow answers the quiz one screen at a time | the journey still completes |

### Step 14-15 needs a runtime change

`FormRunner` owns the runtime and exposes nothing about the current step, so
`?q=n` cannot be built from the page as it stands. Two ways:

**Decided: option A.** `FormRunner` gains `initialStepId?` and `onStepChange?`,
so every later form gets URL sync for free. The page stays thin — it does not
reimplement the skeleton, the `onDone` guard or the restore gate.

**Decided: the URL wins on load when it is valid**, clamped by step 15's rule.
Only when it is absent or out of range does the stored step decide.

## Commit plan

```
1  test(rules): describe the question builder            (red 1-2)
2  feat(rules): build runtime questions from the quiz    (green 1-2)
3  test(rules): describe shuffling and per-question schemas (red 3-4)
4  feat(rules): shuffle and carry one schema per question (green 3-4)
5  refactor(rules): fold shuffle-questions into the builder
6  test(rules): describe the linear flow and its commit  (red 5-6)
7  feat(rules): build the quiz flow                      (green 5-6)
8  test(rules): describe the action revalidating answers (red 7-9)
9  fix(rules): revalidate the quiz before opening the gate (green 7-9)
10 test(rules): describe the one-question-per-screen page (red 10-11)
11 feat(rules): run the quiz through the form runtime    (green 10-11)
12 test(runtime): describe the first screen keeping focus (red 12)
13 fix(runtime): leave focus alone on the first screen   (green 12)
14 test(rules): describe resuming after a refresh        (red 13)
15 feat(rules): persist the quiz run                     (green 13)
16 test(runtime): describe step changes reaching the page (red 14)
17 feat(runtime): report and accept the current step     (green 14)
18 test(rules): describe q= clamping to the first gap    (red 15)
19 feat(rules): mirror the step in the url               (green 15)
20 refactor(rules): drop the hydration workaround and the RHF selects
21 test(e2e): answer the quiz one screen at a time
22 feat(news): announce the new quiz
```

## Definition of done

- `pnpm lint`, `pnpm test`, `pnpm test:e2e` green across the project
- no hydration warning against a **production build**, not just `pnpm dev`
- news dialog updated and `NEWS_VERSION` bumped — this is a visible change for
  every applicant
- this plan deleted before the PR

## Decisions taken

1. **Step 14: option A** — `initialStepId?` / `onStepChange?` on `FormRunner`.
2. **URL first when valid**, stored step otherwise.
3. **The `keepOnDone` flag from POS-494 stays exactly as it is.** Pasting it into
   `sessionStorage` by hand is a workable way in for the people who test this
   manually, so no `VITE_` variable is added and nothing about it is touched.
4. **`rulesSessionStorage` stays.** The cookie and its loader guard only die in
   POS-487, when the quiz, the consent and the application share one runtime.
