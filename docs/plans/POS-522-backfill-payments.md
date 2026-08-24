# POS-522 — Backfill historical payments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every payment recorded so far in `event_participants.has_paid` / `.payment` becomes a row in `payments`, so that dropping those columns later loses nothing.

**Architecture:** One idempotent migration. Everything historical was a PIX transfer arranged over WhatsApp and typed in by an admin, so every backfilled row is `kind = 'manual'`, `method = 'pix'`, `status = 'paid'`. The old column is reais with two decimals and the new one is integer cents, so the value is multiplied by 100. The columns stay in place — POS-524 drops them, and until then both descriptions of the same money coexist, which is exactly what makes the verification in Task 2 possible.

**Tech Stack:** PostgreSQL migration, Kysely, Vitest integration test.

**Spec:** `docs/plans/payments-v3-design.md` §3 ("Backfill"), §10 PR 3.

**Branch:** `pos-522-backfill-payments` from `main`, worktree `wt/pos-522-backfill-payments`.

**Depends on:** POS-521 (the table must exist) and POS-520 (`events.ticket_price` already in cents).

---

## The four historical shapes

Read from the seeds and from what production holds:

| `has_paid` | `payment` | Meaning | Backfilled as |
|---|---|---|---|
| `true` | `> 0` | Paid, amount known | `paid`, `amount = payment * 100` |
| `true` | `0` | Paid, amount never typed in | `paid`, `amount = events.ticket_price` (already cents), or 1 cent when the event has no price |
| `false` | `> 0` | Money arrived but the box was never ticked — POS-385 auto-ticks it today, so these are rows from before that shipped | `paid`, `amount = payment * 100` — the money is the fact, the checkbox is bookkeeping |
| `false` | `0` | Nothing paid | no row |

The third case is a judgement call and it is deliberate: the design says the ledger records money that moved. A row saying R$ 220 arrived is evidence that it did. Treating it as unpaid would erase a real payment from the participant's history and from the revenue charts.

---

### Task 1: The migration

**Files:**
- Create: `supabase/migrations/<timestamp>_backfill_payments.sql`

- [ ] **Step 1: Write the migration**

Timestamp from `date -u +%Y%m%d%H%M%S`.

```sql
-- Every payment recorded before the payments ledger existed lived in two
-- columns on event_participants: a boolean and an amount in reais. All of it
-- was arranged by hand — a PIX transfer agreed over WhatsApp, typed in by an
-- admin — so every row here is a manual PIX payment.
--
-- Idempotent: a participant that already has a payment is skipped, so applying
-- this twice cannot double anyone's history.
INSERT INTO public.payments (
  event_participant_id,
  kind,
  status,
  method,
  base_amount,
  amount,
  paid_at,
  due_at,
  note,
  created_at,
  updated_at
)
SELECT
  ep.id,
  'manual',
  'paid',
  'pix',
  -- What Positiv meant to receive: the event's price when it has one, else
  -- whatever arrived.
  GREATEST(
    COALESCE(NULLIF(e.ticket_price, 0), ROUND(ep.payment * 100)::int, 1),
    1
  ),
  -- What actually arrived. A row marked paid with no amount is credited with
  -- the ticket price, because that is what was agreed; a price of zero on both
  -- sides still has to satisfy amount > 0, hence the floor of one cent.
  GREATEST(
    COALESCE(NULLIF(ROUND(ep.payment * 100)::int, 0), NULLIF(e.ticket_price, 0), 1),
    1
  ),
  ep.updated_at,
  ep.updated_at,
  'backfill',
  ep.updated_at,
  ep.updated_at
FROM public.event_participants ep
JOIN public.events e ON e.id = ep.event_id
WHERE (ep.has_paid = true OR ep.payment > 0)
  AND NOT EXISTS (
    SELECT 1 FROM public.payments p WHERE p.event_participant_id = ep.id
  );
```

Two details worth not changing:

- `due_at = paid_at`: the table requires a due date, the history has none, and a date in the past cannot make a paid row look open (only `pending`/`awaiting_payment` rows are ever expired).
- `note = 'backfill'`: the only marker that separates a reconstructed row from one the system created. Reports and any later correction depend on it.

- [ ] **Step 2: Apply and verify**

Check the DB lock, then run: `supabase db reset`
Expected: applies cleanly.

Run the reconciliation by hand:

