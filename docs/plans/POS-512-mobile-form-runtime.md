# POS-512 — The form runtime breaks on phones

## What was measured

Chromium, dev server, viewports 320×720, 375×720 and 414×720, on
`/dev/form-runtime`. The page is **543px wide at every one of the three
widths**, so it scrolls sideways on all of them.

### 1. `main` sizes itself to its widest unbreakable child

`app/root.tsx:313` wraps the page in `<div className="flex flex-col grow mt-16">`,
so the page's `<main>` is a **flex item**. `main` carries
`mx-auto flex max-w-xl flex-col gap-8 p-8`.

Auto margins on a flex item's cross axis switch off `align-items: stretch`. The
item is then sized to fit-content, and fit-content never goes below min-content.
The min-content of this page is 543px, so `main` is 543px wide inside a 320px
viewport, and takes the document with it.

Measured chain at 320px:

| element | width | scrollWidth |
|---|---|---|
| `html` | 320 | 543 |
| `body.h-screen.flex.flex-col` | 320 | 543 |
| `div.flex.flex-col.grow.mt-16` | 320 | 543 |
| `main.mx-auto…p-8` | **543** | 543 |

Pinning `main` to `width: 100%` in the browser drops it to 320px immediately.

### 2. The shape-switch button row cannot wrap

`div.flex.gap-2` holding the two shape buttons. `buttonVariants`
(`app/components/ui/button-variants.ts:4`) carries `whitespace-nowrap` and
`shrink-0`, so neither button wraps nor shrinks: the row's min-content is 463px.
With `main` pinned to 100%, the document is still 503px wide because of it.
Adding `flex-wrap` drops the document to 356px.

### 3. "Apagar o registro deste formato" is one 295px word

Same `whitespace-nowrap`. At 320px the button alone reaches x=356. It is the
last remaining overflow after fixes 1 and 2.

### 4. The runtime itself, on the demo's current content, is clean

With `main` pinned to 100%, walking the whole stepped flow — intro, text, radio,
select, checkbox, textarea, e-mail — and the single-screen flow produced **zero
overflowing elements inside `<form>`**. The demo's document width never moved
off 503px, which is page chrome, not the form.

That is not a clean bill of health for the runtime. It is a statement about the
demo: its content is too tame to prove anything.

### 5. What the runtime *does* break on, once stressed

Replacing an option label in the DOM with a long unbreakable token
(`https://exemplo.positiv.com/uma-url-…`) pushes the `<span>` to x=330 at a
320px viewport — the choice row has no `overflow-wrap`, so a long token walks
straight out of the screen. Long prose labels wrap fine.

### 6. Touch targets

Measured at 320px (branch rebased onto `abfddaf8`, so the POS-509 back button is
in place):

| target | size | verdict |
|---|---|---|
| choice row (`<Label>` around a radio/checkbox) | 240 × **25** | too short |
| radio input itself | 20 × 20 | (the row is the target) |
| back button (`w-1/6`, `one-at-a-time.tsx:122`) | **40** × 45 | too narrow |
| Continuar button | 223 × 45 | ✅ |
| text input | 240 × 45 | ✅ |
| select | 240 × 51 | ✅ |

The back button's `w-1/6` is a sixth of whatever contains it. On the demo at
320px, `p-8` resolves to 40px a side, so the form is 240 wide and the button is
40 — four pixels under the minimum. Its container decides its size, so a form
that sits in something narrower (a `Card` on the rules quiz) makes it smaller
still. `min-w-11` is the fix that survives the container changing; widening the
demo's padding only hides it there.

The back button lives in `one-at-a-time` only; `all-at-once` still draws a lone
submit.

### Notes on the ticket's assumptions

- `app/pages/newsletter/unsubscribe.tsx` puts `max-w-2xl mx-auto` on a `Card`
  in the same flex-item position, so it likely carries the same defect on a
  *user-facing* page. Out of scope here — raising it as a follow-up.

## Plan

### Step 0 — record the plan

Commit: `docs(plan): record the POS-512 mobile plan`

### Step 1 — the demo page, with no form on it (red → green by measurement)

Per the request: make the page responsive *before* the form is in the picture.

