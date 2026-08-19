# POS-509 — Back button in the form runtime

## Problem

One question per screen and no way back. A reader who mis-clicked an
alternative on screen 6 of the 14-screen rules quiz depends on the browser's
back button, which nothing in the form acknowledges. The way back belongs to
the runtime (`app/components/forms/runtime/presentations/`), so every migrated
form inherits it, exactly as the progress indicator from POS-504 does.

## Decisions taken with Angelo

1. **First screen shows no back button at all.** Continue takes the whole row
   there and shares it from the second screen on.
2. **The previous step comes from re-projecting the path**, not from a stack of
   visited steps. `projectPath` already feeds the progress indicator; the
   previous step is the entry before the current one on that same path. It
   costs no change to persistence, survives a refresh for free, and stays
   faithful across branches because `firstTryCorrect` is frozen once written.
3. **Going back replaces the url entry** instead of pushing one. The browser's
   history does not grow while the reader walks backwards, and the browser's
   own back button keeps moving backwards rather than being turned into a
   forward button. The cost, accepted: the first browser-back press right after
   an in-form back lands on the entry the runtime is already showing and does
   nothing.

## What already holds

- `firstTryCorrect` is written only for a question with no entry yet
  (`!(question.id in firstTryRef.current)`), so re-answering after going back
  cannot reopen it. This ticket adds the test that pins it, not the guard.
- `currentStepId` is already persisted on every change, so a step reached by
  going back survives a refresh with no new persisted field.
- `canShow` still refuses a step whose questions are unanswered, so nothing
  here opens a way to skip forward.

## Steps

### 1. Runtime knows where back leads

`app/components/forms/runtime/use-form-runtime.ts`

- Lift the projected path out of the `progress` memo into its own memo (same
  `projectPath(...)` call, same commit-step filter), and derive both `progress`
  and the previous step from it.
- Expose `canGoBack` (there is an entry before the current one) and `goBack`.
- `goBack` moves `stepRef`/`currentStepId` to that entry and clears
  `formError` — a "could not save" message belongs to the screen that failed,
  not to the one before it. Per-question errors stay put: each belongs to its
  own question and the reader will meet it again on the way forward.
- `goBack` does nothing while a commit is in flight, when done, or on the first
  screen. It never validates and never writes `firstTryCorrect`.
- Add `lastMove` state, `"forward" | "back"`: `goBack` sets `"back"`,
  `runAdvance` sets `"forward"` as it starts. Nothing else touches it.

Tests (`use-form-runtime.test.ts`, red first):

- `canGoBack` is false on the first screen and true after advancing.
- `goBack` shows the previous step with its answer still in `answers`.
- Re-answering after `goBack` leaves `firstTryCorrect` untouched.
- `goBack` on the first screen is a no-op.
- `goBack` clears `formError`.

Commit: `feat(form-runtime): expose the previous step and a way to go back`

### 2. The button

- `app/copy/forms.ts`: add `back: "Voltar"` to `formRuntimeCopy`.
- `presentation.types.ts`: add `canGoBack: boolean` and `onBack: () => void`.
- `one-at-a-time.tsx`: wrap the submit button in a row. When `canGoBack`, a
  `type="button"` outline button sits to its left at `w-1/6` (≈17%, inside the
  10–20% the ticket asks for) with the continue button on `flex-1`. The glyph
  is an `aria-hidden` `ArrowLeft` from lucide; the accessible name is a real
  `sr-only` "Voltar", not an `aria-label` on the icon. Disabled while busy.
- `all-at-once.tsx`: ignores both props — a single screen has nowhere to go
  back to.
- `form-runner.tsx`: hand the presentation `canGoBack` and `onBack`.

Tests (new `presentations/one-at-a-time.test.tsx`, driven through `FormRunner`
like the existing runner tests):

- No button named "Voltar" on the first screen.
- After advancing, the button is there, found by its accessible name.
- Clicking it shows the previous question with the answer still filled in.
- `AllAtOnce` never draws it.

Commit: `feat(form-runtime): draw a back button beside continue`

### 3. The caller learns which way the run moved

`app/components/forms/runtime/form-runner.tsx`

- `onStepChange` becomes `(stepId, { direction: "forward" | "back" })`,
  reading `direction` from the runtime's `lastMove`.
- Report only when the step actually differs from the one last reported, held
  in a ref. Without it, `lastMove` flipping on a failed advance would re-report
  a step that never changed, and the rules page would write a second url entry
  for it.
- Update the two existing assertions in `form-runner-step-sync.test.tsx`, and
  add one: going back reports `direction: "back"`.

Commit: `feat(form-runtime): tell the caller which way the run moved`

### 4. The rules page writes the url accordingly

`app/pages/events/application/rules/event-rules-page.tsx`

- `replace: direction === "back" || !mirrored`.
- The `askedFor` guard needs no change: a replace is not a `POP`, so the step
  the reader asked for is untouched and the page's own write is still not
  handed back as an instruction.

Commit: `fix(rules): replace the url entry when the reader goes back`

### 5. News dialog

`app/components/organisms/news-dialog/items/2026-08-19-botao-voltar-formularios.ts`
— non-technical Brazilian Portuguese, `isAdmin: false`.

Commit: `docs(news): announce the back button`

### 6. Green

`pnpm lint` and `pnpm test`. The e2e suites locate "Continuar" by exact name,
so a second button in the row does not reach them; the quiz e2e is run to
confirm nothing else shifted.

## Out of scope, worth saying

A flow with a commit step in the middle would let a reader walk back past a
save and run it again on the way forward. No flow in the app has one — the
rules quiz commits last, and finishing ends the run — so this ticket does not
grow a rule for it. Worth a ticket if a mid-flow commit ever appears.

## Acceptance criteria mapping

| Criterion | Step |
|---|---|
| Back beside Continue, 10–20% / 80–90%, every screen but the first | 2 |
| Back shows the previous screen with its answer | 1, 2 |
| Changing an answer after going back leaves `firstTryCorrect` alone | 1 (test) |
| `AllAtOnce` gets no button | 2 |
| The button and the browser's back agree | 3, 4 |
| Accessible name, tested | 2 |
| Tests for back navigation, answer preservation, absent on first screen | 1, 2 |
| `pnpm lint` and `pnpm test` green | 6 |
