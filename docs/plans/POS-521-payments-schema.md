# POS-521 — `payments` schema, view, RLS, expiry cron — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The tables, view, constraints and cron that make `payments` the single source of truth for money — with nothing reading them yet.

**Architecture:** One migration per concern, applied in one PR: enums + `payments`, the webhook inbox, `profiles.asaas_customer_id`, the read view, the `updated_at` trigger, and the expiry cron. Constraints do the work the application would otherwise have to remember: a paid row must carry an amount and a timestamp, a partial refund must be smaller than the amount, and a partial unique index allows at most one open charge per participant. Nothing in `app/` reads any of this until POS-523.

**Tech Stack:** PostgreSQL (Supabase CLI migrations), pg_cron, Kysely, Vitest integration tests.

**Spec:** `docs/plans/payments-v3-design.md` §3 and §4.

**Branch:** `pos-521-payments-schema` from `main`, worktree `wt/pos-521-payments-schema`.

**Depends on:** POS-520 (money in cents). Do not start before it merges — the backfill in POS-522 reads `events.ticket_price` as cents.

---

## A decision this plan makes explicit

`payments.event_participant_id` is `ON DELETE RESTRICT`, as the spec says. That is deliberate: a financial record must not vanish because someone deleted a participation row. The cost is that every cleanup path which deletes `event_participants` — `cleanupTestData` in `app/test/db-test-utils.ts`, `e2e/utils/db-cleanup.ts`, and the integration global setup's TRUNCATE — must delete `payments` first. Task 6 does that. If a later PR hits a foreign-key error while deleting participants, the fix is to delete the payments first, never to relax the constraint.

---

### Task 1: Enums and the `payments` table

**Files:**
- Create: `supabase/migrations/<timestamp>_create_payments.sql`

- [ ] **Step 1: Write the migration**

Timestamp from `date -u +%Y%m%d%H%M%S`.

