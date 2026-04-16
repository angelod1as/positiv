# Payment System — Architecture & Implementation Guide

> **Single source of truth for the Sistema de Pagamentos (Asaas integration).**
> Read this **before** starting any payment-related work. Update it when you discover something the next person should know.

---

## 1. Context & Goals

Positiv runs paid events. The original flow used `event_participants.has_paid` (boolean) and `event_participants.payment` (numeric) — admin-edited fields with no audit trail and no integration with any payment gateway. Money was tracked in spreadsheets.

This project integrates **Asaas** (Brazilian payment gateway) so participants can pay via Pix or Credit Card, with admin tooling for refunds, cancellations, and reconciliation.

**Hard requirements:**

- Single source of truth for payment state — no more drift between admin spreadsheets and the app.
- Atomic state transitions — concurrent admin actions and webhook events MUST NOT corrupt data.
- Full audit trail for refunds (LGPD + Receita Federal).
- Feature-flagged: `PAYMENT_SYSTEM_ONLINE=false` keeps Asaas dormant; admin can still manage manual payments.

---

## 2. Architecture

### 2.1. The `payment_requests` table is the source of truth

One row per payment attempt. Lifecycle is captured by `status`:

```
pending → awaiting_payment → paid → refunded
                          ↘ expired
                          ↘ cancelled
```

<!-- ⚠️ This snippet is stale — PR #2 changed CASCADE→RESTRICT and
     converted payment_mode/payment_method to native ENUMs. See the
     actual migration for the current schema. -->
```sql
CREATE TABLE payment_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_participant_id uuid NOT NULL REFERENCES event_participants(id) ON DELETE RESTRICT,
  asaas_customer_id   text,
  asaas_payment_id    text,
  payment_mode        payment_mode NOT NULL DEFAULT 'manual',
  payment_method      payment_method,
  installment_count   integer DEFAULT 1,
  amount              numeric(10,2) NOT NULL,
  status              payment_request_status NOT NULL DEFAULT 'pending',
  invoice_url         text,
  expires_at          timestamptz NOT NULL,
  paid_at             timestamptz,
  refund_amount       numeric(10,2) DEFAULT 0,
  refunded_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
```

**`payment_mode` vs `payment_method`** — confusing names, but distinct meanings:

- `payment_mode` answers **WHO processes** the payment: `automatic` (Asaas) or `manual` (admin).
- `payment_method` answers **HOW** money moved: `PIX`, `CREDIT_CARD`, or `NULL` (manual).

The previous schema had a single `billing_type` column conflating both — replaced by these two for clarity.

### 2.2. The lifecycle

| Status               | Meaning                                                               | Set by                                                                     |
| -------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `pending`            | Created, no Asaas charge yet (awaiting participant to pick PIX/CC)    | `createPaymentRequest`                                                     |
| `awaiting_payment`   | Asaas charge created, participant has invoice URL                     | `confirmPaymentChoice`                                                     |
| `paid`               | Confirmed by Asaas webhook OR admin marked manual paid                | `markAsPaid` (webhook) / `markManualPaymentPaid`                           |
| `expired`            | Asaas `PAYMENT_OVERDUE` webhook fired before payment                  | `markAsExpired` (webhook)                                                  |
| `refunded`           | Admin refunded (Asaas refund call OR manual)                          | `processRefund` / `markManualPaymentRefunded` / webhook `PAYMENT_REFUNDED` |
| `cancelled`          | Admin or system cancelled (e.g. before creating a new active request) | `cancelActivePaymentRequest`                                               |
| `partially_refunded` | Reserved for future partial-refund work (not currently written)       | (none yet)                                                                 |

### 2.3. Component map

```
┌─────────────────┐       ┌──────────────────────┐
│  Admin UI       │──────▶│ view-event-participant.tsx (action)
│  (participant   │       │   ↓ requireAdmin
│   detail page)  │       │ trigger-payment-request.server.ts
└─────────────────┘       │ payment-request.server.ts
                          └──────────┬───────────┘
                                     │
                          ┌──────────▼───────────┐    ┌──────────────┐
                          │ asaas-client.server  │───▶│ Asaas API    │
                          └──────────────────────┘    └──────┬───────┘
                                     ▲                       │
                                     │                       │ webhook
                          ┌──────────┴───────────┐           ▼
                          │ api.asaas-webhook.ts │◀──────────┘
                          └──────────────────────┘

User-facing:
┌─────────────────┐       ┌──────────────────────┐
│ /pagamento/:id  │──────▶│ payment-page.tsx
│ (participant)   │       │   ↓ auth (owner)
└─────────────────┘       │ confirmPaymentChoice
                          │   → Asaas customer + payment
                          │   → redirect to invoiceUrl
                          └──────────────────────┘
```