1. `main`: `mx-auto w-full max-w-xl flex flex-col gap-8 p-4 sm:p-8`
   — `w-full` restores stretch and lets `max-w-xl` do the centring it was meant
   to do; `p-4` on phones gives back 32px of the 40px the padding was eating.
2. Shape button row: `flex flex-wrap gap-2`.
3. "Apagar o registro deste formato": `className="h-auto whitespace-normal py-2"`
   so a long label wraps instead of setting the page's width.

Measure at 320/375/414 with the form hidden: expect `scrollWidth === clientWidth`.

Commit: `fix(dev): stop the runtime demo from scrolling sideways`

### Step 2 — put the form back, measure again

Re-measure the same three widths with the form rendered, both flows, every
screen. Record what changes.

### Step 3 — make the demo actually stress the runtime

The demo covers 5 of the 10 `InputSpec` kinds — `text`, `textarea`, `select`,
`radio`, `checkbox` — and every option label is short. `email`, `password`,
`textnumber`, `date` and `boolean` have never been drawn at any width.

Add a third flow — "Casos extremos" — where **all ten kinds appear**, each with
content chosen to break a narrow screen if it can:

- `email` and `password` with a placeholder long enough to test the field,
- `textnumber` (its spinner-hiding classes are untested at any width) and `date`
  (the native picker is the widest control the runtime draws),
- `boolean`, whose prompt *is* the label beside the box, with a prompt long
  enough to wrap,
- a `radio` and a `checkbox` whose alternatives are two-line prose — rules-quiz
  length, since the real quiz has 250-character alternatives,
- a `select` whose options are longer than the field,
- an option carrying an unbreakable token (a long URL), and a prompt and a help
  text carrying one too.

Every kind stays reachable from the two existing flows as well, so a screen can
be measured both one-at-a-time and all-at-once.

Commit: `feat(dev): exercise every question kind in the runtime demo`

### Step 4 — fix what the stress screens actually break (TDD)

Expected from the measurement above, to be re-confirmed screen by screen:

- `render-question.tsx` `choiceClassName`: `min-h-11 py-2` for a 44px touch
  target, and `break-words min-w-0` on the label text so a long token wraps.
- `one-at-a-time.tsx:122`: the back button keeps `w-1/6` and gains `min-w-11`,
  so a narrow container can no longer shrink it below the minimum.

Anything else only if a measurement shows it. No speculative edits.

Red first: unit tests asserting the classes that carry each fix
(`render-question.test.tsx` for the choice row, `one-at-a-time`'s test for the
back button). The repo already asserts classes this way — `skeleton.test.tsx`,
`score-grid.test.tsx`; jsdom has no layout, so a class assertion is the only
unit-level grip on this.

Commits:
- `test(runtime): pin the choice row and back button's mobile size`
- `fix(runtime): wrap long option labels and give choice rows a touch target`
- `fix(runtime): keep the back button a 44px target in a narrow container`

### Step 5 — guard the real form, not the demo

The demo route is dev-only (`app/routes.ts:14`), and the e2e suite runs against
a production build, so the demo cannot be guarded there. The rules quiz can.

`e2e/tests/authenticated/user-mobile-rules-quiz.spec.ts` (the `user-*` glob puts
it in the authenticated-user project):

- for 320, 375 and 414: open an event's `/regras`, assert
  `documentElement.scrollWidth <= clientWidth` on arrival,
- walk three questions, asserting it again on each,
- assert the continue button, the back button and each choice row measure at
  least 44px on both axes — the back button's size comes from the quiz's `Card`,
  which is narrower than the demo's `main`, so this is where it is worth
  measuring.

Commit: `test(e2e): guard the rules quiz against sideways scroll on phones`

### Step 6 — announce it

`app/components/organisms/news-dialog/items/2026-08-19-quiz-no-celular.ts`.

Commit: `docs(news): announce the mobile fix for the quiz`

### Step 7 — done means green

`pnpm lint`, `pnpm test`, `pnpm test:e2e`, plus a final Playwright pass over the
demo at all three widths in both flows.

## Out of scope, raised as follow-ups

- `Button`'s global `whitespace-nowrap` — same trap for every long label on the
  site. Changing it site-wide is its own ticket.
- The `unsubscribe` page's `mx-auto` `Card` (item 6 above).
