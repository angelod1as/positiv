# POS-501 — Veteran branch in the rules quiz

## Decision taken (2026-08-19, with Angelo)

The probe screens are **three**:

1. `trigger` — "Você... tá legal?" — always first, always asked
2. two questions **drawn at random** from the other thirteen

A veteran falls into the full quiz when they got **both random probes wrong on
the first attempt**. `trigger` never counts: its only wrong answer is "não tô
100%", and per-question validation already refuses to advance past it, so it
cannot express a stumble — it expresses a decision to stop.

The draw reuses the deal the run already has (`rules-order.ts`), so a refresh
keeps the same two probes. Nothing new is persisted.

## Where the branch lives

`buildRulesFlow` is the only place the order of screens is decided. Today it
walks the dealt order and commits. It gains a veteran shape:

```
start  → trigger
trigger → probeA          (first non-trigger question in the dealt order)
probeA  → probeB          (second)
probeB  → commit          unless both probes were wrong on the first try
        → rest[0]         and then linearly through the remaining eleven
```

`next` stays free of side effects and reads a **missing** `firstTryCorrect`
entry as "did not stumble" — the contract in `flow.types.ts`, which
`projectPath` leans on to draw the progress count on every render. Only two
explicit `false`s lengthen the run. Reads are guarded (`context?.firstTryCorrect
?.[id] === false`), because the projection runs inside a `useMemo` with no
`try/catch`.

**Consequence worth naming:** the progress count reads "1 de 3" for a veteran
and jumps to fourteen the moment the second stumble is recorded. That is the
branch happening, and the ticket asks for no warning and no transition — so the
jump is the only thing the person sees. Nothing else announces it.

### Deviation from the ticket

The ticket suggests `isVeteran` should reach `flow.next` through
`FormRunner`'s `data`. It reaches `buildRulesFlow` as an argument instead,
because a veteran's flow **starts** on `trigger`, and `flow.start` is fixed when
the flow is built — `next` alone cannot move the first screen. The value still
comes from the loader either way.

## Server

`verify-rules-quiz.ts` today requires all fourteen answers to be present and
correct. With a short path that stops being true, so the route recomputes the
condition itself rather than believing anything the client sent:

- **not a veteran** → every question must be answered and correct, as today
- **veteran** → every answer that *is* present must be correct, `trigger` must
  be among them, and there must be at least three

A veteran walking the long path submits all fourteen and passes the same check.
A veteran cherry-picking three easy answers by hand also passes — which is what
"o servidor aceita o subconjunto" means, and is why the veteran condition itself
is recomputed from the database instead of trusted.

## Steps

Each step is one commit, red-green-refactor.

1. **`isVeteran` on the server**
   `app/business/participant/is-veteran.server.ts`, mirroring the
   `attended_events_count` subquery in `admin.server.ts:110`: rows with
   `attendance_status = 'attended'`, `application_status = 'finalised'`, event
   not `Cancelled`, excluding the event being applied to.
   Integration test: no rows → false; an attended finalised row → true; a
   cancelled event, an unfinalised application, and the current event itself →
   still false.

2. **Veteran shape in `build-rules-flow.ts`**
   Unit tests first, in `build-rules-flow.test.ts`: non-veteran unchanged;
   veteran starts on `trigger`; veteran with a clean run reaches `commit` after
   three screens; one stumble still commits; both stumbles walk the remaining
   eleven; a `firstTryCorrect` missing both entries projects the short path; a
   malformed context does not throw.

3. **`projectPath` over the veteran flow**
   A test in `project-path.test.ts` (or alongside the flow) proving the count is
   3 before any stumble and 14 after both — the POS-504 contract, checked
   against the real flow rather than a fixture.

4. **Loader and page**
   `event-rules-page.tsx`: the loader already resolves the user via
   `getUserContext`; it returns `isVeteran` from step 1. The page threads it
   into `buildRulesFlow`. Existing page tests stay green; one new test covers a
   veteran opening on `trigger`.

5. **Server accepts the subset**
   `verify-rules-quiz.ts` calls `isVeteran`, and validates per the rule above.
   Tests in `verify-rules-quiz.test.ts`: non-veteran sending three answers is
   rejected; veteran sending the three probes passes; veteran sending three
   answers with one wrong is rejected; veteran omitting `trigger` is rejected;
   veteran sending all fourteen passes.

6. **e2e — three paths**
   `EventApplicationPage.fillRulesForm` already loops until the route changes,
   so the short path needs no new walk. What is needed: a veteran fixture (an
   attended, finalised participation in an earlier event) and a walk that
   answers the two random probes wrongly once each before correcting them.
   - newcomer → fourteen screens
   - veteran, clean → three screens, then the event data page
   - veteran, both probes stumbled → keeps going past the third screen

7. **News dialog item** — `2026-08-19-quiz-mais-curto-para-veteranes.ts`

8. **`pnpm lint`, `pnpm test`, `pnpm test:e2e`**

## Open coupling

POS-509 (back button) is in flight in another worktree and will be rebased in
before merge. Its own acceptance criterion — "trocar a resposta ao voltar não
altera `firstTryCorrect`" — is what keeps this branch honest, and it is already
true of `runAdvance`, which writes a `firstTryCorrect` entry only when the
question has none.
