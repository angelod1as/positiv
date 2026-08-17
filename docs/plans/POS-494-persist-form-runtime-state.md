# POS-494 — Persist the form runtime state in the browser

Linear: https://linear.app/positiv/issue/POS-494/persistir-o-estado-do-runtime-de-formularios-no-navegador
Blocks POS-484. Related to POS-483.

## Problem

`useFormRuntime` seeds `answers`, `currentStepId` and `firstTryCorrect` once
(`useState(flow.start)`, `useState({})`) and keeps them in memory only. A refresh
loses everything.

From POS-484 on, the rules quiz is one question per screen and its veteran branch
reads `firstTryCorrect`. Refreshing after failing the two probe questions wipes
that record and hands back the short path. Per-question blocking stops *advancing*
with a wrong answer; it does not stop *restarting*.

## Scope

Runtime only. No form is migrated, no environment variable is added.

Persist the three values to `sessionStorage` under `form-runtime:<formId>:<scopeId>`,
restore after mount, clear on completion.

## Design

### 1. Storage module — `app/components/forms/runtime/persistence.ts`

Pure functions, no React. Everything wrapped in `try/catch`; storage unavailable
(private window, quota) degrades to in-memory and never throws.

```ts
const VERSION = 1

export type PersistedRuntimeState = {
  answers: Answers
  currentStepId: StepId
  firstTryCorrect: Record<string, boolean>
}

export function runtimeStorageKey(formId: string, scopeId: string): string
export function readRuntimeState(key: string): PersistedRuntimeState | null
export function writeRuntimeState(key: string, state: PersistedRuntimeState): void
export function readKeepOnDone(key: string): boolean
export function clearRuntimeState(key: string): void
```

Stored payload is `{ v: VERSION, keepOnDone?: true, ...state }`. `readRuntimeState`
returns `null` and removes the key when: `window` is undefined, the value is absent,
`JSON.parse` throws, `v !== VERSION`, or the shape does not hold. Same
discard-on-garbage posture as `app/lib/hooks/use-brush-state.ts` — note that hook
validates shape but has no version field, so the explicit `v` is the one thing this
adds to that pattern.

`sessionStorage`, not `localStorage`: it dies with the tab, so a quiz answered last
month cannot come back.

### 2. Hook — `use-form-runtime.ts`

One new option, optional:

```ts
persistence?: { formId: string; scopeId: string }
```

New returned value: `isRestored: boolean`.

- No `persistence` → `isRestored` starts `true`, nothing reads or writes. Existing
  callers (and every current test) behave exactly as today, with no skeleton flash.
- With `persistence` → `isRestored` starts `false` **on server and client alike**, so
  the first render matches and hydration is clean. A mount effect (guarded by a ref,
  runs once) reads the record, seeds both the state and the mirroring refs
  (`answersRef`, `stepRef`, `firstTryRef`), then sets `isRestored`.
- A persisted `currentStepId` that is not a key of `flow.steps` discards the whole
  record and starts at `flow.start` — the flow changed between deploys.
- A write effect on `[answers, currentStepId, firstTryCorrect]` persists once
  `isRestored` is true and `isDone` is false. The `isRestored` guard is what stops
  an empty initial state from clobbering the record before restore lands.
- A clear effect, declared *after* the write effect, removes the key when `isDone`
  turns true — unless the record itself says `keepOnDone`.

`errors`, `formError`, `isBusy` and `isDone` are not persisted; the ticket asks for
the three. Consequence worth stating: a commit rejection in flight (`pendingRef`) does
not survive a refresh, the person simply re-answers and re-submits.

The restore key comes from `formId`/`scopeId`, never from `flow`. The POS-483 contract
— "swapping the flow requires remounting with a new `key`, because an inline flow
changes identity every render" — stays untouched: no effect here depends on `flow`
identity.

### 3. `keepOnDone` — a switch inside the record

Not an env var, not a prop, not a query param: a field of the stored record itself.
The point is to be able to say "paste this into sessionStorage" to anyone — in
production included — and have that browser stop deleting the record on completion,
so a flow can be walked end to end repeatedly without refilling it every time.

```
key:   form-runtime:rules-quiz:<eventId>
value: {"v":1,"keepOnDone":true}
```

That value is enough on its own: it can be pasted *before* the flow starts, when no
record exists yet.

Three consequences the implementation has to honour:

- `readKeepOnDone` parses the raw JSON and returns `parsed.keepOnDone === true`,
  checking only `v`, **not** the full shape. Otherwise the paste-before-starting case
  fails its shape check and the flag is lost.
- `writeRuntimeState` carries the existing `keepOnDone` forward — it reads the current
  record before writing. Without this, the first answer overwrites the flag, and a flag
  added mid-flow would not stick either.
- The clear effect calls `readKeepOnDone` at completion time rather than trusting a
  value captured at mount, so adding the flag mid-flow still works.

Scope note: the flag is per browser, per key. It changes only whether *that* browser
keeps *its own* record. It grants nothing server-side — POS-484 revalidates answers on
the server regardless — which is the same reasoning the ticket already accepts for the
record being devtools-editable at all.

