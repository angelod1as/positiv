# Migrate Payment State to payment_requests Table

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `payment_requests` the single source of truth for all payment data. Remove `has_paid` and `payment` columns from `event_participants`. Add `payment_mode`/`payment_method` columns to replace `billing_type`.

**Architecture:** Three-phase approach: (1) Schema improvements + backfill migration, (2) Replace all reads/writes to use payment_requests, (3) Drop deprecated columns. The UI gets rebuilt on the new table — payment type selector, custom amounts, payment status display.

**Tech Stack:** PostgreSQL migrations, Kysely, React, AG Grid, Vitest

---

## Phase 1: Schema + Migration

### Task 1: Improve payment_requests schema

Add `payment_mode` and `payment_method` columns, migrate data from `billing_type`, then drop `billing_type`.

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_improve_payment_requests_schema.sql`

**Step 1: Write migration**

```sql
-- Add new columns
ALTER TABLE "public"."payment_requests"
  ADD COLUMN "payment_mode" text NOT NULL DEFAULT 'manual',
  ADD COLUMN "payment_method" text;

-- Migrate existing billing_type data
UPDATE "public"."payment_requests"
SET
  payment_mode = CASE
    WHEN billing_type IN ('PIX', 'CREDIT_CARD') THEN 'automatic'
    WHEN billing_type = 'manual' THEN 'manual'
    ELSE 'manual'
  END,
  payment_method = CASE
    WHEN billing_type IN ('PIX', 'CREDIT_CARD') THEN billing_type
    ELSE NULL
  END;

-- Drop old column
ALTER TABLE "public"."payment_requests" DROP COLUMN "billing_type";
```

**Step 2: Run `supabase db reset` and verify**

**Step 3: Run `pnpm db:types --local` to regenerate types**

**Step 4: Update all code references from `billing_type` to `payment_mode`/`payment_method`**

Files to update:
- `app/business/payment/trigger-payment-request.server.ts` — `billingType: isPaymentSystemOnline ? undefined : "manual"` → `payment_mode: isPaymentSystemOnline ? 'automatic' : 'manual'`
- `app/business/payment/payment-request.server.ts` — `createPaymentRequest` param `billingType` → `paymentMode`
- `app/business/payment/payment-request.server.ts` — `confirmPaymentChoice` sets `billing_type: billingType` → `payment_mode: 'automatic', payment_method: billingType`
- `app/business/payment/payment-request.server.ts` — `syncManualPaymentStatus` checks `billing_type !== "manual"` → `payment_mode !== "manual"`
- `app/components/pages/admin/participants/participant-vs-event-data.tsx` — `BILLING_TYPE_LABELS` → split into mode + method labels, `isAsaasManaged` checks `payment_mode !== "manual"`
- `app/routes/api.asaas-webhook.ts` — no changes (doesn't use billing_type)

**Step 5: Run `pnpm lint` and `pnpm test:unit`**

**Step 6: Commit**

```
feat(payment): replace billing_type with payment_mode and payment_method
```

---

### Task 2: Backfill migration — create payment_requests for historical data

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_backfill_payment_requests.sql`

**Step 1: Write migration**

```sql
-- Create payment_requests rows for all event_participants with has_paid=true
-- that don't already have a payment_request
INSERT INTO "public"."payment_requests" (
  event_participant_id,
  amount,
  status,
  payment_mode,
  payment_method,
  paid_at,
  expires_at,
  created_at,
  updated_at
)
SELECT
  ep.id,
  COALESCE(ep.payment, 0),
  'paid',
  'manual',
  NULL,
  ep.updated_at,
  ep.updated_at + interval '2 days',
  ep.updated_at,
  ep.updated_at
FROM public.event_participants ep
WHERE ep.has_paid = true
  AND NOT EXISTS (
    SELECT 1 FROM public.payment_requests pr
    WHERE pr.event_participant_id = ep.id
  );

-- Also create pending rows for participants with payment > 0 but has_paid = false
INSERT INTO "public"."payment_requests" (
  event_participant_id,
  amount,
  status,
  payment_mode,
  payment_method,
  expires_at,
  created_at,
  updated_at
)
SELECT
  ep.id,
  ep.payment,
  'pending',
  'manual',
  NULL,
  now() + interval '2 days',
  ep.updated_at,
  ep.updated_at
FROM public.event_participants ep
WHERE ep.has_paid = false
  AND ep.payment > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.payment_requests pr
    WHERE pr.event_participant_id = ep.id
  );
```

**Step 2: Run `supabase db reset` and verify**

Check: `SELECT count(*) FROM payment_requests` should show rows for all historical paid participants.

**Step 3: Commit**

```
feat(payment): backfill payment_requests from historical event_participants data
```

---

## Phase 2: Replace reads and writes

### Task 3: Update dataviz queries to use payment_requests

**Files:**
- Modify: `app/business/admin/dataviz/event-metrics.server.ts`
- Modify: `app/business/admin/dataviz/kpi-scores.server.ts`

