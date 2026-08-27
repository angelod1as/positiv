# Payments v3 — Asaas integration, designed from scratch

Status: design, awaiting approval. Date: 2026-08-24.
Replaces: `origin/payment` (PRs #571–#583, umbrella #563), Linear POS-463…472.

## 1. Why from scratch

Two earlier attempts exist and neither is on `main`:

- **v1** (Nov 2025 – Mar 2026, POS-285…311) created two Asaas charges per
  participant up front — one PIX, one card — and let the participant pick one
  on a token page. Charges existed before anyone chose to pay; the sibling
  had to be deleted after the fact. Rolled back by PR #562.
- **v2** (Mar – Apr 2026, `origin/payment`) fixed that by creating the charge
  only when the participant picks an option, and introduced a
  `payment_requests` table. It never finished: the Asaas client throws for
  any installment count above 1 while the UI offers 2x–4x; nothing ever
  expires a request; `has_paid`/`payment` on `event_participants` stayed the
  source of truth for the grid and dataviz and were never synced; the branch
  is 619 commits behind `main` and predates varlock (`app/env.server.ts` no
  longer exists), `app/copy/` and the form runtime; there are no E2E tests;
  unit tests mock Kysely with proxies that return whatever the test queues.

What v2 got right and v3 keeps as ideas, not code: the charge is created at
pick time; state transitions are guarded `UPDATE … WHERE status IN (…)
RETURNING` so concurrent admin actions and webhooks cannot corrupt a row;
the webhook token is compared timing-safe and is mandatory.

## 2. Decisions (from the planning rounds)

| Topic | Decision |
|---|---|
| Methods | PIX and credit card, up to 6 installments. No boleto (payer-side refund form, D+1, auto-cancel). |
| Fees | The participant pays every fee. `events.ticket_price` is what Positiv nets; the payment page shows the gross for each option. Anticipation is always on and priced in. |
| Checkout | Positiv page picks the option; Asaas hosted `invoiceUrl` takes the money. No card data touches Positiv. |
| Trigger | Admin sets `application_status = sent_payment_data` → a payment row is created and the payment-link email goes out. Admin can copy a WhatsApp message with the link. Participant also sees a "Pagar" call to action on the dashboard. |
| Data | New table `payments` in integer cents is the only truth. `event_participants.has_paid` and `.payment` are backfilled into it and dropped. `events.ticket_price` becomes integer cents. Money columns carry no `_cents` suffix — every money column in the schema is cents. |
| Manual payments | Only for money that did not go through Asaas (transfer, cash, partial courtesy). Discounts are a custom base amount at send time, not a manual payment. |
| History | At most one active charge per participant; any number of historical rows. A participant's paid total is a sum, so a second charge after a paid one needs no special code. |
| Validity | 7 days. Admin can resend (new charge). |
| Refund | Button in the admin panel (full or partial) calls Asaas; the webhook finalises. Refunds done inside the Asaas dashboard sync the same way. |
| Emails | Positiv sends link, confirmation and refund emails. Asaas notifications are disabled per customer (each one is billed). |
| Accounting | Every paid row records gross (`amount`), Asaas net (`asaas_net`) and therefore fee. Financial summary and dataviz show gross, fee and net. |
| Admin UI | A single "Gerenciar pagamento" modal, opened from a `$` button on the participants grid and from the participant detail page. |
| Rollout | Small PRs straight to `main`, everything Asaas-facing behind `PAYMENTS_ENABLED=false` until the sandbox run is calibrated. |

## 3. Data model

All money is `integer` cents. All timestamps are `timestamptz`.

```sql
CREATE TYPE payment_kind   AS ENUM ('asaas', 'manual');
CREATE TYPE payment_status AS ENUM (
  'pending',            -- offer exists, participant has not picked an option; no Asaas charge yet
  'awaiting_payment',   -- Asaas charge created, waiting for the money
  'paid',
  'expired',            -- due_at passed (cron) or Asaas PAYMENT_OVERDUE
  'cancelled',          -- admin cancelled, participant withdrew, or replaced by a resend
  'refunded',
  'partially_refunded'
);
CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'cash', 'transfer', 'other');

CREATE TABLE payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_participant_id uuid NOT NULL REFERENCES event_participants(id) ON DELETE RESTRICT,
  kind                 payment_kind   NOT NULL,
  status               payment_status NOT NULL DEFAULT 'pending',
  base_amount          integer NOT NULL CHECK (base_amount > 0),   -- what Positiv nets (ticket or custom)
  amount               integer CHECK (amount > 0),                  -- gross charged; NULL until an option is picked
  method               payment_method,
  installment_count    integer CHECK (installment_count BETWEEN 1 AND 6),
  asaas_customer_id    text,
  asaas_payment_id     text,
  asaas_installment_id text,
  asaas_invoice_url    text,
  asaas_net            integer,                                     -- netValue from the webhook, for auditing the fee formula
  due_at               timestamptz NOT NULL,
  paid_at              timestamptz,
  refund_requested_at  timestamptz,
  refunded_at          timestamptz,
  refund_amount        integer CHECK (refund_amount > 0),
  created_by           uuid REFERENCES profiles(id) ON DELETE SET NULL,
  note                 text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payments_paid_shape
    CHECK ((status IN ('paid','refunded','partially_refunded')) = (paid_at IS NOT NULL)
           AND (status NOT IN ('paid','refunded','partially_refunded') OR amount IS NOT NULL)),
  CONSTRAINT payments_refund_shape
    CHECK ((status IN ('refunded','partially_refunded')) = (refunded_at IS NOT NULL)
           AND (status NOT IN ('refunded','partially_refunded') OR refund_amount IS NOT NULL)),
  CONSTRAINT payments_refund_bounded
    CHECK (refund_amount IS NULL OR (amount IS NOT NULL AND refund_amount <= amount)),
  CONSTRAINT payments_full_is_full
    CHECK (status <> 'refunded' OR (refund_amount IS NOT NULL AND refund_amount = amount)),
  CONSTRAINT payments_partial_is_partial
    CHECK (status <> 'partially_refunded' OR (refund_amount IS NOT NULL AND refund_amount < amount)),
  CONSTRAINT payments_manual_shape
    CHECK (kind <> 'manual' OR (asaas_payment_id IS NULL AND asaas_installment_id IS NULL AND asaas_invoice_url IS NULL
                                AND asaas_customer_id IS NULL AND asaas_net IS NULL
                                AND method IS NOT NULL AND method IN ('pix','cash','transfer','other'))),
  CONSTRAINT payments_asaas_shape
    CHECK (kind <> 'asaas' OR method IS NULL OR method IN ('pix','credit_card')),
  CONSTRAINT payments_installments_only_on_card
    CHECK (installment_count IS NULL OR (method IS NOT NULL AND method = 'credit_card'))
);

CREATE UNIQUE INDEX payments_one_active_per_participant
  ON payments (event_participant_id) WHERE status IN ('pending','awaiting_payment');
CREATE UNIQUE INDEX payments_asaas_payment_id ON payments (asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;
CREATE INDEX payments_asaas_installment_id ON payments (asaas_installment_id) WHERE asaas_installment_id IS NOT NULL;
CREATE INDEX payments_event_participant_id ON payments (event_participant_id);
CREATE INDEX payments_due_active ON payments (due_at) WHERE status IN ('pending','awaiting_payment');

CREATE TABLE payment_webhook_events (   -- inbox: dedupe + audit
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_event_id   text NOT NULL UNIQUE,
  event_type       text NOT NULL,
  asaas_payment_id text,
  payload          jsonb NOT NULL,
  received_at      timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz,
  error            text
);

ALTER TABLE profiles ADD COLUMN asaas_customer_id text UNIQUE;

CREATE VIEW event_participant_payments AS
  SELECT ep.id AS event_participant_id,
         COALESCE(SUM(p.amount)        FILTER (WHERE p.status IN ('paid','refunded','partially_refunded')), 0) AS paid_gross,
         COALESCE(SUM(p.refund_amount) FILTER (WHERE p.status IN ('refunded','partially_refunded')), 0)        AS refunded,
         COALESCE(SUM(p.amount - COALESCE(p.asaas_net, p.amount))
                                       FILTER (WHERE p.status IN ('paid','refunded','partially_refunded')), 0) AS fee,
         -- net = what Positiv kept: Asaas net (or full amount for manual) minus refunds
         COALESCE(SUM(COALESCE(p.asaas_net, p.amount) - COALESCE(p.refund_amount, 0))
                                       FILTER (WHERE p.status IN ('paid','refunded','partially_refunded')), 0) AS net,
         BOOL_OR(p.status IN ('paid','partially_refunded'))                                                    AS has_paid,
         (SELECT status FROM payments a WHERE a.event_participant_id = ep.id
            ORDER BY (a.status IN ('pending','awaiting_payment')) DESC, a.created_at DESC LIMIT 1)          AS current_status,
         (SELECT id FROM payments a WHERE a.event_participant_id = ep.id
            AND a.status IN ('pending','awaiting_payment') LIMIT 1)                                             AS active_payment_id
  FROM event_participants ep
  LEFT JOIN payments p ON p.event_participant_id = ep.id
  GROUP BY ep.id;
```

Notes:

- `updated_at` maintained by a trigger, same shape as `event_participants`.
- RLS: enabled, `service_role` only, on both tables. All access goes through
  Kysely; authorisation lives in the loaders/actions.
- `payments_one_active_per_participant` is what makes "cancel the old, insert
  the new" safe under concurrency — the second inserter fails instead of
  creating a duplicate charge.
- `event_participant_payments` is the single read surface for the grid, the
  financial summary, the event history and dataviz. Supabase type generation
  emits view types, so Kysely reads it like a table.
- Backfill (one migration, before the columns are dropped):
  every `event_participants` row with `has_paid = true OR payment > 0`
  becomes `kind='manual', method='pix', status='paid', base_amount = amount =
  round(payment*100)` (or `ticket_price` when `payment = 0` and `has_paid`),
  `paid_at = updated_at`, `due_at = paid_at`, `note = 'backfill'`.
- `events.ticket_price numeric(10,2)` → `integer` cents in its own migration
  (`ROUND(ticket_price * 100)`), with the event form, event card, dashboard
  and admin readers updated in the same PR. This closes POS-467.

### Expiry cron

```sql
SELECT cron.schedule('expire-payments', '*/15 * * * *', $job$
  UPDATE payments SET status = 'expired'
   WHERE status IN ('pending','awaiting_payment') AND due_at < now();
$job$);
```

Pure SQL, no HTTP. Asaas' own `PAYMENT_OVERDUE` covers `awaiting_payment`;
the cron is the backstop and the only thing that expires `pending`.

## 4. State machine

```
            createPaymentOffer            pickOption (page)          webhook CONFIRMED|RECEIVED
   ∅ ─────────────────────────▶ pending ───────────────────▶ awaiting_payment ─────────────────────▶ paid
                                  │  ▲ cron/OVERDUE            │                                       │
                                  │  └── expired ◀─────────────┘  (paid is also reachable from        │
                                  │                                 expired: Asaas accepts late pay)   │
                                  └──▶ cancelled ◀────────────┘  admin cancel / resend / withdraw      │
                                                                                                       ▼
                                                     webhook REFUNDED / PARTIALLY_REFUNDED ──▶ refunded | partially_refunded
   manual: ∅ ──registerManualPayment──▶ paid ──markManualRefunded──▶ refunded | partially_refunded
```

| From | To | Where |
|---|---|---|
| ∅ | `pending` | `createPaymentOffer` — status change to `sent_payment_data`, "Reenviar", "Reenviar com outro valor" |
| `pending`, `awaiting_payment` | `awaiting_payment` | `pickOption` — participant confirms an option; re-pick deletes the old Asaas charge first |
| `pending`, `awaiting_payment`, `expired` | `paid` | webhook `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` (card: first installment) |
| `pending`, `awaiting_payment` | `expired` | cron; webhook `PAYMENT_OVERDUE` |
| `pending`, `awaiting_payment` | `cancelled` | admin "Cancelar cobrança"; `createPaymentOffer` replacing it; participant cancels application; webhook `PAYMENT_DELETED` |
| `paid`, `partially_refunded` | `refunded` / `partially_refunded` | webhook `PAYMENT_REFUNDED` / `PAYMENT_PARTIALLY_REFUNDED`; manual "Marcar reembolsado" |
| ∅ | `paid` (manual) | "Registrar pagamento manual" |

Every transition is one guarded statement:

```ts
const row = await trx.updateTable("payments")
  .set({ status: "paid", paid_at, amount, asaas_net })
  .where("id", "=", id)
  .where("status", "in", ["pending", "awaiting_payment", "expired"])
  .returningAll()
  .executeTakeFirst()
if (!row) return { skipped: "already_terminal" }
```

Side effects (emails, Telegram alerts) run only when the statement returned a
row, so a redelivered webhook never sends a second email.

## 5. Flows

### 5.1 Admin sends payment data

1. Admin sets `application_status = sent_payment_data` — from the participant
   detail page or the grid. In the detail page a "Valor a cobrar" input
   (default `ticket_price`, in reais, converted to cents on submit) sits next
   to the status. The grid uses `ticket_price`.
2. Server (`createPaymentOffer`):
   - `spot_type <> 'regular'` → status changes, no payment row.
   - no `ticket_price` and no custom amount → error toast, status unchanged.
   - in one transaction: cancel any active row (`pending`/`awaiting_payment`
     → `cancelled`); insert `kind='asaas', status='pending', base_amount,
     due_at = now() + 7 days, created_by = admin`.
   - after commit: if the cancelled row had an Asaas charge, `DELETE
     /v3/payments/{id}` (failure → `logger.error`, row stays cancelled; the
     charge is unpaid and will just go overdue on Asaas).
   - send the payment-link email (failure is non-fatal, surfaced in the toast).
   - `PAYMENTS_ENABLED=false` → status changes, no row, no email, toast says so.
3. The "Gerenciar pagamento" modal shows the row and offers **Copiar
   mensagem** (WhatsApp text from `app/copy/payments.ts`: link, options with
   prices, due date), **Reenviar email**, **Reenviar com outro valor**,
   **Cancelar cobrança**, **Registrar pagamento manual**, **Reembolsar**.

### 5.2 Participant pays

1. Dashboard event card: when `active_payment_id` is set → "Pagamento
   pendente · Pagar" linking to `/pagamento/:paymentId`. When
   `has_paid` → "Pago".
2. `/pagamento/:paymentId` loader: user must own the participant row; else
   redirect with error. States: `paid` → receipt; `expired`/`cancelled` →
   "link expirado, fale com a organização"; `pending`/`awaiting_payment` →
   the options.
3. CPF gate: `profiles.cpf` must pass a digit + checksum validation. If not,
   the page shows a CPF field first (saves to the profile) — no charge can be
   created without a valid CPF. The same validator is added to the basic-data
   form.
4. Options: `PIX — R$ X` and `Cartão Nx de R$ Y (total R$ Z)` for N = 1…6,
   from `buildPaymentOptions(base_amount, fees)`. Default PIX.
5. Action `pickOption(paymentId, option)`:
   - ensure Asaas customer: `profiles.asaas_customer_id` → else
     `GET /v3/customers?cpfCnpj=` (reuse) → else `POST /v3/customers`
     `{ name, cpfCnpj, email, mobilePhone, externalReference: profile.id,
     notificationDisabled: true }`; persist on the profile.
   - if the row is already `awaiting_payment` with the same option → redirect
     to the stored `invoiceUrl` (idempotent double click).
   - if `awaiting_payment` with a different option → `DELETE` the old Asaas
     charge first.
   - `POST /v3/payments` `{ customer, billingType: 'PIX' | 'CREDIT_CARD',
     value: gross in reais, dueDate: due_at, description: "<evento> —
     Positiv", externalReference: payment.id, installmentCount, totalValue
     (card, N>1), callback: { successUrl: APP_URL/pagamento/:id/obrigado,
     autoRedirect: true } }`.
   - guarded UPDATE → `awaiting_payment` with `amount, method,
     installment_count, asaas_customer_id, asaas_payment_id,
     asaas_installment_id, asaas_invoice_url`. If it returns no row
     (concurrent cancel), `DELETE` the charge just created and show the
     expired state.
   - `throw redirect(invoiceUrl)`.
6. `/pagamento/:paymentId/obrigado`: Asaas redirects here after PIX/card.
   Loader reads the row; shows "confirmado" if `paid`, otherwise "recebemos
   sua escolha, a confirmação chega por email" — never marks anything paid.

### 5.3 Webhook

`POST /api/asaas/webhook` (`app/routes/api.asaas-webhook.ts`).

1. `PAYMENTS_ENABLED=false` → 404. `ASAAS_WEBHOOK_TOKEN` unset → 503 and
   `logger.error`. Header `asaas-access-token` compared timing-safe → 401.
2. Body parsed with a permissive Zod schema: `{ id, event, payment: { id,
   status, value, netValue, installment, externalReference, refunds?,
   dueDate, paymentDate, confirmedDate, … } }` with `.passthrough()`.
3. `INSERT INTO payment_webhook_events … ON CONFLICT (asaas_event_id) DO
   NOTHING RETURNING id` → no row = duplicate → 200.
4. Locate the payment row by `asaas_payment_id`, else by
   `asaas_installment_id = payment.installment` (card installments arrive
   as N separate Asaas payments), else by `externalReference`. Unknown →
   `logger.warn`, `processed_at` set, 200 (a charge created by hand in the
   Asaas dashboard is not ours to retry).
5. Apply the transition inside a transaction, record `processed_at`; on any
   throw record `error` and return 500 so Asaas retries.

| Event | Effect |
|---|---|
| `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED` | → `paid`; `amount = value*100` (first installment: use the row's `amount`), `asaas_net = netValue*100` (installments: accumulate), `paid_at`; send confirmation email once |
| `PAYMENT_OVERDUE` | → `expired` |
| `PAYMENT_DELETED` | → `cancelled` (only from non-terminal) |
| `PAYMENT_RESTORED` | → `awaiting_payment` (only from `cancelled`/`expired`) |
| `PAYMENT_UPDATED` | sync `amount`, `due_at` while non-terminal |
| `PAYMENT_REFUND_IN_PROGRESS` | keep `paid`, set `refund_requested_at` if null |
| `PAYMENT_REFUNDED` | → `refunded`, `refund_amount = amount`, `refunded_at`; refund email |
| `PAYMENT_PARTIALLY_REFUNDED` | → `partially_refunded`, `refund_amount = Σ refunds[].value`; refund email |
| `PAYMENT_CHARGEBACK_REQUESTED`, `_DISPUTE`, `_AWAITING_CHARGEBACK_REVERSAL`, `PAYMENT_REPROVED_BY_RISK_ANALYSIS`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` | no transition; `logger.error` → Telegram with participant + event |
| anything else | recorded, `processed_at`, 200 |

Webhook registration: `sendType: SEQUENTIALLY`, `apiVersion: 3`, the event
list above plus `PAYMENT_CREATED`, `authToken = ASAAS_WEBHOOK_TOKEN`.
Done once per environment through `scripts/asaas/register-webhook.ts`
(`POST /v3/webhooks`, idempotent by name). Runbook covers un-interrupting the
queue after 15 failures.

### 5.4 Refund

1. Admin clicks **Reembolsar** in the modal: full by default, optional partial
   amount and reason. Confirmation dialog.
2. Guarded UPDATE: `refund_requested_at = now()` where `status = 'paid'` and
   `refund_requested_at IS NULL` → no row = already in progress, toast.
3. `POST /v3/payments/{id}/refund { value?, description }` — or
   `POST /v3/installments/{id}/refund` for a card plan. On failure clear
   `refund_requested_at`, `logger.error`, toast with the Asaas description.
4. The webhook finalises the status and sends the email. The modal shows
   "reembolso solicitado" until then.
5. Manual rows: **Marcar reembolsado** sets `refunded`/`partially_refunded`
   directly and sends the email.

### 5.5 Manual payment

**Registrar pagamento manual**: amount (reais → cents), method
(`pix`/`cash`/`transfer`/`other`), paid date, note. Inserts `kind='manual',
status='paid'`. Allowed while an Asaas row is active? No — the modal first
asks to cancel the active charge, so `payments_one_active_per_participant`
never gets in the way and the participant does not pay twice.

### 5.6 Participant cancels the application

`cancelApplicationToEvent` also cancels the active payment row and its Asaas
charge. (POS-476 — notifying admins about cancellations — stays a separate
ticket; this only guarantees no live charge survives a withdrawal.)

## 6. Pricing

Inputs from `GET /v3/myAccount/fees/` (cached in memory for 12 h; on failure
fall back to the constants in `app/business/payment/asaas-fees.ts`, which
mirror the public price list):

- PIX: `fixedFeeValue` (R$ 1.99) and `percentageFee`. When `pix.type` is
  `FIXED` the percentage fields — `percentageFee`, `minimumFeeValue`,
  `maximumFeeValue` — come back `null`, not `0`; read them as zero or the
  gross-up evaluates to `NaN`.
- Card: `operationValue` (R$ 0.49), `oneInstallmentPercentage` (2.99%),
  `upToSixInstallmentsPercentage` (3.49%). Asaas ships a second, discounted
  set of percentages alongside them and a `hasValidDiscount` flag; branch on
  the flag rather than hardcoding the plain set, or a negotiated discount
  silently over-charges participants.
- Anticipation: **two** monthly rates, not one.
  `anticipation.creditCard.detachedMonthlyFeeValue` (1.15%/month) applies to
  a single-installment charge, `installmentMonthlyFeeValue` (1.60%/month) to
  2–6x — so `r` below is a function of `n`. Ignore `cardSale.anticipation`:
  that block is card-present (maquininha, Asaas Tap) and does not apply to
  charges created through the payments API. `ASAAS_ANTICIPATION_MONTHLY_RATE`
  is a single scalar and cannot express this; it has to be split in two or
  dropped in favour of the payload.

The percentages above were read from the sandbox account on 2026-08-24, where
they are the public price list. POS-519 carries the full payload; production
may have negotiated rates, which is why PR 13 re-runs the lookup and
re-calibrates before the flag goes on.

Positiv must net `base`. With card fee `p` (percentage) and `f` (fixed), and
anticipation at the monthly rate `r` that matches `n`, charged per
installment for the months until each one settles (installment k settles at
k×32 days ≈ k months), the gross `G` for `n` installments solves

```
G − (p·G + f) − r·Σ_{k=1..n} (G/n)·k = base
G = (base + f) / (1 − p − r·(n+1)/2)
```

- `perInstallment = ceil(G / n)` cents; `total = perInstallment × n`
  (rounded up so Positiv is never short).
- PIX: `G = ceil((base + pixFixed) / (1 − pixPercent))`.
- The rate split is not a rounding detail: at 6x the anticipation term
  `r·(n+1)/2` is 5.6% at 1.60%/month, against 4.375% under the single
  1.25%/month this document assumed before. On a R$ 200 base that is
  R$ 220,50 instead of R$ 217,60 — R$ 2,90 per sale Positiv would have
  absorbed.
- `buildPaymentOptions(base, fees)` is pure and unit-tested against a table
  of known values; the sandbox calibration step compares `asaas_net` from a
  real confirmed charge with `base` and adjusts the anticipation term if
  Asaas applies it differently (e.g. on net rather than gross). The formula
  lives in one file; the fee snapshot used for a row is stored in `note` as
  JSON for later audit.

Displayed to the participant: `PIX — R$ 221,99` · `Cartão 1x — R$ 228,50` ·
`Cartão 3x de R$ 79,10 (total R$ 237,30)` … (illustrative).

## 7. Code layout

```
app/business/payment/
  asaas-client.server.ts        fetch wrapper: access_token + User-Agent, empty body on GET,
                                30 s timeout (60 s for card), {errors:[{code,description}]} → AsaasError,
                                zod-validated responses; customers, payments, refund, delete, fees
  asaas-fees.server.ts          fetch + cache + fallback constants
  pricing.ts                    pure: gross-up, buildPaymentOptions, option ids 'pix' | 'card_1'…'card_6'
  cpf.ts                        pure: normalise + checksum
  payment-offer.server.ts       createPaymentOffer, resendPaymentOffer, cancelActivePayment
  payment-checkout.server.ts    getPaymentPage, pickOption, ensureAsaasCustomer
  payment-webhook.server.ts     parse, dedupe, dispatch, transitions
  payment-refund.server.ts      requestRefund, markManualRefunded
  manual-payment.server.ts      registerManualPayment
  payment-totals.server.ts      reads of event_participant_payments for grid / summary / dataviz
  payment-emails.server.ts      sendPaymentLinkMail, sendPaymentConfirmedMail, sendPaymentRefundMail
app/business/email/templates/payment-{link,confirmed,refund}-mail.template.ts
app/copy/payments.ts            page, modal, toasts, WhatsApp message
app/copy/emails/payment-{link,confirmed,refund}.ts
app/pages/payment/payment-page.tsx, payment-thanks-page.tsx
app/routes/api.asaas-webhook.ts
app/components/organisms/payment/manage-payment-modal.tsx      (+ sections: status card, actions, manual form, refund form)
app/components/organisms/tables/admin/participants-table/…    `$` button column, read-only payment status/amount columns
scripts/asaas/register-webhook.ts, scripts/asaas/smoke.ts    sandbox tooling
e2e/mocks/asaas-mock-server.ts                                 in-process mock (customers, payments, refund, delete, fees, sandbox confirm)
supabase/migrations/*                                          see §3
```

Routes added to `app/routes.ts`: `/pagamento/:paymentId`,
`/pagamento/:paymentId/obrigado` (inside the private layout),
`/api/asaas/webhook`. Paths in `app/lib/paths.ts`.

Admin intents added to `view-event-participant.tsx` and `view-event-page.tsx`
actions (all behind `getAdminContext`): `payment-resend`, `payment-resend-amount`,
`payment-cancel`, `payment-manual`, `payment-manual-refund`, `payment-refund`.
`update-event-participant` gains `charge_amount` (optional, cents) used only
when the status becomes `sent_payment_data`.

Env (`.env.schema`):

```
# --- Payments (Asaas) ---
# @public @type=boolean
PAYMENTS_ENABLED=false
# @public @type=url @example="https://api-sandbox.asaas.com/v3"
ASAAS_API_URL=
# @sensitive
ASAAS_API_KEY=
# @sensitive
ASAAS_WEBHOOK_TOKEN=
# @public @type=number
ASAAS_ANTICIPATION_MONTHLY_RATE=
```

`User-Agent` is the constant `Positiv/<package version> (<APP_ENV>)`.

## 8. What changes for existing readers of `has_paid` / `payment`

| Reader | After |
|---|---|
| `view-event-participants-table.tsx` (`has_paid` checkbox, `payment` editor, POS-385 auto-check) | read-only "Pagamento" status badge + "Valor" from the view; `$` button opens the modal |
| `participant-vs-event-data.tsx` (`payment`, `has_paid` fields) | fields removed; "Valor a cobrar" beside the status; "Gerenciar pagamento" button |
| `financial-summary.tsx` | total gross, fee, net, paid events, average, surplus = Σ(net − ticket_price) |
| `participant-event-history.tsx` | per-event gross / net / status |
| `dataviz/event-metrics.server.ts`, `kpi-scores.server.ts`, `revenue-chart.tsx` | revenue = net, with gross and fee in the tooltip |
| `getProfilesWithExtraDataById`, `getParticipantFullEventHistory`, `admin.server.ts` schemas (`has_paid`, `payment`) | join the view; fields dropped from zod schemas |
| seeds `05_*`, `07_*` | seed `payments` rows instead |
| `db-test-utils.ts`, `integration-global-setup.ts`, `e2e/utils/db-cleanup.ts` | `payments`, `payment_webhook_events` added to cleanup/snapshot lists |

## 9. Testing

- **Unit**: `pricing.ts` (table of expected grosses, rounding, n=1…6),
  `cpf.ts`, webhook Zod parsing, Asaas client (fetch mocked: headers, error
  envelope, timeout), option labels, modal rendering per status, payment page
  per state.
- **Integration** (real DB): backfill migration against seeded rows; view
  arithmetic; every transition in §4 including the guards (double webhook,
  webhook after cancel, refund on non-paid); unique active index under two
  concurrent `createPaymentOffer`; cron expiry statement; cancel-application
  cancels the charge. Asaas is a stub at the client boundary.
- **E2E** (mock Asaas server started by `serve-production.ts` when
  `E2E_MODE`): admin sets status → email in Mailpit with link → participant
  opens `/pagamento`, picks card 3x → mock records the charge → test POSTs
  the webhook → grid shows "Pago", confirmation email arrives; refund path;
  manual payment path; flag-off path.
- **Sandbox (manual, scripted)**: `scripts/asaas/smoke.ts` creates customer +
  PIX charge + card 3x charge, confirms via `POST /v3/sandbox/payment/{id}/confirm`,
  waits for the webhook through a `cloudflared` tunnel, prints `value`,
  `netValue`, and the computed expectation. Run before `PAYMENTS_ENABLED=true`.

## 10. Delivery — one PR per line, each green and mergeable on its own

Two phases. **Phase A (PRs 1–6)** puts the house in order with no Asaas
dependency: money in cents, one `payments` table holding the whole history,
`has_paid`/`payment` gone, admins recording payments through the modal. It
can reach production before the next event on its own — every PR merges to
`main` and its migration runs there through the production workflow. **Phase
B (PRs 7–13)** adds Asaas behind `PAYMENTS_ENABLED`; while it is off, the
status change to `sent_payment_data` is just a status change and admins keep
registering PIX transfers manually, exactly as today.

| # | PR | Contents |
|---|---|---|
| **A** | | |
| 0 | (no code) | Asaas account checklist: sandbox account, its API key and PIX key, the fee snapshot everything is calibrated against, and the address that receives webhook failure alerts. The production account is confirmed to exist and be approved, but is only wired up in PR 13 |
| 1 | `ticket_price` in cents | migration + event form/card/dashboard/admin readers + `formatCurrency(cents)` helper |
| 2 | Payments schema | enums, `payments`, `payment_webhook_events`, `profiles.asaas_customer_id`, view, indexes, RLS, `updated_at` trigger, cron; test utils + cleanup lists; regenerated types |
| 3 | Backfill | migration + integration test on seeded data (columns still present) |
| 4 | Readers on the view | grid (read-only columns, `$` placeholder), financial summary, history, dataviz, seeds, schemas |
| 5 | Drop `has_paid`/`payment` | migration + remove dead code + POS-385 helper |
| 6 | Manual payments | modal skeleton, register manual, mark refunded, cancel — value without Asaas |
| **B** | | |
| 7 | Asaas client + env | `.env.schema`, client, fees, CPF validator, `scripts/asaas/register-webhook.ts` |
| 8 | Pricing | `pricing.ts`, option builder, copy for labels |
| 9 | Payment offer | status → row, link email, WhatsApp message copy, resend, resend with amount, cancel (Asaas delete), withdraw cancels |
| 10 | Payment page | `/pagamento`, CPF gate, `pickOption`, dashboard CTA, thank-you page |
| 11 | Webhook | endpoint, inbox, transitions, confirmation email, Telegram alerts |
| 12 | Refund | modal action, Asaas call, refund email |
| 13 | E2E + sandbox | mock server, E2E specs, `scripts/asaas/smoke.ts`, runbook `docs/payments-runbook.md`, news item, production cutover, flag on in production |

PR 0 blocks only PR 13 and can run in parallel with all of Phase A.

Everything up to PR 12 is built and calibrated against the Asaas **sandbox**,
and PR 0 is scoped to it. An idle Asaas account is closed after a period of
inactivity, so the production account is only wired up in PR 13, whose
cutover step re-verifies the account facts PR 0 recorded — approval and
anticipation both decay if the account lapses — and re-runs the fee lookup,
since sandbox returns the public price list and production may not.

## 10b. Where each PR's plan lives

One plan per PR, in baby steps, beside this file. Each is deleted when its own
PR is opened — `docs/plans/README.md` treats plans as temporary, and these are
no exception; the design document is the one that stays.

| PR | Linear | Plan |
|---|---|---|
| 0 | POS-519 | no code — the checklist is the Linear issue |
| 1 | POS-520 | retired — the PR is open |
| 2 | POS-521 | `POS-521-payments-schema.md` |
| 3 | POS-522 | `POS-522-backfill-payments.md` |
| 4 | POS-523 | `POS-523-readers-on-the-view.md` |
| 5 | POS-524 | `POS-524-drop-old-columns.md` |
| 6 | POS-525 | `POS-525-manage-payment-modal.md` |
| 7 | POS-526 | `POS-526-asaas-client.md` |
| 8 | POS-527 | `POS-527-pricing-engine.md` |
| 9 | POS-528 | `POS-528-payment-offer.md` |
| 10 | POS-529 | `POS-529-payment-page.md` |
| 11 | POS-530 | `POS-530-asaas-webhook.md` |
| 12 | POS-531 | `POS-531-refunds.md` |
| 13 | POS-532 | `POS-532-e2e-and-launch.md` |

Two things the plans decided that this document only implied:

- **`ON DELETE RESTRICT` costs a cleanup change.** Every path that deletes an
  `event_participants` row — the integration test tracker, the E2E cleanup, the
  global setup — must delete its payments first. POS-521 does that. A
  foreign-key error while deleting participants is that ordering being wrong,
  never a reason to relax the constraint.
- **Four admin actions were never guarded.** `view-event-participant.tsx`,
  `view-profile-page.tsx`, `participants-page.tsx` and the admin
  `dashboard-page.tsx` dispatch on `intent` without calling `getAdminContext`;
  React Router runs an action before revalidating loaders, so the admin layout's
  loader does not gate a POST. (`view-event-page.tsx` and `feedbacks-page.tsx`
  do call it — they are the model.) This has nothing to do with payments and is
  not waiting for them: **POS-533** fixes it across every admin route.

## 11. Out of scope

- `events.time_payment_start/end` are swapped in the schema and the labels —
  separate ticket.
- POS-476 (tell admins when an application is cancelled).
- Expiry reminders, WhatsApp API sending (POS-366), boleto, multiple
  concurrent charges, split payments, subscriptions.

## 12. Risks

- **Anticipation arithmetic** is an approximation until calibrated on the
  sandbox; the fee snapshot on each row makes any correction auditable.
- **Card installments**: Asaas emits one payment per installment; the row is
  marked paid on the first `PAYMENT_CONFIRMED` of the plan (the acquirer
  guarantees the remaining installments); `asaas_net` accumulates as
  installments confirm, so `fee` is exact only after the last one.
- **`successUrl` domain**: must match the commercial data on the Asaas
  account, otherwise charge creation fails with `invalid_callback` — the
  cutover checklist in PR 13 covers it; the client falls back to no callback
  when the env is not production.
- **Webhook queue interruption** after 15 consecutive failures: alert email
  goes to the address on the webhook config; runbook has the
  `PUT /v3/webhooks/{id} { interrupted: false }` step.