```sql
-- The payments ledger: one row per charge attempt or per payment recorded by
-- hand. This is the only place money lives; event_participants keeps none.
--
-- Every amount is an integer number of cents.

DO $$ BEGIN
  CREATE TYPE public.payment_kind AS ENUM ('asaas', 'manual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'awaiting_payment',
    'paid',
    'expired',
    'cancelled',
    'refunded',
    'partially_refunded'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'pix',
    'credit_card',
    'cash',
    'transfer',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_participant_id uuid NOT NULL
                         REFERENCES public.event_participants(id) ON DELETE RESTRICT,
  kind                 public.payment_kind NOT NULL,
  status               public.payment_status NOT NULL DEFAULT 'pending',
  base_amount          integer NOT NULL CHECK (base_amount > 0),
  amount               integer CHECK (amount > 0),
  method               public.payment_method,
  installment_count    integer CHECK (installment_count BETWEEN 1 AND 6),
  asaas_customer_id    text,
  asaas_payment_id     text,
  asaas_installment_id text,
  asaas_invoice_url    text,
  asaas_net            integer,
  due_at               timestamptz NOT NULL,
  paid_at              timestamptz,
  refund_requested_at  timestamptz,
  refunded_at          timestamptz,
  refund_amount        integer CHECK (refund_amount > 0),
  created_by           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note                 text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payments_paid_shape
    CHECK ((status IN ('paid', 'refunded', 'partially_refunded'))
           = (paid_at IS NOT NULL AND amount IS NOT NULL)),

  CONSTRAINT payments_refund_shape
    CHECK ((status IN ('refunded', 'partially_refunded'))
           = (refunded_at IS NOT NULL AND refund_amount IS NOT NULL)),

  CONSTRAINT payments_refund_bounded
    CHECK (refund_amount IS NULL OR refund_amount <= amount),

  CONSTRAINT payments_partial_is_partial
    CHECK (status <> 'partially_refunded'
           OR (refund_amount IS NOT NULL AND refund_amount < amount)),

  CONSTRAINT payments_manual_shape
    CHECK (kind <> 'manual'
           OR (asaas_payment_id IS NULL
               AND method IN ('pix', 'cash', 'transfer', 'other'))),

  CONSTRAINT payments_asaas_shape
    CHECK (kind <> 'asaas'
           OR method IS NULL
           OR method IN ('pix', 'credit_card')),

  CONSTRAINT payments_installments_only_on_card
    CHECK (installment_count IS NULL OR method = 'credit_card')
);

-- At most one open charge per participant: "cancel the old, insert the new"
-- is then safe under concurrency — the loser of a race fails instead of
-- creating a second live charge.
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_active_per_participant
  ON public.payments (event_participant_id)
  WHERE status IN ('pending', 'awaiting_payment');

CREATE UNIQUE INDEX IF NOT EXISTS payments_asaas_payment_id
  ON public.payments (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_asaas_installment_id
  ON public.payments (asaas_installment_id)
  WHERE asaas_installment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_event_participant_id
  ON public.payments (event_participant_id);

CREATE INDEX IF NOT EXISTS payments_due_active
  ON public.payments (due_at)
  WHERE status IN ('pending', 'awaiting_payment');

ALTER TABLE public.payments OWNER TO postgres;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.payments TO service_role;
REVOKE ALL ON TABLE public.payments FROM anon, authenticated;

DROP POLICY IF EXISTS service_role_all_access_payments ON public.payments;
CREATE POLICY service_role_all_access_payments ON public.payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_deny_payments ON public.payments;
CREATE POLICY anon_deny_payments ON public.payments
  FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS authenticated_deny_payments ON public.payments;
CREATE POLICY authenticated_deny_payments ON public.payments
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.payments IS
'Every charge attempt and every payment recorded by hand. Single source of truth
for what a participant paid; event_participants holds no money fields. All
amounts are integer cents.';

COMMENT ON COLUMN public.payments.base_amount IS
'What Positiv must net: the ticket price, or a custom amount set by an admin.';

COMMENT ON COLUMN public.payments.amount IS
'Gross actually charged, fees included. NULL until the participant picks an
option; for a manual payment it is what was received.';

COMMENT ON COLUMN public.payments.asaas_net IS
'netValue reported by Asaas. amount - asaas_net is the fee Asaas took, and the
audit of the pricing formula.';

COMMENT ON COLUMN public.payments.due_at IS
'When the charge stops being payable. The expire-payments cron and the Asaas
PAYMENT_OVERDUE event both act on it.';
```

- [ ] **Step 2: Apply and verify**

Check the DB lock, then run: `supabase db reset`
Expected: applies cleanly.

Run:
```bash
psql "$SUPABASE_CONNECT_URL" -c "\d public.payments"
```
Expected: all columns, all seven CHECK constraints, five indexes, RLS enabled.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations
git commit -m "feat(payments): create the payments ledger"
```

---

### Task 2: `updated_at` trigger

**Files:**
- Create: `supabase/migrations/<timestamp>_payments_updated_at.sql`

Follows `20251226171113_add_updated_at_to_event_participants.sql` exactly.

- [ ] **Step 1: Write the migration**

```sql
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS payments_updated_at_trigger ON public.payments;
CREATE TRIGGER payments_updated_at_trigger
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_payments_updated_at();
```

Application code must not set `updated_at` by hand — the trigger owns it.

- [ ] **Step 2: Apply and verify**

Run: `supabase db reset`
Run:
```bash
psql "$SUPABASE_CONNECT_URL" -c "SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.payments'::regclass AND NOT tgisinternal;"
```
Expected: `payments_updated_at_trigger`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations
git commit -m "feat(payments): keep updated_at current with a trigger"
```

---

### Task 3: Webhook inbox and the Asaas customer id

