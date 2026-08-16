# POS-492 — Fix and standardise zod error messages

Linear: <https://linear.app/positiv/issue/POS-492/corrigir-e-padronizar-as-mensagens-de-erro-do-zod>
Blocks: POS-484 (migrate the rules quiz to the new runtime)
Branch/worktree: `angelod1as/pos-492-standardise-zod-messages`

## 1. Problem

`app/lib/helpers/zod.ts:7` detects a missing value with `issue.received === "undefined"`.
Zod 4.3.5 does not put `received` on an `invalid_type` issue — `$ZodIssueInvalidType`
carries `expected` and `input` (`node_modules/zod/v4/core/errors.d.cts:12-16`). The branch
is dead, so an unanswered question falls through to
`Tipos incorretos. Esperado: string. Recebido: undefined`.

Three secondary problems, all in scope per the ticket:

- The same situation has several texts spread around: `"Obrigatório"`,
  `"Resposta obrigatória"`, `"Este campo é obrigatório"`, `"Insira pelo menos um caracter"`,
  plus a local `messages` dictionary in `app/business/admin/common.ts:11-19`
  (which also carries a typo: "caracters").
- `case "custom": default: return undefined` hands control back to zod, which emits its
  English locale text (`Invalid input`) straight to the UI.
- `case "invalid_format"` still probes `"validation" in issue`, a zod 3 shape. In v4 the
  field is `format`, so the datetime branch is also dead and every format error reads
  `Formato inválido` — including e-mail.

Why it barely shows today: remix-forms posts an empty text input as `""`, which lands in
`too_small`, not `invalid_type`. The new runtime sends `undefined` for an unanswered
question, so the bad text becomes the normal path.

## 2. Decisions taken (from the kickoff)

1. Canonical text for an empty field or unanswered question: **"Campo obrigatório"**.
2. Full sweep of hand-written messages. Rule: **generic until specificity is needed** —
   an inline message survives only when the default would lose information the person needs.
3. `too_small` with `minimum <= 1` on a string/array/set means "missing", so it returns the
   required text. This also kills the broken plural `No mínimo 1 caracteres`.

`minimum >= 2` keeps the exact current wording (`No mínimo 2 caracteres`), which is what
`e2e/tests/authenticated/admin-event-management.spec.ts:114` already asserts.

## 3. Design

### 3.1 Single source

New module `app/lib/helpers/validation-messages.ts` (no barrel, direct import):

```ts
export const validationMessages = {
  required: "Campo obrigatório",
  invalid: "Valor inválido",
  invalidEmail: "E-mail inválido",
  invalidDate: "Data inválida",
  invalidFormat: "Formato inválido",
  minLength: (n: number) => `No mínimo ${n} caracteres`,
  maxLength: (n: number) => `No máximo ${n} caracteres`,
  minOptions: (n: number) => `Selecione ao menos ${n} opções`,
  maxOptions: (n: number) => `Selecione no máximo ${n} opções`,
  minValue: (n: number) => `O valor mínimo é ${n}`,
  maxValue: (n: number) => `O valor máximo é ${n}`,
}
```

Schemas that need the constant (a `refine`, for instance, never reaches `customError`)
import from here instead of retyping the text.

### 3.2 Helper rewrite

`app/lib/helpers/zod.ts` keeps its shape — one `z.config({ customError })`, still exporting
`zod`. Changes:

| issue code | new behaviour |
|---|---|
| `invalid_type` | `issue.input === undefined` → `required`; anything else → `invalid` (never prints `expected`/`input`) |
| `too_small` | `minimum <= 1` and origin string/array/set/file → `required`; string → `minLength`; array/set → `minOptions`; number/bigint/date → `minValue` |
| `too_big` | string → `maxLength`; array/set → `maxOptions`; number/bigint/date → `maxValue` |
| `invalid_format` | `format === "email"` → `invalidEmail`; `datetime`/`date` → `invalidDate`; else `invalidFormat` |
| every other code (incl. `custom`, `invalid_union`, `unrecognized_keys`, default) | `invalid` — never `undefined`, so zod's English locale can no longer leak |

`customError` only runs when the schema gave no message of its own, so an inline message
still wins wherever we keep one.

### 3.3 Sweep — what loses its inline message

Drops the inline text and inherits the helper:

- `app/business/common.ts:12,14,20` — `"Insira pelo menos um caracter"` → `Campo obrigatório`
- `app/business/common.ts:13,21,43`, `app/business/feedback/feedback-schema.ts:8` — e-mail texts → `E-mail inválido`
- `app/business/common.ts:33,44` — password length texts → `No mínimo 6/8 caracteres`
- `app/business/common.ts:122` — `.string({ message: "Obrigatório" })` → `Campo obrigatório`
- `app/business/common.ts:208` — `"Este campo é obrigatório"` → `Campo obrigatório`
- `app/business/admin/common.ts:11-19,35-40` — the whole local `messages` dict except `emoji`
- `app/business/feedback/feedback-schema.ts:17,18` — length texts → `No mínimo 10 / No máximo 5000 caracteres`
- `app/components/forms/custom/rules/rules-form-schema.tsx:15,24` — `"Resposta obrigatória"` → `Campo obrigatório`