```bash
psql "$SUPABASE_CONNECT_URL" <<'SQL'
-- Every participant that had money recorded now has exactly one payment.
SELECT count(*) AS should_be_zero
  FROM public.event_participants ep
 WHERE (ep.has_paid = true OR ep.payment > 0)
   AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.event_participant_id = ep.id);

-- Nobody who had nothing recorded got a row.
SELECT count(*) AS should_be_zero
  FROM public.payments p
  JOIN public.event_participants ep ON ep.id = p.event_participant_id
 WHERE p.note = 'backfill' AND ep.has_paid = false AND ep.payment = 0;

-- The totals agree, for the rows where an amount was actually recorded.
SELECT
  (SELECT COALESCE(SUM(ROUND(payment * 100)::int), 0) FROM public.event_participants WHERE payment > 0) AS old_cents,
  (SELECT COALESCE(SUM(amount), 0) FROM public.payments p
     JOIN public.event_participants ep ON ep.id = p.event_participant_id
    WHERE p.note = 'backfill' AND ep.payment > 0) AS new_cents;
SQL
```
Expected: the first two are `0`; the third prints two equal numbers.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations
git commit -m "feat(payments): backfill the payments recorded before the ledger existed"
```

---

### Task 2: Integration test

**Files:**
- Create: `app/business/payment/backfill-payments.integration.test.ts`

The migration has already run against the test database by the time the suite starts, so the test cannot watch it happen on fixtures it creates. It re-runs the same statement against rows it inserts itself, which is the only way to assert the mapping without a second database.

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { sql } from "kysely"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestProfile,
} from "~/test/db-test-utils"

/**
 * The statement from 20260824…_backfill_payments.sql, kept in step with it by
 * hand. If the migration changes, this changes with it — the point of the test
 * is the mapping it describes, not that the file was executed.
 */
const BACKFILL = sql`
  INSERT INTO public.payments (
    event_participant_id, kind, status, method,
    base_amount, amount, paid_at, due_at, note, created_at, updated_at
  )
  SELECT
    ep.id, 'manual', 'paid', 'pix',
    GREATEST(COALESCE(NULLIF(e.ticket_price, 0), ROUND(ep.payment * 100)::int, 1), 1),
    GREATEST(COALESCE(NULLIF(ROUND(ep.payment * 100)::int, 0), NULLIF(e.ticket_price, 0), 1), 1),
    ep.updated_at, ep.updated_at, 'backfill', ep.updated_at, ep.updated_at
  FROM public.event_participants ep
  JOIN public.events e ON e.id = ep.event_id
  WHERE (ep.has_paid = true OR ep.payment > 0)
    AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.event_participant_id = ep.id)