**Files:**
- Create: `supabase/migrations/<timestamp>_payment_webhook_events.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Every webhook Asaas delivers is written here before anything acts on it.
-- Asaas guarantees at-least-once delivery with a stable event id, so the unique
-- index is what makes a redelivery a no-op.
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_event_id   text NOT NULL UNIQUE,
  event_type       text NOT NULL,
  asaas_payment_id text,
  payload          jsonb NOT NULL,
  received_at      timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz,
  error            text
);

CREATE INDEX IF NOT EXISTS payment_webhook_events_unprocessed
  ON public.payment_webhook_events (received_at)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS payment_webhook_events_asaas_payment_id
  ON public.payment_webhook_events (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

ALTER TABLE public.payment_webhook_events OWNER TO postgres;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.payment_webhook_events TO service_role;
REVOKE ALL ON TABLE public.payment_webhook_events FROM anon, authenticated;

DROP POLICY IF EXISTS service_role_all_access_payment_webhook_events
  ON public.payment_webhook_events;
CREATE POLICY service_role_all_access_payment_webhook_events
  ON public.payment_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_deny_payment_webhook_events ON public.payment_webhook_events;
CREATE POLICY anon_deny_payment_webhook_events ON public.payment_webhook_events
  FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS authenticated_deny_payment_webhook_events ON public.payment_webhook_events;
CREATE POLICY authenticated_deny_payment_webhook_events ON public.payment_webhook_events
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.payment_webhook_events IS
'Inbox for Asaas webhooks: dedupes redeliveries by asaas_event_id and keeps the
raw payload for auditing. processed_at is set once the transition is applied;
error records why it was not.';

-- One Asaas customer per person, reused across events so Asaas does not
-- accumulate a duplicate customer per charge.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS asaas_customer_id text;

DO $$ BEGIN
  CREATE UNIQUE INDEX profiles_asaas_customer_id
    ON public.profiles (asaas_customer_id)
    WHERE asaas_customer_id IS NOT NULL;
EXCEPTION WHEN duplicate_table THEN null; END $$;

COMMENT ON COLUMN public.profiles.asaas_customer_id IS
'Asaas customer id (cus_...), created on the first charge and reused afterwards.';
```

- [ ] **Step 2: Apply and verify**

Run: `supabase db reset`
Run: `psql "$SUPABASE_CONNECT_URL" -c "\d public.payment_webhook_events"`
Expected: the table with the unique constraint on `asaas_event_id`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations
git commit -m "feat(payments): add the webhook inbox and the Asaas customer id"
```

---

### Task 4: The read view

**Files:**
- Create: `supabase/migrations/<timestamp>_event_participant_payments_view.sql`

- [ ] **Step 1: Write the migration**

```sql
-- What every reader asks about a participant's money. Built as a view so the
-- grid, the financial summary, the history and the dataviz queries all agree by
-- construction instead of by convention.
--
-- gross:    what the participant was charged, fees included
-- fee:      what Asaas kept (zero for a manual payment)
-- net:      what Positiv kept, refunds already deducted
CREATE OR REPLACE VIEW public.event_participant_payments AS
SELECT
  ep.id AS event_participant_id,

  COALESCE(SUM(p.amount) FILTER (
    WHERE p.status IN ('paid', 'refunded', 'partially_refunded')
  ), 0)::int AS paid_gross,

  COALESCE(SUM(p.refund_amount) FILTER (
    WHERE p.status IN ('refunded', 'partially_refunded')
  ), 0)::int AS refunded,

  COALESCE(SUM(p.amount - COALESCE(p.asaas_net, p.amount)) FILTER (
    WHERE p.status IN ('paid', 'refunded', 'partially_refunded')
  ), 0)::int AS fee,

  COALESCE(SUM(
    COALESCE(p.asaas_net, p.amount) - COALESCE(p.refund_amount, 0)
  ) FILTER (
    WHERE p.status IN ('paid', 'refunded', 'partially_refunded')
  ), 0)::int AS net,

  COALESCE(BOOL_OR(p.status IN ('paid', 'partially_refunded')), false) AS has_paid,

  (
    SELECT a.status
      FROM public.payments a
     WHERE a.event_participant_id = ep.id
     ORDER BY (a.status IN ('pending', 'awaiting_payment')) DESC, a.created_at DESC
     LIMIT 1
  ) AS current_status,

  (
    SELECT a.id
      FROM public.payments a
     WHERE a.event_participant_id = ep.id
       AND a.status IN ('pending', 'awaiting_payment')
     LIMIT 1
  ) AS active_payment_id