### 4. Skeleton — `app/components/ui/skeleton.tsx`

Does not exist in the repo. ShadcN's, verbatim shape, matching `separator.tsx`
(`data-slot`, `cn` from `~/lib/utils`, named export):

```tsx
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("bg-accent animate-pulse rounded-md", className)} {...props} />
}
```

### 5. `FormRunner`

Passes `persistence` through, and while `!isRestored` renders a
fixed skeleton block — prompt line, control, button — instead of the presentation, so
the card holds its height and does not jump when the real step arrives. No override
prop; the ticket does not ask for one.

### 6. Demo route

`/dev/form-runtime` gets `persistence={{ formId: "demo", scopeId: shape }}`, copy
explaining that F5 mid-flow comes back to the same question, the exact key and the
exact `{"v":1,"keepOnDone":true}` value to paste, and a button that clears the record
so the flow can be restarted from scratch.

## Hydration verification

The demo route is excluded from production builds (`app/routes.ts:11-14` keys off
`process.env.NODE_ENV`), so `pnpm build` alone cannot exercise it, and no shipped page
uses `FormRunner` yet.

Procedure, and it will be run, not asserted:

1. Temporarily relax the `devOnly` guard in `app/routes.ts` (local edit, **reverted
   before committing**).
2. `pnpm build && pnpm start`.
3. Load `/dev/form-runtime` in the browser with a record already in `sessionStorage`,
   and capture the console.
4. Pass = zero hydration warnings/errors in the console. The output goes in the PR
   body verbatim.
5. Revert `app/routes.ts`, confirm `git status` clean of it.

## Commit plan

Every commit is one red-green-refactor cycle: failing test first, then the code that
turns it green, in the same commit.

| # | commit | what |
|---|---|---|
| 0 | `chore(claude): allow reading .env.schema` | settings deny narrowed, see below |
| 1 | `docs(plans): add the POS-494 plan` | this file |
| 2 | `feat(runtime): store the runtime state in sessionStorage` | `persistence.ts` + `persistence.test.ts` — key format, round trip, wrong version discarded, malformed JSON discarded, unavailable storage never throws |
| 3 | `feat(ui): add a skeleton component` | `ui/skeleton.tsx` + test |
| 4 | `feat(runtime): restore the runtime state after mount` | hook: `persistence` option, `isRestored`, restore effect, write effect. Tests: refresh returns to the same step with answers filled, `firstTryCorrect` survives, unknown `currentStepId` falls back to `flow.start`, no persistence option means no storage access |
| 5 | `feat(runtime): clear the record when the flow finishes` | clear effect + test |
| 6 | `feat(runtime): keep the record when it asks to be kept` | `readKeepOnDone`, carry-forward on write, clear skipped. Tests: flag survives further answers, flag pasted before the flow starts is honoured, flag added mid-flow is honoured, no flag still clears |
| 7 | `feat(runtime): hold the layout with a skeleton until restore finishes` | `FormRunner` renders the skeleton while `!isRestored` + test |
| 8 | `feat(dev): exercise persistence in the runtime demo` | demo page wiring and copy |
| 9 | `feat(news): announce nothing` | **skipped** — runtime is not user-facing yet; no news item until a form actually migrates (POS-484) |

Plan file deleted before the PR, per `docs/plans/README.md`.

## Acceptance criteria → coverage

| criterion | covered by |
|---|---|
| refresh returns to the same question with answers filled | commit 4, unit |
| `firstTryCorrect` survives refresh | commit 4, unit |
| finishing clears the record | commit 5, unit |
| test mode does not clear | commit 6, unit — `keepOnDone` in the record |
| unavailable `sessionStorage` does not break the form | commit 2, unit (throwing stub) |
| old-version record discarded without blowing up | commit 2, unit |
| no hydration error, against a production build | manual, procedure above |
| `pnpm lint` and `pnpm test` green | before the PR |

## Side change — reading `.env.schema`

Unrelated to the runtime, requested alongside it. `.claude/settings.json:143` denies
`Read(./.env.*)`, which catches `.env.schema` even though `CLAUDE.md` says to read it.
Deny beats allow, so an allow entry alone changes nothing — the wildcard has to be
replaced with the specific files it is protecting:

```diff
       "Read(./.env)",
-      "Read(./.env.*)",
+      "Read(./.env.bak)",
+      "Read(./.env.local)",
+      "Read(./.env.*.local)",
+      "Read(./.env.development)",
+      "Read(./.env.production)",
+      "Read(./.env.staging)",
+      "Read(./.env.test)",
```

plus `"Read(./.env.schema)"` in `allow`. Cost: a future `.env.<something>` holding
secrets would no longer be denied by default, where the wildcard covered it in advance.
`.env.schema` is the only versioned env file and carries declarations, no values.

Goes in its own commit, `chore(claude): allow reading .env.schema`, kept out of the
runtime commits.

## Note

The ticket originally specified the switch as a prop fed by a public `VITE_` env var
declared in `.env.schema`. Changed on 2026-08-17 to the record field described in
section 3, so it can be turned on for one browser in production by pasting a value,
with no deploy and no build-time flag. The Linear description already reflects this.