`

describe("backfilling the payments ledger", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let eventId: string
  const participants: Record<string, string> = {}

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()

    const event = await createTestEvent(tracker, kysely, {
      title: "Backfill Event",
      ticket_price: 20000,
    })
    eventId = event.id

    const cases = {
      paidWithAmount: { has_paid: true, payment: 220 },
      paidWithoutAmount: { has_paid: true, payment: 0 },
      amountWithoutFlag: { has_paid: false, payment: 150 },
      nothing: { has_paid: false, payment: 0 },
    }

    for (const [name, columns] of Object.entries(cases)) {
      const profile = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: `test${testId}-${name}@example.com`,
        full_name: name,
      })
      const participant = await createTestEventParticipant(tracker, kysely, {
        event_id: eventId,
        profile_id: profile.id,
        ...columns,
      })
      participants[name] = participant.id
    }
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  async function paymentFor(participantId: string) {
    return kysely
      .selectFrom("payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .executeTakeFirst()
  }

  it("credits a paid participant with the amount that was recorded, in cents", async () => {
    await BACKFILL.execute(kysely)

    const payment = await paymentFor(participants.paidWithAmount)
    expect(payment).toMatchObject({
      kind: "manual",
      status: "paid",
      method: "pix",
      amount: 22000,
      base_amount: 20000,
      note: "backfill",
    })
    expect(payment?.paid_at).not.toBeNull()
  })

  it("credits a paid participant with no amount with the event's ticket price", async () => {
    await BACKFILL.execute(kysely)

    const payment = await paymentFor(participants.paidWithoutAmount)
    expect(payment?.amount).toBe(20000)
    expect(payment?.status).toBe("paid")
  })

  it("records money that arrived even when the paid box was never ticked", async () => {
    await BACKFILL.execute(kysely)

    const payment = await paymentFor(participants.amountWithoutFlag)
    expect(payment?.amount).toBe(15000)
    expect(payment?.status).toBe("paid")
  })

  it("leaves a participant who paid nothing without a row", async () => {
    await BACKFILL.execute(kysely)

    expect(await paymentFor(participants.nothing)).toBeUndefined()
  })

  it("is idempotent", async () => {
    await BACKFILL.execute(kysely)
    await BACKFILL.execute(kysely)

    const rows = await kysely
      .selectFrom("payments")
      .select("id")
      .where("event_participant_id", "=", participants.paidWithAmount)
      .execute()

    expect(rows).toHaveLength(1)
  })

  it("makes the view agree with the old columns", async () => {
    await BACKFILL.execute(kysely)

    const totals = await kysely
      .selectFrom("event_participant_payments")
      .selectAll()
      .where("event_participant_id", "=", participants.paidWithAmount)
      .executeTakeFirstOrThrow()

    expect(totals.paid_gross).toBe(22000)
    expect(totals.net).toBe(22000)
    expect(totals.fee).toBe(0)
    expect(totals.has_paid).toBe(true)
  })

  it("skips a participant who already has a payment", async () => {
    await kysely
      .insertInto("payments")
      .values({
        event_participant_id: participants.paidWithAmount,
        kind: "asaas",
        status: "paid",
        method: "credit_card",
        base_amount: 20000,
        amount: 21000,
        paid_at: new Date().toISOString(),
        due_at: new Date().toISOString(),
      })
      .execute()

    await BACKFILL.execute(kysely)

    const rows = await kysely
      .selectFrom("payments")
      .select(["amount", "note"])
      .where("event_participant_id", "=", participants.paidWithAmount)
      .execute()

    expect(rows).toHaveLength(1)
    expect(rows[0].amount).toBe(21000)
  })
})
```

The rows this test inserts are tracked, so `cleanupAfterTest` removes the payments before the participants — which is exactly the ordering Task 6 of POS-521 put in place. If cleanup fails here with a foreign-key error, that ordering is wrong.

- [ ] **Step 2: Run test to verify it fails**

Run it **before** adding the migration from Task 1 (or on a branch where it is reverted): the statement inserts nothing because `payments` does not exist, or every expectation is `undefined`.

Run: `pnpm test:integration -- --changed`
Expected: FAIL.

- [ ] **Step 3: Run test to verify it passes**

With Task 1 applied.

Run: `pnpm test:integration`
Expected: PASS, whole integration suite.

- [ ] **Step 4: Commit**

```bash
git add app/business/payment/backfill-payments.integration.test.ts
git commit -m "test(payments): assert the backfill mapping and its idempotence"
```

---

### Task 3: Production dry run note

**Files:**
- Modify: the PR description only

- [ ] **Step 1: Record the expected production numbers**

Before merging, run the read-only half of the reconciliation against production's connection string — no writes:

```bash
psql "$PRODUCTION_SUPABASE_CONNECT_URL" <<'SQL'
SELECT
  count(*) FILTER (WHERE has_paid = true AND payment > 0)  AS paid_with_amount,
  count(*) FILTER (WHERE has_paid = true AND payment = 0)  AS paid_without_amount,
  count(*) FILTER (WHERE has_paid = false AND payment > 0) AS amount_without_flag,
  COALESCE(SUM(ROUND(payment * 100)::int), 0)              AS total_cents
FROM public.event_participants;
SQL
```

Put the four numbers in the PR body under Implementation Notes. After the deploy, the same counts must appear in `payments` — the first three sum to the number of `note = 'backfill'` rows, and `total_cents` matches the sum of `amount` over the rows whose participant had `payment > 0`.

Never pass the connection string on the command line as a literal — read it from the env file or the secret manager, as `CLAUDE.md` requires.

- [ ] **Step 2: Verify after the deploy**

Once `main` is deployed, run the reconciliation from Task 1 Step 2 against production and confirm the two zeroes and the matching totals.

---

### Task 4: Full verification

- [ ] Run: `supabase db reset` — clean
- [ ] Run: `pnpm lint` — clean
- [ ] Run: `pnpm test` — unit and integration green

## Definition of done

- PR title: `[POS-522] Backfill the payments recorded before the ledger existed`
- `Fixes POS-522`; the production counts from Task 3 in the body
- Delete this plan file before opening the PR
- No news item