### 2.4. RLS

`payment_requests` has RLS enabled with **service-role-only** access. All app traffic uses the service role via Kysely. Direct PostgREST/Supabase-client access is denied for `anon` and `authenticated`. Authorization happens at the application layer via `requireAdmin` and the payment-page owner check.

---

## 3. Critical Invariants (DO NOT BREAK)

These were discovered the hard way through review cycles. Each violation has caused or could cause data corruption / security holes / silent failures.

### 3.1. Status transitions must be atomic — use `.where("status", "in", [...]).returningAll().executeTakeFirst()`

**Why:** Kysely's `executeTakeFirst()` on `updateTable` returns an `UpdateResult` object that is **always truthy** even when 0 rows match. `if (!result) { throw }` is dead code without `.returningAll()`.

**Pattern:**

```ts
const updated = await kyselyDb
  .updateTable("payment_requests")
  .set({ status: "refunded", ... })
  .where("id", "=", id)
  .where("status", "=", "paid")     // ← guard
  .returningAll()                    // ← required for executeTakeFirst to return row|undefined
  .executeTakeFirst()

if (!updated) {
  // status transitioned concurrently; do NOT call Asaas
  throw new Error("...")
}
```

**Where applied:** `processRefund`, `cancelActivePaymentRequest`, `markAsPaid` (webhook), `markAsExpired` (webhook), `markAsRefunded` (webhook), `markManualPaymentPaid`, `markManualPaymentRefunded`.

**TDD note:** Mock-based unit tests cannot prove the race — Kysely proxy mocks return whatever you stuff in. **Use real-DB integration tests** (see `processRefund-race.integration.test.ts` and `cancelActivePaymentRequest-race.integration.test.ts`) that fire concurrent calls or simulate the race deterministically.

### 3.2. DB UPDATE before Asaas call, with rollback on Asaas failure

**Why:** Otherwise a race between admin actions and Asaas webhooks can leave DB and Asaas diverged (e.g. local `cancelled` while Asaas charge is alive and user pays it).

**Pattern (mirrored in `processRefund` and `cancelActivePaymentRequest`):**

```ts
const updated = await /* atomic UPDATE with status guard, returningAll */

try {
  await someAsaasCall(updated.asaas_payment_id)
} catch (error) {
  // Rollback: restore the previous status, also guarded
  const rolledBack = await kyselyDb.updateTable("payment_requests")
    .set({ status: previousStatus, ... })
    .where("id", "=", updated.id)
    .where("status", "=", currentStatus)   // guard so we don't overwrite a concurrent change
    .returningAll()
    .executeTakeFirst()

  if (!rolledBack) {
    logger.error("MANUAL RECONCILIATION REQUIRED", { ... })
  }
  throw error
}
```

`logger.error` triggers Telegram alerts in production (see `logger.server.ts` — Telegram transport at `level: "error"`).

### 3.3. All admin actions MUST `requireAdmin`

**Why:** React Router 7 runs actions BEFORE re-validating loaders. A layout-level admin loader does NOT gate POST mutations. Without an explicit `requireAdmin` in the action itself, any logged-in user could POST `intent=refund-payment` and trigger admin mutations.

**Two layers:**

1. `getAdminContext` (in `app/business/admin/admin.server.ts`) calls `requireAdmin(context.currentProfile)` internally. Loader-side admin pages get this for free.
2. **Action handlers must call this themselves** — see `view-event-participant.tsx:action`:

   ```ts
   export async function action({ request, params }) {
     const { currentProfile } = await getUserContext(request, params)
     requireAdmin(currentProfile)
     // ... dispatch on intent
   }
   ```

**Tests required:** Every admin action file MUST have a test that asserts the action throws a redirect Response when (a) the user is not logged in and (b) the user is not admin. See `view-event-participant.test.tsx` for the pattern.

