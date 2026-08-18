# POS-504 — Progress indicator for multi-screen forms

Linear: https://linear.app/positiv/issue/POS-504

## Problem

One question per screen removed what the old single-page form gave for free: a
scrollbar told you how much was left. The rules quiz is 14 screens and nothing
says whether you are near the start or the end.

## Decisions taken with Angelo

1. **Branching flows show a projected total that revises.** The runtime shows
   the total of the path it currently projects. Under the veteran branch
   (POS-501) that means someone starts at `1/2` and, after stumbling on both
   probes, sees `3/14`.
   - Alternatives rejected: worst-case total from the start, a barless number,
     progress only in linear flows.
   - Known cost, accepted: with POS-501 the jump from `1/2` to `3/14` is itself
     a signal that the branch fired, which sits against POS-501's "no warning,
     no transition". POS-501 may revisit the copy.
2. **The total comes from simulating `flow.next`.** No new flow API. The
   runtime walks the flow with the answers it already has.
3. **Bar plus text, announced politely.** `role="progressbar"` with
   `aria-valuetext`, and the visible text inside an `aria-live="polite"` region,
   because `OneAtATime` moves focus to the control and would otherwise never
   announce the position.
4. **Visible copy is the fraction alone: `3/14`.** No "Pergunta" and no "Tela".
   `aria-valuetext` is `Etapa 3 de 14`, audio only, so a screen reader does not
   read a slash.
5. **Every visible step counts, including `content`.** Only `commit` is
   excluded — it runs and advances, it is not a screen.

## Design

### `project-path.ts` (new)

```ts
export function projectPath(flow: Flow, answers: Answers, context: FlowContext): StepId[]
```

Walks from `flow.start`, calling `flow.next` with the answers and context the
runtime holds, until `"done"`. A `seen` set stops a cycle and a step cap stops a
pathological flow. Returns every step id on the projected path, in order.

Optimism is free: a question nobody answered has no entry in `firstTryCorrect`,
and a flow reads that absence as "did not stumble", so the projection follows
the short path until a real mistake lengthens it. The `Flow` type documents this
contract: **a flow must treat a missing `firstTryCorrect` entry as the optimistic
case.**

### `use-form-runtime.ts`

Adds to the returned object:

```ts
progress: { index: number; total: number } | null
```

- countable steps = the projected path minus `commit` steps
- `total` = countable length, `index` = position of `currentStepId` + 1
- `null` when `total <= 1`, or when the current step is not on the projected
  path (defensive; should not happen)
- memoised on `[flow, answers, firstTryCorrect, data, currentStepId]`

### `presentations/form-progress.tsx` (new)

Pure component, props `{ index, total }`:

```tsx
<div role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index}
     aria-valuetext={`Etapa ${index} de ${total}`}>
  <div style={{ width: `${(index / total) * 100}%` }} />
</div>
<p aria-live="polite">{index}/{total}</p>
```

### Wiring

- `PresentationProps` gains `progress`
- `FormRunner` passes `runtime.progress` through
- `OneAtATime` renders `<FormProgress>` at the top of the form when `progress`
  is set; `AllAtOnce` ignores it
- No opt-in prop on `FormRunner` — every migrated form inherits the indicator

## Commit plan (TDD, red first)

1. `test(runtime): describe the projected path of a flow` — `project-path.test.ts`
   covering linear, short branch, long branch, cycle, unknown step
2. `feat(runtime): project the path a flow will take` — `project-path.ts`
3. `test(runtime): describe the progress the runtime reports` — `use-form-runtime`
   test: index and total, revision when a stumble lengthens the path, null on a
   single-step flow
4. `feat(runtime): report progress along the projected path`
5. `test(forms): describe the progress indicator` — `form-progress.test.tsx`:
   aria attributes, `3/14` text, live region
6. `feat(forms): draw the progress indicator`
7. `test(runtime): expect progress in one-at-a-time and not in all-at-once`
8. `feat(runtime): pass progress to the presentation`
9. `chore(news): announce the form progress indicator`

## Acceptance criteria (from the ticket)

- [ ] The rules quiz shows progress on every screen
- [ ] Branching behaviour decided, implemented and written down (above)
- [ ] `AllAtOnce` gets no indicator
- [ ] Accessible: screen reader users know where they are
- [ ] Tests cover the calculation and the rendering
- [ ] `pnpm lint` and `pnpm test` green