Replace:
- `sum(event_participants.payment)` → `sum(pr.amount)` with LEFT JOIN on payment_requests
- `count(*) filter (where event_participants.has_paid = true)` → `count(*) filter (where pr.status = 'paid')`

**Step 1: Update `getEventRevenueData()`**

Join: `LEFT JOIN payment_requests pr ON pr.event_participant_id = event_participants.id AND pr.status = 'paid'`

Replace:
- `sum(event_participants.payment)` → `coalesce(sum(pr.amount), 0)`
- `count(*) filter (where event_participants.has_paid = true)` → `count(pr.id)`

**Step 2: Update `getConversionFunnelData()`**

Same join pattern. Replace `has_paid = true` filter with `pr.status = 'paid'`.

**Step 3: Update `kpi-scores.server.ts`**

Same join + replace `sum(event_participants.payment)` → `coalesce(sum(pr.amount), 0)`.

**Step 4: Run dataviz integration tests**

Run: `pnpm test:integration -- --run app/business/admin/dataviz/`

**Step 5: Commit**

```
refactor(payment): dataviz queries read from payment_requests instead of event_participants
```

---

### Task 4: Update webhook — remove dual-write to event_participants

**Files:**
- Modify: `app/routes/api.asaas-webhook.ts`
- Modify: `app/routes/api.asaas-webhook.test.ts`

**Step 1: Remove `event_participants` update from `markAsPaid`**

Currently:
```typescript
const markAsPaid = composable(
  async (paymentRequestId, eventParticipantId, amount) => {
    await Promise.all([
      kyselyDb.updateTable("payment_requests")...,
      kyselyDb.updateTable("event_participants")..., // REMOVE THIS
    ])
  },
)
```

Keep only the `payment_requests` update.

**Step 2: Update tests — remove assertions about event_participants**

**Step 3: Run tests and commit**

```
refactor(payment): webhook only updates payment_requests, no dual-write
```

---

### Task 5: Update admin server — remove has_paid/payment from updateEventParticipantById

**Files:**
- Modify: `app/business/admin/admin.server.ts` — remove has_paid/payment from the update
- Modify: `app/business/admin/common.ts` — remove from schema
- Modify: `app/pages/admin/events/view-event-participant/view-event-participant.tsx` — remove `syncManualPaymentStatus`

**Step 1: Remove `has_paid` and `payment` from `updateEventParticipantByIdSchema`**

**Step 2: Remove `syncManualPaymentStatus` call from view-event-participant action**

**Step 3: Run tests and commit**

```
refactor(payment): remove has_paid/payment from admin update mutations
```

---

### Task 6: Rebuild participant detail — payment controls from payment_requests

**Files:**
- Modify: `app/components/pages/admin/participants/participant-vs-event-data.tsx` — replace has_paid checkbox + payment input with payment_requests-based UI
- Modify: `app/pages/admin/events/view-event-participant/view-event-participant.tsx` — new action intents

**Step 1: Remove old has_paid checkbox and payment input**

**Step 2: Add payment type selector dropdown**

```
Tipo de Pagamento: [Automático ▾]  (Automático / Manual)
```

- When status changes to `sent_payment_data`:
  - If Automático: creates payment_request with `payment_mode='automatic'`, sends email
  - If Manual: creates payment_request with `payment_mode='manual'`, no email

**Step 3: Add payment controls based on payment_mode**

- Automatic: amount, paid status, dates are READ-ONLY (managed by Asaas)
- Manual: amount is EDITABLE, "Marcar como pago" button, "Marcar como reembolsado" button

**Step 4: Keep custom amount checkbox (works for both modes)**

**Step 5: Update Payment Status Section to use payment_mode/payment_method**

**Step 6: Add new intents:**
- `mark-manual-payment-paid` — sets payment_requests status=paid, paid_at=now()
- `update-manual-payment-amount` — updates payment_requests amount

**Step 7: Run tests and commit**

```
feat(payment): rebuild participant detail payment controls on payment_requests
```

---

### Task 7: Rebuild participants table — payment columns from payment_requests

**Files:**
- Modify: `app/components/organisms/tables/admin/participants-table/view-event-participants-table.tsx`
- Modify: `app/business/admin/admin.server.ts` — `getProfilesWithExtraDataById` query
- Modify/Delete: `app/components/organisms/tables/admin/participants-table/payment-column-helpers.ts`
- Modify: `app/lib/helpers/propMaps.ts`

**Step 1: Update `getProfilesWithExtraDataById` query**

Add LEFT JOIN to payment_requests to fetch latest payment data per participant:
- `pr.status as payment_status`
- `pr.amount as payment_amount`
- `pr.payment_mode`
- `pr.paid_at`

**Step 2: Replace table columns**

Remove:
- `has_paid` checkbox column
- `payment` editable number column