FROM public.event_participants ep
LEFT JOIN public.payments p ON p.event_participant_id = ep.id
GROUP BY ep.id;

ALTER VIEW public.event_participant_payments SET (security_invoker = true);

GRANT SELECT ON public.event_participant_payments TO service_role;
REVOKE ALL ON public.event_participant_payments FROM anon, authenticated;

COMMENT ON VIEW public.event_participant_payments IS
'Per-participant money totals in cents. The one read surface for the admin grid,
the financial summary, the participant history and the dataviz queries.';
```

`security_invoker = true` keeps the view from becoming a way around the RLS on `payments` — without it a view owned by `postgres` runs with the owner's rights.

- [ ] **Step 2: Apply and verify by hand**

Run: `supabase db reset`

Run this scratch check (it inserts, reads, and rolls back):

```bash
psql "$SUPABASE_CONNECT_URL" <<'SQL'
BEGIN;
WITH ep AS (SELECT id FROM public.event_participants LIMIT 1)
INSERT INTO public.payments (event_participant_id, kind, status, base_amount, amount, method, asaas_net, paid_at, due_at)
SELECT id, 'asaas', 'paid', 22000, 23026, 'credit_card', 22050, now(), now() + interval '7 days' FROM ep;

SELECT paid_gross, fee, net, has_paid, current_status
  FROM public.event_participant_payments
 WHERE event_participant_id = (SELECT id FROM public.event_participants LIMIT 1);
ROLLBACK;
SQL
```
Expected: `paid_gross = 23026`, `fee = 976`, `net = 22050`, `has_paid = t`, `current_status = paid`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations
git commit -m "feat(payments): add the per-participant totals view"
```

---

### Task 5: Expiry cron

**Files:**
- Create: `supabase/migrations/<timestamp>_expire_payments_cron.sql`

- [ ] **Step 1: Write the migration**

Pure SQL — no HTTP, so unlike the newsletter jobs it can run locally too. It still follows the same idempotent unschedule/schedule shape.

```sql
-- A charge stops being payable at due_at. Asaas sends PAYMENT_OVERDUE for a
-- charge that reached it, but a row still in 'pending' has no Asaas charge yet,
-- so nothing outside would ever close it.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-payments') THEN
    PERFORM cron.unschedule('expire-payments');
  END IF;

  PERFORM cron.schedule(
    'expire-payments',
    '*/15 * * * *',
    $job$
    UPDATE public.payments
       SET status = 'expired'
     WHERE status IN ('pending', 'awaiting_payment')
       AND due_at < now();
    $job$
  );
END $do$;
```

- [ ] **Step 2: Apply and verify**

