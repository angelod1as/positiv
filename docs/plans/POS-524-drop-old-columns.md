# POS-524 — Drop `has_paid` and `payment` from `event_participants` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The two columns leave the schema, so there is exactly one description of what a participant paid.

**Architecture:** One migration and a sweep. By the time this runs, POS-523 has left nothing reading or writing the columns, so the migration is the last step of a move rather than a change of behaviour. The index on `has_paid` goes with it.

**Tech Stack:** PostgreSQL migration, generated types, Vitest.

**Spec:** `docs/plans/payments-v3-design.md` §10 PR 5.

**Branch:** `pos-524-drop-old-columns` from `main`, worktree `wt/pos-524-drop-old-columns`.

**Depends on:** POS-523 merged **and deployed**. Dropping a column that a running production build still selects takes the site down; the deploy of POS-523 must be live and healthy first.

---

### Task 1: Prove nothing reads them

**Files:** none — this is a gate.

- [ ] **Step 1: Search the source**

Run:
```bash
grep -rn "has_paid\|hasPaid" app e2e scripts supabase/seeds \
  --include='*.ts' --include='*.tsx' --include='*.sql' \
  | grep -v "app/types/database/database.types.ts"
```
Expected: no output. Any hit must be removed before the migration is written — a `.set({ has_paid })` left behind fails at runtime, not at compile time, because Kysely types come from the generated file which still declares the column.

Run:
```bash
grep -rn "event_participants" app --include='*.ts' | grep -n "\.payment\b"
```
Expected: no output.

- [ ] **Step 2: Search the database for writers outside the app**

Run:
```bash
psql "$SUPABASE_CONNECT_URL" <<'SQL'
SELECT p.proname
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND (p.prosrc ILIKE '%has_paid%' OR p.prosrc ILIKE '%event_participants.payment%');
SQL
```
Expected: no rows. A trigger function or an RPC still naming the columns would break on the drop.

---

### Task 2: The migration

**Files:**
- Create: `supabase/migrations/<timestamp>_drop_event_participant_money_columns.sql`

- [ ] **Step 1: Write the migration**

```sql
-- The payments ledger has been the source of truth since POS-523; these two
-- columns are the last copy of the same facts. The index on has_paid goes with
-- them.
--
-- The data they held was moved by 20260824…_backfill_payments.sql. To read the
-- old values after this point, restore a backup taken before it — nothing in
-- the running database keeps them.
DROP INDEX IF EXISTS public.idx_event_participants_has_paid;

ALTER TABLE public.event_participants
  DROP COLUMN IF EXISTS has_paid,
  DROP COLUMN IF EXISTS payment;
```

- [ ] **Step 2: Apply and verify**

Check the DB lock, then run: `supabase db reset`
Expected: applies cleanly.

Run:
```bash
psql "$SUPABASE_CONNECT_URL" -c "\d public.event_participants" | grep -E "has_paid|payment"
```
Expected: no output (`time_payment_*` lives on `events`, not here).

- [ ] **Step 3: Regenerate the types**

Run: `pnpm db:types --local`
Expected: `has_paid` and `payment` gone from the `event_participants` Row/Insert/Update blocks in `app/types/database/database.types.ts`.

Run: `pnpm lint`
Expected: clean. If `tsc` now fails somewhere, Task 1's search missed a reader — fix it here rather than reverting.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations app/types/database
git commit -m "feat(payments): drop has_paid and payment from event_participants"
```

---

### Task 3: Clean up what the types were propping up

**Files:**
- Modify: `app/types/database/entities.types.ts` — `EventParticipant`, `ParticipantVsEvent`, `EventParticipantWithEvent` lose the two fields automatically through `Selectable<>`; anything that re-declared them by hand must go
- Modify: any fixture that still passes them

- [ ] **Step 1: Write the failing test**

Add to `app/business/payment/payments-schema.integration.test.ts` (created in POS-521):

```ts
  it("no longer carries money columns on event_participants", async () => {
    const { rows } = await sql<{ column_name: string }>`
      SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'event_participants'
         AND column_name IN ('has_paid', 'payment')
    `.execute(kysely)

    expect(rows).toHaveLength(0)
  })
```

- [ ] **Step 2: Run the suites**

Run: `pnpm test:unit`
Run: `pnpm test:integration`
Expected: both green. A failure here names a fixture still setting the columns — delete the field from it.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(payments): assert the money columns are gone"
```

---

### Task 4: Full verification

- [ ] Run: `supabase db reset` — clean from scratch
- [ ] Run: `pnpm lint` — clean
- [ ] Run: `pnpm test` — green
- [ ] Run: `pnpm build` — succeeds (the production build is what the deploy runs)
- [ ] Run E2E **once, last**, after checking the lock: `pnpm test:e2e`
- [ ] Confirm POS-523 is live in production before merging this one

## Definition of done

- PR title: `[POS-524] Drop the money columns from event_participants`
- `Fixes POS-524`; Breaking Changes says the columns are gone and names the backfill migration as where the data went
- Delete this plan file before opening the PR
- No news item — POS-523 already announced the change users can see