Switches to the shared constant (a `refine`, so no inline text means no message at all):

- `app/business/common.ts:185,190,195,200` — `"Você precisa escolher pelo menos um"` → `validationMessages.minOptions(1)`

Keeps its inline text, with the reason:

- `"precisa ser um emoji"` (`admin/common.ts:36`) — the default cannot say which format
- `"Por favor, complete a verificação de segurança"` (`common.ts:51`, `feedback-schema.ts:25`) — Turnstile is an invisible field; "Campo obrigatório" would point at nothing
- `"Data inválida"` (`common.ts:125`) — reached through a `pipe`, and `Valor inválido` would be a downgrade
- `"O valor não pode ser negativo"` (`participant-vs-event-data.tsx:33`) — `min(0)`, where `O valor mínimo é 0` reads worse
- `"Selecione uma opção"` (`feedback-schema.ts:13`), `"Você tem certeza que digitou um número?"`, and every `refine` text (wrong answer, ages, matching passwords, flag notes, consent)
- `app/pages/dev/form-runtime-demo.tsx` — a demo route whose point is showing per-question messages

### 3.4 Tests that assert affected text

- `app/business/common.test.ts:25,44` — `"Este campo é obrigatório"` → `"Campo obrigatório"`
- `app/components/forms/custom/rules/rules-form-schema.test.tsx:6,16` — `"Resposta obrigatória"` → `"Campo obrigatório"`
- `e2e/tests/authenticated/admin-event-management.spec.ts:114` — expected to stay green unchanged; verified, not assumed
- `app/components/forms/runtime/*.test.*` — the `"Resposta obrigatória"` strings there are per-test schema fixtures, not production copy. Left alone.

## 4. Baby steps (TDD, one commit each)

0. **Setup** — `CI=true pnpm install`, then `pnpm test:unit` to record a green baseline.

1. **RED** `test(zod): cover every issue code the helper handles`
   New `app/lib/helpers/zod.test.ts`, one case per branch: missing value inside an object,
   missing value on a bare schema, wrong type with a real value, `too_small` 1 vs 2 on
   string / array / number, `too_big` on string / array / number, `invalid_format` for
   email / datetime / other, `custom` without a message, and an unhandled code.
   Assert the technical output is gone (no `Esperado:`, no `Recebido:`, no `Invalid input`).
   Run — fails.

2. **GREEN** `feat(validation): add a single source for default messages`
   Add `app/lib/helpers/validation-messages.ts`.

3. **GREEN** `fix(zod): detect a missing value against the zod v4 issue shape`
   Rewrite `customError` per 3.2. Run `pnpm test:unit` — helper tests pass; the two known
   assertions in `common.test.ts` / `rules-form-schema.test.tsx` are expected to fail here.

4. `test(forms): follow the standard text through the affected schemas`
   Update those two assertions to `"Campo obrigatório"`. Still red on the source, then green
   once step 5 lands — kept as its own commit so the text change is reviewable on its own.

5. `refactor(schemas): drop messages that only restate the default`
   `app/business/common.ts` sweep (3.3), including the `refine` texts moving to
   `validationMessages.minOptions(1)`.

6. `refactor(admin): remove the local message dictionary from the event schema`
   `app/business/admin/common.ts` — keep `emoji`.

7. `refactor(feedback): inherit the default length and e-mail messages`
   `app/business/feedback/feedback-schema.ts`.

8. `refactor(rules): inherit the standard required message`
   `app/components/forms/custom/rules/rules-form-schema.tsx`.

9. **Manual check** — `pnpm dev`, `/dev/form-runtime`, press "Continuar" with nothing
   answered. Expect `Campo obrigatório`. This is the exact reproduction from the ticket.

10. **Full gate** — `pnpm lint`, `pnpm test:all`, `pnpm test:e2e`. Fix whatever breaks;
    nothing gets written off as unrelated.

11. Delete this plan file, then ask before opening the PR.

No news-dialog entry: decided out of scope, since this changes validation wording rather
than anything a person would go looking for.

## 5. Risk

Production copy changes on the login, register, basic data, event application, admin event,
feedback and rules forms. Every one of them is listed in 3.3 with the before/after, and
step 11 runs the whole e2e suite over the ones with coverage. The forms without e2e
coverage (feedback, basic data) get a manual pass in step 9.

Secondary risk: `z.config` is a global side effect that only applies where
`~/lib/helpers/zod` is imported. `app/components/pages/admin/participants/participant-vs-event-data.tsx:33`
imports `zod` directly — it keeps its inline message, so it does not depend on the config
being loaded. Worth a note in the PR, not a fix here.

## 6. Acceptance criteria mapping

| Ticket criterion | Step |
|---|---|
| Missing answer gives Portuguese text, no technical terms | 1, 3, 9 |
| Single source used by schemas | 2, 5-8 |
| No fallback exposes zod vocabulary | 1, 3 (`default` branch) |
| Tests per handled `issue.code`, incl. the failing one | 1 |
| Existing forms reviewed | 3.3, 5-8, 9, 10 |
| `pnpm lint`, `pnpm test:all`, `pnpm test:e2e` green | 10 |