Run: `supabase db reset`
Run: `psql "$SUPABASE_CONNECT_URL" -c "SELECT jobname, schedule FROM cron.job WHERE jobname = 'expire-payments';"`
Expected: one row, `*/15 * * * *`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations
git commit -m "feat(payments): expire overdue charges on a schedule"
```

---

### Task 6: Types, test factory and cleanup order

**Files:**
- Modify: `app/types/database/database.types.ts` (generated)
- Modify: `app/test/db-test-utils.ts`
- Modify: `app/test/integration-global-setup.ts`
- Modify: `e2e/utils/db-cleanup.ts`

- [ ] **Step 1: Regenerate the types**

Run: `pnpm db:types --local`
Expected: `payments`, `payment_webhook_events` under `Tables`, `event_participant_payments` under `Views` (which was `[_ in never]: never`), the three enums under `Enums`, and `asaas_customer_id` on `profiles`.

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 2: Write the failing test for the factory**

Create `app/test/db-test-utils.test.ts` if absent, or add to the schema integration test in Task 7. The factory is exercised by Task 7's tests; write those first if you prefer strict TDD ordering — the factory has no behaviour of its own worth a unit test.

- [ ] **Step 3: Add the factory and the cleanup order**

In `app/test/db-test-utils.ts`, add `payments` **before** `event_participants` in `tableOrder` (it is deleted first because of `ON DELETE RESTRICT`):

```ts
  const tableOrder = [
    "payments",
    "event_participants",
    "event_demographics_history",
    "events",
    "user_roles",
    "profiles"
  ]
```

and the matching case in the switch:

```ts
        case "payments":
          await kysely
            .deleteFrom("payments")
            .where("id", "in", ids)
            .execute()
          break
```

Add the factory next to `createTestEventParticipant`:

```ts
interface TestPaymentData {
  event_participant_id: string
  [key: string]: unknown
}

/**
 * A payments row for a fixture. Defaults describe the common case — an Asaas
 * charge already paid in full — so a test only states what it cares about.
 */
export async function createTestPayment(
  tracker: TestDataTracker,
  kysely: Kysely<Database>,
  data: TestPaymentData,
): Promise<Selectable<Database["payments"]>> {
  const now = new Date().toISOString()
  const defaults = {
    kind: "manual" as const,
    status: "paid" as const,
    base_amount: 22000,
    amount: 22000,
    method: "pix" as const,
    paid_at: now,
    due_at: now,
  }

  const row = await kysely
    .insertInto("payments")
    .values({ ...defaults, ...data } as Insertable<Database["payments"]>)
    .returningAll()
    .executeTakeFirstOrThrow()

  tracker.track("payments", row.id)
  return row
}
```

In `app/test/integration-global-setup.ts`, add both tables to `TABLES`, after `event_participants` (they reference it, so they are inserted last on restore):

```ts
  "event_participants",         // seeded; wiped by kpi-scores and dataviz (no WHERE)
  "payments",                   // references event_participants; RESTRICT, so restored after it
  "payment_webhook_events",     // independent, but snapshotted so a suite cannot leak events
```

In `e2e/utils/db-cleanup.ts`, delete `payments` for the participants being removed before deleting the participants themselves. Find the function that deletes `event_participants` and add, immediately before it:

```ts
  // payments references event_participants with RESTRICT, so it goes first.
  await supabase.from("payments").delete().in("event_participant_id", participantIds)
```

- [ ] **Step 4: Run the suites**

Run: `pnpm lint`
Run: `pnpm test`
Expected: both green — nothing reads the new tables yet, so the only risk is a broken cleanup.

- [ ] **Step 5: Commit**

```bash
git add app/types/database app/test e2e/utils/db-cleanup.ts
git commit -m "test(payments): add the payments fixture and clean it up first"
```

---

### Task 7: Integration tests for the constraints and the view

**Files:**
- Create: `app/business/payment/payments-schema.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { sql } from "kysely"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"