Add:
- `payment_status` — display column showing status label (Pendente, Pago, Reembolsado, etc.)
- `payment_amount` — display column showing formatted currency
- `payment_mode` — display column (Automático / Manual)

**Step 3: Update filters**

Replace `hasPaidOptions` filter with `paymentStatusOptions` filter (richer: Pendente, Aguardando, Pago, Reembolsado, etc.)

**Step 4: Remove `payment-column-helpers.ts`** (no longer needed — `parsePaymentValue` and `shouldAutoCheckHasPaid` are obsolete)

**Step 5: Update `propMaps.ts`** — remove `hasPaidOptions`, add `paymentStatusOptions`

**Step 6: Run tests and commit**

```
feat(payment): rebuild participants table payment columns from payment_requests
```

---

### Task 8: Update financial summary and participant history

**Files:**
- Modify: `app/components/pages/admin/participants/financial-summary.tsx`
- Modify: `app/components/pages/admin/participants/participant-event-history.tsx`

These components read `payment` from `ParticipantEventHistoryData`. The query that feeds them (`getParticipantFullEventHistory`) needs to join payment_requests.

**Step 1: Update query to join payment_requests**

**Step 2: Update components to read from payment_requests fields**

**Step 3: Commit**

```
refactor(payment): financial summary and history read from payment_requests
```

---

## Phase 3: Drop deprecated columns

### Task 9: Drop has_paid and payment columns

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_drop_has_paid_payment_columns.sql`
- Modify: `app/types/database/database.types.ts` (auto-generated)

**Step 1: Write migration**

```sql
ALTER TABLE "public"."event_participants"
  DROP COLUMN "has_paid",
  DROP COLUMN "payment";
```

**Step 2: Run `supabase db reset` and `pnpm db:types --local`**

**Step 3: Fix any remaining type errors** (there shouldn't be any if Phase 2 was thorough)

**Step 4: Update seed data** — remove has_paid and payment from INSERT statements

**Step 5: Run ALL tests**

Run: `pnpm lint && pnpm test:unit && pnpm test:integration`

**Step 6: Commit**

```
feat(payment): drop has_paid and payment columns from event_participants
```

---

## Verification

After all tasks:

1. `pnpm lint` — no errors
2. `pnpm test:unit` — all pass
3. `pnpm test:integration` — all pass
4. Manual test:
   - Admin sets participant to `sent_payment_data` with Automático → email sent, payment page works
   - Admin sets participant to `sent_payment_data` with Manual → no email, admin can set amount and mark paid
   - Custom amount works for both modes
   - Dataviz shows correct revenue data
   - Participants table shows payment status from payment_requests
   - Refund works
   - Payment Status Section shows all fields

## Files Summary

### New
| File | Purpose |
|------|---------|
| `supabase/migrations/..._improve_payment_requests_schema.sql` | Add payment_mode/payment_method, drop billing_type |
| `supabase/migrations/..._backfill_payment_requests.sql` | Backfill historical data |
| `supabase/migrations/..._drop_has_paid_payment_columns.sql` | Drop deprecated columns |

### Modified (~20 files)
| File | Change |
|------|--------|
| `app/business/payment/trigger-payment-request.server.ts` | billing_type → payment_mode |
| `app/business/payment/payment-request.server.ts` | billing_type → payment_mode/payment_method, remove syncManualPaymentStatus |
| `app/routes/api.asaas-webhook.ts` | Remove dual-write to event_participants |
| `app/business/admin/admin.server.ts` | Remove has_paid/payment from update, add payment_requests join to queries |
| `app/business/admin/common.ts` | Remove has_paid/payment from schema |
| `app/business/admin/dataviz/event-metrics.server.ts` | Join payment_requests for revenue/conversion |
| `app/business/admin/dataviz/kpi-scores.server.ts` | Join payment_requests for revenue |
| `app/components/pages/admin/participants/participant-vs-event-data.tsx` | Rebuild payment UI |
| `app/components/pages/admin/participants/financial-summary.tsx` | Read from payment_requests |
| `app/components/pages/admin/participants/participant-event-history.tsx` | Read from payment_requests |
| `app/components/organisms/tables/admin/participants-table/view-event-participants-table.tsx` | Replace columns/filters |
| `app/pages/admin/events/view-event-participant/view-event-participant.tsx` | New intents, remove syncManualPaymentStatus |
| `app/pages/admin/events/view-event-page/view-event-page.tsx` | Update intent handler |
| `app/lib/helpers/propMaps.ts` | Replace hasPaidOptions with paymentStatusOptions |
| `app/types/database/entities.types.ts` | Update types |
| `supabase/seeds/04_event_participants.sql` | Remove has_paid/payment from seeds |

### Deleted
| File | Reason |
|------|--------|
| `app/components/organisms/tables/admin/participants-table/payment-column-helpers.ts` | Obsolete |
| `app/components/organisms/tables/admin/participants-table/payment-column-helpers.test.ts` | Obsolete |