### 3.4. Webhook token comparison must be timing-safe

`crypto.timingSafeEqual` on equal-length Buffers. For length mismatch, do a dummy compare against the **server-side** token buffer (not the attacker input) — otherwise the dummy compare's runtime depends on attacker input length, leaking the server token's length.

```ts
function tokensEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) {
    timingSafeEqual(bb, bb)  // dummy compare against SERVER token
    return false
  }
  return timingSafeEqual(ba, bb)
}
```

### 3.5. In production, missing `ASAAS_WEBHOOK_TOKEN` must reject (503), not allow

`if (!asaasWebhookToken)` returning `true` was a **silent prod bypass**. Now: prod returns 503 + `logger.error` (alerts via Telegram); dev/test logs a one-time warning and proceeds (so local development isn't crippled).

### 3.6. Webhook handlers must guard status transitions

Without status guards, late/out-of-order webhooks corrupt data:

- `PAYMENT_OVERDUE` arriving after `PAYMENT_CONFIRMED` would flip a paid row to expired.
- `PAYMENT_REFUNDED` should NOT flip a `partially_refunded` row to fully `refunded` (loses audit trail).

Each `markAs*` composable in `api.asaas-webhook.ts` has a `WHERE status IN (...)` guard appropriate to its semantics.

### 3.7. `cancelAsaasPayment` checks `deleted: true`

Asaas returns HTTP 200 with `{ deleted: false }` when a payment can't be deleted (e.g. already paid). Treat `deleted: false` as a failure — otherwise we silently mark local state cancelled while the charge is alive.

### 3.8. Asaas client has a 30s fetch timeout

`AbortController`-based timeout. Without it a hung Asaas connection blocks the request indefinitely.

### 3.9. Form schema is a strict enum, not `string().min(1)`

`paymentFormSchema` uses `zod.enum(["PIX", "CC_1", "CC_2", "CC_3", "CC_4"])`. The constant `VALID_PAYMENT_OPTIONS` is hardcoded (not derived from `MAX_INSTALLMENTS`) because the schema is shared client/server and cannot import from `.server.ts` modules. A unit test (`payment-form-schema.test.ts`) guards drift between the two constants.

### 3.10. `parsePaymentOption` validates against `MAX_INSTALLMENTS`

Belt-and-suspenders: even if a hand-crafted POST bypasses the form schema, `parsePaymentOption` rejects `CC_0`, `CC_999`, etc.

---

## 4. Asaas API Contract (what we know)

Real API base: `https://sandbox.asaas.com/api/v3` (sandbox) or `https://api.asaas.com/api/v3` (prod).
Mock for E2E: `http://localhost:9999/api/v3` (started by `e2e/global-setup.ts`).

### 4.1. Endpoints we use

| Method | Path                   | Purpose                                                  |
| ------ | ---------------------- | -------------------------------------------------------- |
| POST   | `/customers`           | Create customer (name + cpfCnpj required)                |
| POST   | `/payments`            | Create charge (customer + billingType + value + dueDate) |
| POST   | `/payments/:id/refund` | Refund (full)                                            |
| DELETE | `/payments/:id`        | Cancel a not-yet-paid charge                             |

### 4.2. Headers

`access_token: <api_key>` (custom header, not standard `Authorization: Bearer`).
`Content-Type: application/json` only when sending a body.

### 4.3. Webhook events handled

| Event                        | Handler action                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `PAYMENT_RECEIVED` (PIX)     | `markAsPaid`                                                                      |
| `PAYMENT_CONFIRMED` (CC)     | `markAsPaid`                                                                      |
| `PAYMENT_OVERDUE`            | `markAsExpired`                                                                   |
| `PAYMENT_REFUNDED`           | `markAsRefunded`                                                                  |
| `PAYMENT_REFUND_IN_PROGRESS` | `markAsRefunded` (PIX refunds are async; we treat IN_PROGRESS = REFUNDED for now) |

### 4.4. Webhook events we DO NOT yet handle (gaps)

- `PAYMENT_DELETED` — admin-side deletion not reflected
- `PAYMENT_CHARGEBACK_REQUESTED` / `PAYMENT_CHARGEBACK_DISPUTE` / `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`
- `PAYMENT_RESTORED` — restored after deletion
- `PAYMENT_UPDATED` — value/dueDate changed via dashboard
- `PAYMENT_RECEIVED_IN_CASH`

These currently fall through to `unhandled_event` (200 OK). Add handlers when there's a business need.

### 4.5. Known Asaas behaviors not in the mock

The mock validates request structure but is NOT a faithful behavioral simulation. Production differences:

- **CPF/CNPJ format validation**: real API rejects malformed CPFs; mock accepts any non-empty string.
- **Past `dueDate`**: real API rejects; mock accepts any `YYYY-MM-DD`.
- **PIX refund is async**: real API returns `REFUND_IN_PROGRESS`; mock returns `REFUNDED` immediately.
- **Refund of already-refunded**: real API rejects; mock accepts.
- **Cancel of paid charge**: real API returns `{deleted: false}`; mock always returns `{deleted: true}` (BUG in mock — fix recommended).
- **Installment payments require `installmentValue` OR `totalValue`** in addition to `installmentCount`: our client sends only `installmentCount`. **Untested against real sandbox** — likely 400 in production for CC installment > 1.

### 4.6. Ambiguities (to resolve via real sandbox test)

- Exact webhook payload schema for `PAYMENT_REFUNDED` (does it carry the actual refund amount in `payment.value` or a refunds-array field?)
- Rate limiting headers / 429 behavior
- Webhook delivery retry policy (exact intervals + max retries)

---

## 5. Caveats & Open Issues (DO NOT FORGET)

These are known design gaps that should NOT be silently re-introduced as bugs. Track each as a follow-up Linear ticket.

### 5.1. ~~CASCADE DELETE on `event_participants` wipes payment history~~

> **⚠️ Resolved in PR #2** — FK changed to `ON DELETE RESTRICT`. Callers that need to delete a participant with payment history must now make an explicit archive / soft-delete decision at the call site.

~~`payment_requests.event_participant_id` is `ON DELETE CASCADE`. Deleting an event_participant deletes its payment audit trail (paid_at, refund_amount, asaas_payment_id, etc.) — **LGPD / Receita Federal violation**.~~

### 5.2. No unique constraint on active `payment_request` per participant

Concurrent `resolvePaymentRequest` or `confirmPaymentChoice` for the same participant can create duplicate Asaas charges. The app's `cancelActivePaymentRequest` cleans up old ones, but a race between two `resolve`s creates two active rows.

**Recommended fix:** partial unique index:

```sql
CREATE UNIQUE INDEX payment_requests_one_active_per_participant
ON payment_requests (event_participant_id)
WHERE status IN ('pending', 'awaiting_payment');
```

Plus: in `confirmPaymentChoice`, atomically reserve the active slot via UPDATE WHERE status='pending' BEFORE calling Asaas; on conflict return existing `invoice_url` rather than creating another charge.

### 5.3. `getLatestPaymentRequest` returns any status (including cancelled)

Callers may render stale `cancelled` state over actual `paid` state. Either fix the function semantics ("latest non-cancelled" or "current authoritative") or every caller must filter.

### 5.4. Multi-step operations are not transactional

`resolvePaymentRequest` does: cancel old → create new → fetch profile → send email. If any step after step 1 fails, partial state is committed.

`confirmPaymentChoice` does: SELECT → create Asaas customer → create Asaas payment → UPDATE row. If `createAsaasPayment` fails, the customer is created on Asaas but our DB never persists the customer id (next attempt creates another customer).

**Recommended fix:** `kysely.transaction().execute(async (trx) => { ... })` wrapping; persist `asaas_customer_id` BEFORE creating the payment.

### 5.5. Partial refunds not implemented

Only full refunds. `partially_refunded` enum value exists but is never written. Webhook handler explicitly excludes `partially_refunded` from its status guard for safety. When implementing partials, parse the actual refund value from the webhook payload and accumulate `refund_amount` rather than overwriting.

### 5.6. Mock server is a singleton; Playwright `workers > 1` will break tests

`asaas-mock-server.ts` state is module-level. With parallel workers, `resetAsaasState()` from one worker nukes another's state. Currently `playwright.config.ts` pins `workers: 1`. Document this constraint or namespace state per worker.

### 5.7. Unit test mocks for Kysely are proxy-based and tautological

The `chainProxy` mock returns whatever the test stuffs into it — independent of the actual query shape. Many "passing" unit tests verify only that mocks were called with literal values the test itself supplied. **Critical paths must have integration tests** against a real DB (see `*-race.integration.test.ts` examples). Don't trust unit-test mocks for DB interactions.

### 5.8. CASCADE risks combined with no `INSERT ... ON CONFLICT`

If two webhooks for the same `asaas_payment_id` arrive concurrently, both queries see no row (or the same row), and the lack of unique index means duplicates can be created in some edge flows.

---

## 6. Testing Strategy

### 6.1. Test pyramid

| Tier                          | When to write                                            | Speed     | What it covers                                           |
| ----------------------------- | -------------------------------------------------------- | --------- | -------------------------------------------------------- |
| Unit (vitest)                 | Pure functions, predicates, formatters                   | <1s       | Logic in isolation; no DB, no network                    |
| Integration (vitest, real DB) | Anything that touches `payment_requests` or other tables | ~1s/test  | Schema constraints, RLS, race conditions, atomic UPDATEs |
| E2E (Playwright)              | User journeys end-to-end                                 | ~30s/test | Full flow incl. mock Asaas + Mailhog                     |

**Rule:** if your fix relates to concurrency, races, or atomic DB transitions — it MUST have an integration test, not a unit test. Mock-based unit tests cannot prove these properties.

### 6.2. TDD for concurrency bugs

1. **RED**: `git stash push <impl-file>` to revert your fix locally.
2. Write the integration test that simulates the race (two parallel calls via `Promise.all` + `vi.spyOn` on Asaas client).
3. Run the test. Confirm it FAILS with a concrete observable wrong behavior (e.g. `refundAsaasPayment called 2 times`, `paid status flipped to cancelled`).
4. **GREEN**: `git stash pop` to restore the fix.
5. Re-run the test. Confirm it PASSES.
6. Commit the test alongside the fix.

If you can't make the test fail against the buggy code, the test is wrong (or worse, the fix is wrong — the bug may not be where you thought).

### 6.3. E2E mock contract

The Asaas mock at `e2e/mocks/asaas-mock-server.ts`:

- Validates request structure (required fields, types, enums).
- Tracks payment state (PENDING → CONFIRMED → REFUNDED → DELETED).
- Exposes introspection HTTP endpoints (`GET /_mock/state`, `POST /_mock/reset`) — tests use HTTP rather than direct imports because the mock runs in the global-setup process while tests run in worker processes.

**Reset state in `beforeEach` via `await resetAsaasState()`.** Don't try to import the in-memory state.

### 6.4. E2E full-journey tests

The full-journey test (`user-payment-page.spec.ts:full journey`) is the one test that exercises end-to-end: admin trigger → email → user opens page → selects PIX → submit → mock Asaas creates customer + payment → redirect to invoice URL → POST webhook → status `paid` in DB.

**It's deterministic about which user it tests** via `e2e/.auth/user-info.json` (written by `e2e/tests/auth/setup.ts`). Don't reintroduce "find latest test-% profile" patterns — they're race-prone across parallel setup jobs.

### 6.5. Email content verification

`verifyPaymentLinkEmail` and `verifyRefundEmail` (in `e2e/utils/payment-helpers.ts`) check participant name, event name, payment URL, and pricing — not just "an email arrived". Mailhog stores bodies in quoted-printable; `extractEmailBody` decodes that. Don't bypass these helpers with raw subject-only checks.

### 6.6. Sandbox E2E (real Asaas, separate suite)

The mock server in §6.3 is fast and catches structural bugs, but has known behavioral gaps (see §4.5 — async PIX refunds, CPF validation, `deleted: false` responses, etc.). To catch those, we also run a thin **sandbox E2E suite** against the **real Asaas sandbox**.

**Command:** `pnpm test:e2e:sandbox` (separate from `pnpm test:e2e`). Does NOT run on every CI push.

**When it runs:**

- **Local, on-demand** — any dev touching `asaas-client.server.ts`, the webhook handler, or payment business logic should run it before opening a PR.
- **CI nightly** — via a separate workflow, catches Asaas drift we're not aware of.
- **Release gate** — REQUIRED to pass before merging `payment` → `main`.

**Infrastructure:**

1. **Cloudflare Tunnel for webhook delivery.** Sandbox Asaas needs a public URL to POST webhooks to. We use `cloudflared tunnel --url http://localhost:5173` — free, no account needed, random `*.trycloudflare.com` URL per run.

   - Playwright fixture (`e2e/fixtures/cloudflare-tunnel.ts`) spawns `cloudflared`, parses stdout for the URL, exposes it via the fixture, and kills the process on teardown.
   - Alternative researched: ngrok (2-hour session cap, 1GB/month bandwidth cap — rejected); localtunnel (unmaintained — rejected); Coolify staging (requires deploy per branch — overkill for this).

2. **Webhook registration per test run.** Before the suite: `POST /webhooks` to Asaas registering the tunnel URL. After: `DELETE /webhooks/:id`. Prevents orphan webhook configs accumulating in the sandbox account.

3. **Test-data isolation.** Every customer/payment created carries a prefix `e2e-sandbox-<timestamp>-<random>` so we can filter. A teardown step (or scheduled cron via `pnpm test:e2e:sandbox:cleanup`) DELETEs all entities matching the prefix.

4. **Credentials.** Real sandbox API key as `ASAAS_SANDBOX_API_KEY` env var. In CI: GitHub Actions secret. Locally: `.env` (gitignored).

**Smoke test coverage** (start minimal; expand only when the mock demonstrably misses something):

| # | Test | What it verifies |
|---|------|------------------|
| 1 | PIX full journey | create customer → create payment → sandbox simulates receipt → webhook delivered → DB marks paid |
| 2 | Credit Card with installments | create customer → create payment with `installmentCount=3` + `installmentValue` → verify Asaas accepts (catches the "installmentValue required" gap) |
| 3 | Refund flow | paid payment → POST /payments/:id/refund → webhook arrives → DB marks refunded |
| 4 | Cancel of paid charge | paid payment → DELETE /payments/:id → verify response is `{deleted: false}` and client throws |
| 5 | Invalid CPF rejection | create customer with `cpfCnpj: "00000000000"` → expect 400 from Asaas |

**NOT in sandbox suite:** admin UI flows, Mailhog verification, status guard races — those stay in mock-based E2E because they're faster and don't benefit from real Asaas.

**Sandbox quirks to document as we learn them** (append below as discovered):

- _(TBD: how does sandbox simulate PIX receipt? Manual via Asaas dashboard, or API endpoint?)_
- _(TBD: sandbox rate limits on payment creation)_
- _(TBD: webhook retry policy for sandbox failures)_

**DO NOT delete the mock suite once sandbox suite exists.** The mock is still the primary E2E for fast feedback; sandbox is the acceptance gate.

---

## 7. Implementation Workflow

### 7.1. Branch strategy

```
main
 └── payment              ← FEATURE BRANCH (integration target)
       ├── pos-N-foo      ← small PR #1
       ├── pos-N-bar      ← small PR #2
       └── ...            ← each PR cherry-picks a logical chunk
```

- **Every PR targets `payment`** via `gh pr create --base payment --head <branch>`.
- `payment` only merges to `main` when ALL feature PRs are landed and full E2E + manual sandbox verification pass.
- Each PR is **independently revertable** without breaking `payment`.

### 7.2. PR size guideline

**Cap: ~500 lines diff** (excluding generated files like `database.types.ts`). If a PR exceeds this, split it. Reviewers can engage meaningfully with 500 lines; not 8000.

### 7.3. PR template (for each one)

Title: `[POS-XXX] <imperative description>`

Body sections:

1. **Linear ticket(s)** — Fixes POS-XXX
2. **Scope** — what this PR does and explicitly does NOT do
3. **Why this slice** — why it's a coherent atomic chunk
4. **Critical invariants touched** — link to relevant §3 entries in this doc
5. **Testing** — unit/integration/e2e tests added or updated
6. **Rollback** — how to revert safely (usually just `git revert` — but flag if there's a migration)

### 7.4. Pre-PR checklist (per PR)

- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (unit + integration)
- [ ] If touching E2E: `pnpm test:e2e` passes
- [ ] Test covers new behavior (per project Definition of Done)
- [ ] If touching anything in §3, an integration test (not just unit) verifies the invariant
- [ ] PR description references the relevant §3 invariant(s)
- [ ] If introducing a new caveat or design gap, add it to §5 of this doc

---

## 8. Planned PR Sequence

This is the cherry-pick plan derived from the existing 65-commit branch. Each PR is atomic, reviewable, and rollbackable. Order is significant — earlier PRs are foundations for later ones.

| #   | Title                                                                                                | Source commits (approximate)                                        | LOC est. | Depends on            |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------- | --------------------- |
| 1   | Foundation: env vars + Asaas client scaffold                                                         | `95bbe82e`, `1bf1ee79`                                              | ~150     | —                     |
| 2   | DB schema: `payment_requests` table + RLS                                                            | `59f017f1`, `9d3737dd`+`4252e73c` (squash), `4d0ea5b4`              | ~200     | 1                     |
| 3   | Asaas client: validation, refund, cancel, timeout, deleted-check                                     | `4907aa96`, `b40b2c66`, parts of `4da13d5c`/`969f8ef7`              | ~250     | 1                     |
| 4   | Webhook endpoint: scaffold + token (timing-safe) + status guards + REFUNDED handler                  | `a7787647`, `4704569c`, `83c19e46`, parts of `4da13d5c`/`969f8ef7`  | ~400     | 2, 3                  |
| 5   | Email system: templates + formatters + senders                                                       | `961cd03f`, `0c53ca9d`, `29cb3896`, `70faca73`                      | ~300     | 1                     |
| 6   | Pricing engine + payment options builder                                                             | `51e9db16`, `52e66006`                                              | ~250     | 1                     |
| 7   | Payment-request business logic (CRUD + race-safe atomic transitions)                                 | `19105175`, `e364cbdf`, parts of `4da13d5c`/`d22b21a7`              | ~400     | 2, 3, 6               |
| 8   | Trigger payment from admin status change                                                             | `32934cf0`, `32a7be54`, `74f942c1`                                  | ~250     | 5, 7                  |
| 9   | User-facing payment page + auth guard                                                                | `fb1e0e7f`, `8c6320ab`, `3cd2d7a2`                                  | ~350     | 6, 7                  |
| 10  | Refund flow: atomic with rollback + email                                                            | `e8d2be42`, `e56ea6f3`, `967142a6`, parts of `d22b21a7`             | ~300     | 7, 5                  |
| 11  | Custom amounts (POS-469)                                                                             | `0f4436f9`, `e958e2ac`, `11dd3272`                                  | ~300     | 9                     |
| 12  | Admin UI: payment status section + resend + refund + cancel buttons + **`requireAdmin` enforcement** | `ab85e265`, `9b8e803d`, `46773eee`, `64219b31`, parts of `4da13d5c` | ~500     | 8, 10                 |
| 13  | Manual payment mode (POS-470)                                                                        | `cf95e70c`, `32a7be54`                                              | ~200     | 7, 12                 |
| 14  | Drop `has_paid`/`payment` columns + admin mutation cleanup                                           | `56b5eea6`, `9f4ab0e0`, `b7b5fd33`, `8c5d14bf`, `066d63b6`          | ~500     | 8, 12, 13             |
| 15  | Drop columns migration (terminal)                                                                    | `04b1cfbb`                                                          | ~150     | 14                    |
| 16  | Seeds for `payment_requests` (diverse scenarios)                                                     | `3290db9f`, `8f60ca93`                                              | ~150     | 2, 14                 |
| 17  | E2E infrastructure: mock server + helpers + lifecycle                                                | `154178cc`, `22b80937`, `728fec46`, `74b9ab0d`, `944ba165`          | ~500     | 4, 9, 12              |
| 18  | E2E payment tests (against mock)                                                                     | `4ac66b06`, `091df88a`, `8bd1196c`                                  | ~500     | 17                    |
| 19  | Documentation (DIAGRAM.md, this doc, plans)                                                          | `af7c14e2`, `8e0b4b5f`, `279f5c26`, this commit                     | ~300     | — (can land any time) |
| 20  | Sandbox E2E: Cloudflare Tunnel fixture + webhook registration + 5 smoke tests + cleanup + CI nightly workflow | NEW (not in current branch — see §6.6)                     | ~500     | 4, 10, 17             |

**MEGA fixes** (`4da13d5c`, `d22b21a7`, `969f8ef7`, `4da13d5c`-r2) are NOT separate PRs — their content is folded into the relevant PR above (e.g. webhook timing-safe goes into PR #4; refund race fix goes into PR #7; admin auth goes into PR #12). This way the canonical history is clean.

**Squash candidates** (small fixups merged into related PRs):

- `1399194f`, `b70a1f86`, `02feec89`, `f877bea6`, `3f8edccd` → merge into PR #12 (admin UI)
- `2faf9783`, `7144b209`, `174eed81`, `a2a4439a` → merge into PR #17 (E2E infra) or PR #18 (E2E tests)
- `af3f8c7e`, `b20dc6a9`, `a244cad5` → distribute into the PR that owns the fixed file

---

## 9. Useful References

### Files

**Production code:**

- Schema: `supabase/migrations/20260315*_*.sql` and `20260316*`, `20260318*`
- Asaas client: `app/business/payment/asaas-client.server.ts`
- Webhook: `app/routes/api.asaas-webhook.ts`
- Business logic: `app/business/payment/payment-request.server.ts`, `trigger-payment-request.server.ts`
- Pricing: `app/business/payment/payment-pricing.server.ts`
- Form schema: `app/business/payment/payment-form-schema.ts`
- Guard: `app/business/payment/payment-guard.server.ts`
- Page: `app/pages/payment/payment-page.tsx`
- Admin UI: `app/components/pages/admin/participants/participant-vs-event-data.tsx`, `app/pages/admin/events/view-event-participant/view-event-participant.tsx`
- Emails: `app/business/email/templates/payment-link-mail.template.ts`, `payment-refund-mail.template.ts`; `app/business/payment/send-payment-*.server.ts`
- Auth helpers: `app/business/auth/guards.server.ts` (`requireAdmin`), `app/business/admin/admin.server.ts` (`getAdminContext`)

**Tests:**

- Unit: `app/business/payment/*.test.ts`, `app/routes/api.asaas-webhook.test.ts`
- Integration (race): `app/business/payment/processRefund-race.integration.test.ts`, `cancelActivePaymentRequest-race.integration.test.ts`
- Pricing: `app/business/payment/payment-pricing.server.test.ts`
- Schema drift: `app/business/payment/payment-form-schema.test.ts`
- Admin auth: `app/business/admin/admin.server.test.ts`, `app/pages/admin/events/view-event-participant/view-event-participant.test.tsx`
- E2E infra: `e2e/mocks/asaas-mock-server.ts`, `e2e/utils/payment-helpers.ts`, `e2e/utils/email-helpers.ts`, `e2e/pages/PaymentPage.ts`
- E2E specs: `e2e/tests/authenticated/admin-payment-management.spec.ts`, `user-payment-page.spec.ts`

**Config:**

- Env: `.env.example` (look for `ASAAS_*` and `PAYMENT_SYSTEM_ONLINE`)
- Playwright: `playwright.config.ts`
- E2E lifecycle: `e2e/global-setup.ts`, `global-teardown.ts`, `serve-production.ts`
- CI: `.github/workflows/deploy-and-test.yml` — needs Asaas env vars (see line ~134)

### External

- Asaas docs: <https://docs.asaas.com> (some pages 404 — ambiguities noted in §4.6)
- Linear project: <https://linear.app/positiv/project/sistema-de-pagamentos-cc14e6a9417c>
- This branch: `pos-463-poc-asaas-sandbox-smoke-test`
- Feature branch: `payment` (PR target)
- Old companion doc: `DIAGRAM.md` (mermaid flow diagrams) — still useful for visual lifecycle

---

## 10. How to use this doc

- **Before starting any payment work**, re-read sections §3 (invariants), §5 (caveats), and §8 (PR plan).
- **When creating a PR**, link to the relevant §3 invariant(s) in the PR description.
- **When discovering a new bug**, add it to §5 with context — don't fix it silently in unrelated work.
- **When making an architectural decision**, update §2 or §3.
- **When adding a new Asaas event handler**, update §4.3 and add the event to the mock if missing.
- **When the planned PR sequence in §8 changes**, update §8 — don't let the doc drift from reality.