describe("payments schema", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string
  let otherParticipantId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Payments Schema Event",
      ticket_price: 22000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-payments@example.com`,
      full_name: "Payments Tester",
    })
    const other = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-payments-2@example.com`,
      full_name: "Payments Tester Two",
    })
    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profile.id,
      })
    ).id
    otherParticipantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: other.id,
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  describe("constraints", () => {
    it("refuses a paid row without an amount", async () => {
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          status: "paid",
          amount: null,
        }),
      ).rejects.toThrow(/payments_paid_shape/)
    })

    it("refuses a pending row that carries a paid timestamp", async () => {
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          status: "pending",
          amount: null,
          paid_at: new Date().toISOString(),
        }),
      ).rejects.toThrow(/payments_paid_shape/)
    })

    it("refuses a partial refund that is not smaller than the amount", async () => {
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          status: "partially_refunded",
          amount: 22000,
          refund_amount: 22000,
          refunded_at: new Date().toISOString(),
        }),
      ).rejects.toThrow(/payments_partial_is_partial/)
    })

    it("refuses a refund larger than the amount", async () => {
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          status: "refunded",
          amount: 22000,
          refund_amount: 30000,
          refunded_at: new Date().toISOString(),
        }),
      ).rejects.toThrow(/payments_refund_bounded/)
    })

    it("refuses a manual row carrying an Asaas payment id", async () => {
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          kind: "manual",
          asaas_payment_id: "pay_1",
        }),
      ).rejects.toThrow(/payments_manual_shape/)
    })

    it("refuses installments on anything but a card", async () => {
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          kind: "asaas",
          method: "pix",
          installment_count: 3,
        }),
      ).rejects.toThrow(/payments_installments_only_on_card/)
    })

    it("refuses a second open charge for the same participant", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        status: "pending",
        amount: null,
        method: null,
        paid_at: null,
      })

      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          kind: "asaas",
          status: "awaiting_payment",
          amount: null,
          method: null,
          paid_at: null,
        }),
      ).rejects.toThrow(/payments_one_active_per_participant/)
    })

    it("allows a new charge once the previous one is cancelled", async () => {
      const first = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        status: "pending",
        amount: null,
        method: null,
        paid_at: null,
      })

      await kysely
        .updateTable("payments")
        .set({ status: "cancelled" })
        .where("id", "=", first.id)
        .execute()

      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          kind: "asaas",
          status: "pending",
          amount: null,
          method: null,
          paid_at: null,
        }),
      ).resolves.toBeDefined()
    })

    it("allows several paid rows for the same participant", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        amount: 11000,
      })
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          amount: 11000,
        }),
      ).resolves.toBeDefined()
    })

    it("refuses deleting a participant that has a payment", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
      })

      await expect(
        kysely.deleteFrom("event_participants").where("id", "=", participantId).execute(),
      ).rejects.toThrow()
    })
  })

  describe("updated_at trigger", () => {
    it("moves updated_at on every update", async () => {
      const payment = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
      })

      const after = await kysely
        .updateTable("payments")
        .set({ note: "touched" })
        .where("id", "=", payment.id)
        .returning(["updated_at"])
        .executeTakeFirstOrThrow()

      expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
        new Date(payment.updated_at).getTime(),
      )
    })
  })

  describe("event_participant_payments view", () => {
    it("reports zeros for a participant with no payments", async () => {
      const row = await kysely
        .selectFrom("event_participant_payments")
        .selectAll()
        .where("event_participant_id", "=", otherParticipantId)
        .executeTakeFirstOrThrow()

      expect(row).toMatchObject({
        paid_gross: 0,
        refunded: 0,
        fee: 0,
        net: 0,
        has_paid: false,
        current_status: null,
        active_payment_id: null,
      })
    })

    it("splits gross, fee and net for an Asaas payment", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        method: "credit_card",
        installment_count: 3,
        base_amount: 22000,
        amount: 23454,
        asaas_net: 22010,
      })

      const row = await kysely
        .selectFrom("event_participant_payments")
        .selectAll()
        .where("event_participant_id", "=", participantId)
        .executeTakeFirstOrThrow()

      expect(row.paid_gross).toBe(23454)
      expect(row.fee).toBe(1444)
      expect(row.net).toBe(22010)
      expect(row.has_paid).toBe(true)
      expect(row.current_status).toBe("paid")
    })

    it("treats a manual payment as fee-free", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "manual",
        method: "pix",
        amount: 22000,
      })

      const row = await kysely
        .selectFrom("event_participant_payments")
        .selectAll()
        .where("event_participant_id", "=", participantId)
        .executeTakeFirstOrThrow()

      expect(row.fee).toBe(0)
      expect(row.net).toBe(22000)
    })

    it("deducts a refund from net and keeps it in gross", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "manual",
        method: "pix",
        amount: 22000,
        status: "partially_refunded",
        refund_amount: 5000,
        refunded_at: new Date().toISOString(),
      })

      const row = await kysely
        .selectFrom("event_participant_payments")
        .selectAll()
        .where("event_participant_id", "=", participantId)
        .executeTakeFirstOrThrow()

      expect(row.paid_gross).toBe(22000)
      expect(row.refunded).toBe(5000)
      expect(row.net).toBe(17000)
      expect(row.has_paid).toBe(true)
    })

    it("sums several payments", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        amount: 11000,
      })
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        amount: 11000,
      })

      const row = await kysely
        .selectFrom("event_participant_payments")
        .selectAll()
        .where("event_participant_id", "=", participantId)
        .executeTakeFirstOrThrow()

      expect(row.paid_gross).toBe(22000)
      expect(row.net).toBe(22000)
    })

    it("prefers the open charge when reporting the current status", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        status: "expired",
        amount: null,
        paid_at: null,
        method: null,
        kind: "asaas",
      })
      const active = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        status: "pending",
        amount: null,
        paid_at: null,
        method: null,
        kind: "asaas",
      })

      const row = await kysely
        .selectFrom("event_participant_payments")
        .selectAll()
        .where("event_participant_id", "=", participantId)
        .executeTakeFirstOrThrow()

      expect(row.current_status).toBe("pending")
      expect(row.active_payment_id).toBe(active.id)
    })
  })

  describe("expiry statement", () => {
    it("expires an overdue open charge and leaves everything else alone", async () => {
      const overdue = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        status: "pending",
        amount: null,
        method: null,
        paid_at: null,
        due_at: new Date(Date.now() - 60_000).toISOString(),
      })
      const paid = await createTestPayment(tracker, kysely, {
        event_participant_id: otherParticipantId,
        due_at: new Date(Date.now() - 60_000).toISOString(),
      })

      await sql`
        UPDATE public.payments
           SET status = 'expired'
         WHERE status IN ('pending', 'awaiting_payment')
           AND due_at < now()
      `.execute(kysely)

      const after = await kysely
        .selectFrom("payments")
        .select(["id", "status"])
        .where("id", "in", [overdue.id, paid.id])
        .execute()

      expect(after.find((r) => r.id === overdue.id)?.status).toBe("expired")
      expect(after.find((r) => r.id === paid.id)?.status).toBe("paid")
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Before Task 1's migration exists this file fails to compile; run it now (after Tasks 1–6) and it should pass. To honour red-green, run the suite **after writing the test but before Task 6's factory** — it fails on `createTestPayment` not being exported.

Run: `pnpm test:integration`

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm test:integration`
Expected: PASS, whole integration suite.

- [ ] **Step 4: Commit**

```bash
git add app/business/payment/payments-schema.integration.test.ts
git commit -m "test(payments): assert the ledger constraints and the totals view"
```

---

### Task 8: Full verification

- [ ] Run: `supabase db reset` — clean from scratch
- [ ] Run: `pnpm lint` — clean
- [ ] Run: `pnpm test` — unit and integration green
- [ ] Run: `git diff main --stat` — only migrations, generated types, test utils and the new test

## Definition of done

- PR title: `[POS-521] Add the payments ledger, its totals view and the expiry cron`
- `Fixes POS-521`; body per `.github/pull_request_template.md`, with the `ON DELETE RESTRICT` decision under Implementation Notes
- Delete this plan file before opening the PR
- No news item: nothing user-visible changes
