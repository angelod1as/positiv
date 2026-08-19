# POS-515 — A refused advance says so beside the button

## Problem

On a screen showing many questions at once (`AllAtOnce`, and the `Grid`
presentation being built on POS-486), validation draws its message under the
refused field and nowhere else. With fourteen fields the refused one is usually
off-screen: the person clicks Continue, nothing moves, and nothing near the
button explains why.

`OneAtATime` is unaffected — one question on the screen, its error always in
view.

## Decisions to confirm

1. **The runtime gains its own signal.** `formError` means "the commit failed"
   and must keep meaning that. `useFormRuntime` returns
   `advanceRejection: { questionIds: string[] } | null`, set when an advance is
   refused, and a **fresh object on every refusal** — so a presentation can key
   a focus effect on its identity and re-focus when the same fields are refused
   twice.
2. **Cleared on a successful advance and on going back.** Not cleared when a
   single answer changes: the presentation filters the ids against the live
   `errors` map, and `answer()` already drops an error when its question is
   answered, so the notice disappears by itself once the last one is fixed.
3. **Commit rejections count too.** When a commit returns per-question errors
   and the runtime routes back to the owning step, the same fields-off-screen
   problem applies, so that path sets the signal as well.
4. **The notice is a shared component**, `presentations/rejection-notice.tsx`,
   not markup inlined in `all-at-once.tsx` — `Grid` on POS-486 needs the same
   thing and should get it with one line rather than a copy.
5. **Focus lands on the first refused control.** `AllAtOnce` already wraps each
   question in a div; the wrapper gets a ref, and the effect focuses the first
   `input, select, textarea` inside it. A radio or checkbox group carries
   `question.id` on no element at all (see `render-question.tsx`), so
   `getElementById` is not an option — the wrapper lookup is what makes those
   groups reachable. `focus()` scrolls the field into view for free.
6. **`Grid` is out of scope on this branch.** `grid.tsx` exists only on
   `pos-486-migrar-dados-basicos`; it is not on `main`, so there is nothing here
   to wire. That branch adds `<RejectionNotice ... />` above its button.

## Steps

### 1. The runtime says an advance was refused

- **Red** — `use-form-runtime.test.ts`: advancing with a required question empty
  exposes `advanceRejection.questionIds` holding that question; a second refusal
  returns a different object; a successful advance and `goBack` clear it to
  null; a commit rejecting a question sets it.
- **Green** — `advanceRejection` state in `use-form-runtime.ts`, set in the
  `failures` branch and in the commit-rejection branch of `runAdvance`, nulled
  where `setFormError(null)` already runs and in `goBack`.

Commit: `feat(form-runtime): expose a signal for a refused advance`

### 2. The notice, and the focus

- **Red** — new `presentations/rejection-notice.test.tsx`: renders an alert when
  given ids that still carry errors, renders nothing when given none, and
  renders nothing once the ids no longer appear in `errors`.
- **Green** — `presentations/rejection-notice.tsx` with the copy string.
- **Red** — new `presentations/all-at-once.test.tsx`: the alert appears next to
  Continue after a refused advance; focus moves to the first refused control;
  a second refusal moves focus again; a radio question's first option takes
  focus.
- **Green** — wire the notice and the focus effect into `all-at-once.tsx`.

Copy in `app/copy/forms.ts`: `formRuntimeCopy.fieldsRejected`.

Commit: `feat(form-runtime): warn beside Continue when a field refuses`

### 3. End to end through the runner

- **Red/Green** — `form-runner.test.tsx`: an `AllAtOnce` run with a required
  question, clicking Continue, asserts the alert beside the button and the
  focused control. Pins the wiring the two unit layers cannot.

Commit: `test(form-runtime): pin the refused-advance warning end to end`

### 4. Announce it

- `news-dialog/items/2026-08-19-aviso-de-erro-no-formulario.ts`, pt-BR,
  non-technical.

Commit: `feat(news): announce the form warning beside the button`

## Testing checklist

- `pnpm test:unit`
- `pnpm lint`
- `pnpm test:e2e` once, at the end
- Manual: `pnpm dev` → `/dev/form-runtime` → "Tela única, linear" → Continue
  with nothing filled in → warning by the button, focus on the first field
