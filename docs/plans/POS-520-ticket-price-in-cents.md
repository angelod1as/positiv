# POS-520 — `events.ticket_price` in integer cents — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every money value in the schema and in TypeScript is an integer number of cents, formatted for display by one shared helper.

**Architecture:** One migration converts `events.ticket_price` from `numeric(10,2)` to `integer` (`ROUND(value * 100)`). A new pure helper `formatCurrency(cents)` replaces the three ad-hoc formatters. The admin still types reais in the event form, so the form's schema converts on the way in and `toEventAnswers` converts on the way out — the conversion lives at that one boundary and nowhere else.

**Tech Stack:** PostgreSQL migration (Supabase CLI), Kysely, zod v4, React, Vitest.

**Spec:** `docs/plans/payments-v3-design.md` §3 ("`events.ticket_price numeric(10,2)` → `integer` cents in its own migration"), §10 PR 1. Supersedes the cancelled POS-467.

**Branch:** `pos-520-ticket-price-in-cents` from `main`, worktree `wt/pos-520-ticket-price-in-cents`.

**Non-negotiables from CLAUDE.md:** TDD (red before green), no `@ts-ignore`, no skipped tests, `pnpm lint` and `pnpm test` green before the PR, `supabase db reset` from a clean state, migrations never edited after being applied.

---

### Task 1: The shared `formatCurrency` helper

**Files:**
- Create: `app/lib/helpers/format-currency.ts`
- Test: `app/lib/helpers/format-currency.test.ts`

The three existing formatters disagree: `kpi-scores.tsx:25` uses `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` (which emits a non-breaking space), `financial-summary.tsx:13` builds `` `R$ ${value.toLocaleString(…)}` `` with a regular space, and `copy/admin/events.ts:53` emits `R$ 220` with no decimals at all. The new helper standardises on a **regular space**, because the existing tests assert on `"R$ 150,00"` and a non-breaking space would fail them invisibly.

- [ ] **Step 1: Write the failing test**

```ts
// app/lib/helpers/format-currency.test.ts
import { describe, expect, it } from "vitest"
import { formatCurrency, formatSignedCurrency } from "./format-currency"

describe("formatCurrency", () => {
  it("formats cents as reais with two decimals", () => {
    expect(formatCurrency(22000)).toBe("R$ 220,00")
    expect(formatCurrency(22199)).toBe("R$ 221,99")
    expect(formatCurrency(0)).toBe("R$ 0,00")
    expect(formatCurrency(5)).toBe("R$ 0,05")
  })

  it("groups thousands with a dot", () => {
    expect(formatCurrency(123456789)).toBe("R$ 1.234.567,89")
  })

  it("uses a regular space after R$, not a non-breaking one", () => {
    expect(formatCurrency(100)).toBe("R$ 1,00")
    expect(formatCurrency(100).charCodeAt(2)).toBe(32)
  })

  it("formats negative amounts with the sign before R$", () => {
    expect(formatCurrency(-2500)).toBe("-R$ 25,00")
  })

  it("treats null and undefined as zero", () => {
    expect(formatCurrency(null)).toBe("R$ 0,00")
    expect(formatCurrency(undefined)).toBe("R$ 0,00")
  })
})

describe("formatSignedCurrency", () => {
  it("marks a surplus with a plus and a deficit with a minus", () => {
    expect(formatSignedCurrency(7000)).toBe("+R$ 70,00")
    expect(formatSignedCurrency(-7000)).toBe("-R$ 70,00")
    expect(formatSignedCurrency(0)).toBe("+R$ 0,00")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/lib/helpers/format-currency.test.ts`
Expected: FAIL — `Cannot find module './format-currency'`

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/helpers/format-currency.ts
/**
 * Money is stored and passed around as an integer number of cents; this is the
 * only place that turns it into something a person reads.
 *
 * The space after `R$` is a regular one. `Intl` with `style: "currency"` emits
 * a non-breaking space, which looks identical in a diff and fails every
 * assertion written by hand.
 */
const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(cents: number | null | undefined): string {
  const value = Number(cents ?? 0)
  const sign = value < 0 ? "-" : ""
  return `${sign}R$ ${decimalFormatter.format(Math.abs(value) / 100)}`
}

/** Same, but a non-negative amount is marked with an explicit `+`. */
export function formatSignedCurrency(cents: number | null | undefined): string {
  const value = Number(cents ?? 0)
  return value >= 0 ? `+${formatCurrency(value)}` : formatCurrency(value)
}

/** Reais typed by an admin (`"220"`, `"220,50"`, `"1.234,56"`) → cents. */
export function reaisToCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100)
  const normalized = input.trim().replace(/\./g, "").replace(",", ".")
  const parsed = Number(normalized)
  if (Number.isNaN(parsed)) return Number.NaN
  return Math.round(parsed * 100)
}

/** Cents → the plain decimal string a number input shows (`"220.5"`). */
export function centsToReaisInput(cents: number | null | undefined): string {
  return String(Number(cents ?? 0) / 100)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/lib/helpers/format-currency.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Test the two conversion helpers**

Append to the test file:

```ts
import { centsToReaisInput, reaisToCents } from "./format-currency"

describe("reaisToCents", () => {
  it("accepts numbers and the strings a Brazilian keyboard produces", () => {
    expect(reaisToCents(220)).toBe(22000)
    expect(reaisToCents("220")).toBe(22000)
    expect(reaisToCents("220,50")).toBe(22050)
    expect(reaisToCents("1.234,56")).toBe(123456)
    expect(reaisToCents(" 220 ")).toBe(22000)
  })

  it("rounds to the nearest cent", () => {
    expect(reaisToCents(220.005)).toBe(22001)
    expect(reaisToCents("0,004")).toBe(0)
  })

  it("returns NaN for something that is not a number", () => {
    expect(reaisToCents("abc")).toBeNaN()
  })
})

describe("centsToReaisInput", () => {
  it("renders cents as the decimal a number input reads back", () => {
    expect(centsToReaisInput(22000)).toBe("220")
    expect(centsToReaisInput(22050)).toBe("220.5")
    expect(centsToReaisInput(0)).toBe("0")
    expect(centsToReaisInput(null)).toBe("0")
  })
})
```

Run: `pnpm test:unit -- app/lib/helpers/format-currency.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
git add app/lib/helpers/format-currency.ts app/lib/helpers/format-currency.test.ts
git commit -m "feat(money): add one helper that formats cents"
```

---

### Task 2: The migration

**Files:**
- Create: `supabase/migrations/<timestamp>_ticket_price_in_cents.sql`

- [ ] **Step 1: Write the migration**

Name it with the current UTC timestamp: `date -u +%Y%m%d%H%M%S`.

```sql
-- events.ticket_price moves from reais with two decimals to an integer number
-- of cents, so that every money value in the schema is the same unit and no
-- arithmetic has to round.
--
-- Idempotent on the column type: a database that already has an integer column
-- (a branch applied out of order) is left alone rather than multiplied again.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'events'
       AND column_name = 'ticket_price'
       AND data_type = 'numeric'
  ) THEN
    ALTER TABLE public.events
      ALTER COLUMN ticket_price TYPE integer
      USING ROUND(ticket_price * 100)::integer;
  END IF;
END $$;

COMMENT ON COLUMN public.events.ticket_price IS
  'Ticket price in cents. What Positiv nets; the participant pays this plus the payment fees.';
```

- [ ] **Step 2: Apply it and verify from a clean state**

Check the lock first (`cat "$(git rev-parse --git-common-dir)/db-lock/owner" 2>/dev/null`); if another agent holds it, wait.

Run: `supabase db reset`
Expected: every migration applies, no error.

Run:
```bash
psql "$SUPABASE_CONNECT_URL" -c "\d public.events" | grep ticket_price
```
Expected: `ticket_price | integer`.

Run:
```bash
psql "$SUPABASE_CONNECT_URL" -c "SELECT min(ticket_price), max(ticket_price) FROM public.events;"
```
Expected: values in the thousands (the seed draws R$ 10–150, so 1000–15000), not 10–150.

- [ ] **Step 3: Regenerate the types**

Run: `pnpm db:types --local`
Expected: `app/types/database/database.types.ts` still says `ticket_price: number | null` (Postgres `integer` and `numeric` both map to `number`), so the diff may be empty. Commit whatever changes.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations app/types/database
git commit -m "feat(events): store the ticket price in cents"
```

---

### Task 3: Seeds produce cents

**Files:**
- Modify: `supabase/seeds/03_events.sql:144`

- [ ] **Step 1: Change the generated value**

Replace line 144:

```sql
        (10 + (random() * 140))::numeric(10,2) AS ticket_price,
```

with:

```sql
        ((10 + (random() * 140)) * 100)::int AS ticket_price,
```

- [ ] **Step 2: Verify**

Run: `supabase db reset`
Run: `psql "$SUPABASE_CONNECT_URL" -c "SELECT min(ticket_price), max(ticket_price) FROM public.events;"`
Expected: between 1000 and 15000.

- [ ] **Step 3: Commit**

```bash
git add supabase/seeds/03_events.sql
git commit -m "feat(seeds): seed the ticket price in cents"
```

---

### Task 4: The event form reads and writes reais

**Files:**
- Modify: `app/business/admin/common.ts:32` (`eventFormSchema.ticket_price`)
- Modify: `app/components/forms/custom/event/to-event-answers.ts`
- Test: `app/components/forms/custom/event/to-event-answers.test.ts`

The admin types `220`; the database stores `22000`. `eventFormSchema` is the boundary on the way in (it feeds `updateEvent`/`createEvent` straight into Kysely), `toEventAnswers` is the boundary on the way out.

- [ ] **Step 1: Write the failing test for the schema**

Add to `app/business/admin/common.test.ts` (create the file if it does not exist):

```ts
import { describe, expect, it } from "vitest"
import { eventFormSchema } from "./common"

describe("eventFormSchema.ticket_price", () => {
  const base = {
    title: "Festa",
    description: "Uma festa",
    emoji: "🎉",
    location: "Rua X",
    total_spots: 50,
    time_event_start: "2026-09-01T20:00",
    time_event_end: "2026-09-02T04:00",
    time_application_start: "2026-08-01T12:00",
    time_group_start: "2026-08-20T12:00",
    time_group_end: "2026-09-01T12:00",
    time_payment_start: "2026-08-10T12:00",
    time_payment_end: "2026-08-25T12:00",
  }

  it("converts the reais an admin types into cents", () => {
    expect(eventFormSchema.parse({ ...base, ticket_price: "220" }).ticket_price).toBe(22000)
    expect(eventFormSchema.parse({ ...base, ticket_price: "220,50" }).ticket_price).toBe(22050)
    expect(eventFormSchema.parse({ ...base, ticket_price: 220 }).ticket_price).toBe(22000)
  })

  it("still refuses a price below one real", () => {
    expect(() => eventFormSchema.parse({ ...base, ticket_price: "0" })).toThrow()
    expect(() => eventFormSchema.parse({ ...base, ticket_price: "0,50" })).toThrow()
  })

  it("refuses something that is not a number", () => {
    expect(() => eventFormSchema.parse({ ...base, ticket_price: "abc" })).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/admin/common.test.ts`
Expected: FAIL — `expected 220 to be 22000`

- [ ] **Step 3: Write minimal implementation**

In `app/business/admin/common.ts`, add the import and replace line 32:

```ts
import { reaisToCents } from "~/lib/helpers/format-currency"
```

```ts
  // The admin types reais; the column is cents.
  ticket_price: zod
    .union([zod.string(), zod.number()])
    .transform(reaisToCents)
    .refine((cents) => Number.isFinite(cents) && cents >= 100, {
      error: eventFormValidation.ticketPriceTooSmall,
    }),
```

Add to `app/copy/admin/events.ts`, inside the existing `eventFormValidation` object:

```ts
  ticketPriceTooSmall: "O valor deve ser de pelo menos R$ 1,00",
```

`eventSchema.ticket_price` at line 53 describes a row read **from** the database, which is already cents — leave it as `zod.coerce.number().nullish()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/admin/common.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for `toEventAnswers`**

In `app/components/forms/custom/event/to-event-answers.test.ts`, change the `ticket_price` expectation and add one:

```ts
  it("hands the ticket price back as reais, because the field asks for reais", () => {
    const answers = toEventAnswers({ ...baseEvent, ticket_price: 22050 })
    expect(answers.ticket_price).toBe("220.5")
  })

  it("keeps a zero price rather than dropping the field", () => {
    const answers = toEventAnswers({ ...baseEvent, ticket_price: 0 })
    expect(answers.ticket_price).toBe("0")
  })
```

(Existing tests at lines 11 and 45 pass `ticket_price` — update those literals to cents so their expectations still describe the same price.)

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm test:unit -- app/components/forms/custom/event/to-event-answers.test.ts`
Expected: FAIL — `expected "22050" to be "220.5"`

- [ ] **Step 7: Write minimal implementation**

In `to-event-answers.ts`, split `ticket_price` out of `NUMBER_FIELDS`:

```ts
const NUMBER_FIELDS = ["total_spots"] as const
```

and inside `toEventAnswers`, after the `NUMBER_FIELDS` loop:

```ts
  // Stored in cents, asked for in reais — the field shows what the admin typed.
  if (event.ticket_price !== null && event.ticket_price !== undefined) {
    answers.ticket_price = centsToReaisInput(event.ticket_price)
  }
```

with `import { centsToReaisInput } from "~/lib/helpers/format-currency"` at the top.

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm test:unit -- app/components/forms/custom/event/to-event-answers.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add app/business/admin/common.ts app/components/forms/custom/event/to-event-answers.ts app/copy/admin/events.ts app/business/admin/common.test.ts app/components/forms/custom/event/to-event-answers.test.ts
git commit -m "feat(events): let admins type reais while the column keeps cents"
```

---

### Task 5: Every display goes through `formatCurrency`

**Files:**
- Modify: `app/copy/admin/events.ts:53` (`generalData.ticketPrice`)
- Modify: `app/components/organisms/event-card/event-card.tsx:66`
- Modify: `app/components/pages/admin/dataviz/kpi-scores.tsx:25-35`
- Modify: `app/components/pages/admin/dataviz/revenue-chart.tsx:20`
- Modify: `app/components/pages/admin/participants/financial-summary.tsx:13-22`
- Modify: `app/components/pages/admin/participants/participant-event-history.tsx:126-127`
- Tests: the matching `.test.tsx` files

`financial-summary.tsx` and `participant-event-history.tsx` also read `event_participants.payment`, which is still reais at this point. **Do not convert those reads here** — PR 4 (POS-523) moves them to the view, which is cents. In this PR they keep reading `payment` as reais and keep their own local formatter for that one value; only `ticket_price` moves. Mark it:

```ts
// `payment` is still reais until POS-523 moves this component to the
// event_participant_payments view. `ticket_price` is already cents.
```

- [ ] **Step 1: Write the failing tests**

`app/components/organisms/event-card/event-card.test.tsx` — change the fixture to `ticket_price: 10000` and assert:

```ts
  it("shows the price formatted from cents", () => {
    renderWithRouter(<EventCard event={{ ...baseEvent, ticket_price: 10000 }} />)
    expect(screen.getByText("R$ 100,00")).toBeInTheDocument()
  })
```

`app/components/pages/admin/dataviz/kpi-scores.test.tsx` — the fixture's `total_revenue` and `avg_revenue_per_event` become cents; assert `"R$ 1.000,00"` for `100000`.

`app/components/pages/admin/participants/financial-summary.test.tsx` — the fixture's `ticket_price` becomes cents (`15000` for R$ 150,00); the `payment` values stay reais.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit -- app/components/organisms/event-card app/components/pages/admin/dataviz app/components/pages/admin/participants`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Write the implementations**

`app/copy/admin/events.ts:53`:

```ts
    ticketPrice: (label: string | undefined, cents: number) =>
      `${label ?? ""}: ${formatCurrency(cents)}`,
```

with `import { formatCurrency } from "~/lib/helpers/format-currency"` at the top of the copy module (a copy module may import a pure helper; it must not import a `.server` one).

`event-card.tsx:66`:

```tsx
              <DataPair pair={["Valor", formatCurrency(ticket_price)]} />
```

`kpi-scores.tsx`: delete the local `formatCurrency` (lines 25–33) and import the shared one. Keep the local `formatNumber` (line 35) — it formats counts, not money.

`revenue-chart.tsx`: replace the import at line 20 with the shared helper; `dataPoint.ticket_price` and `faturamento_total` are both cents after PR 4, and `ticket_price` already is after this PR. Leave `faturamento_total` reading as-is with a comment naming POS-523 as the PR that converts it.

`financial-summary.tsx`: import the shared `formatCurrency`/`formatSignedCurrency` and use them for `ticket_price` only; keep a local `formatReais` for `payment` with the comment above.

`participant-event-history.tsx:126-127`: `ticketPrice` is now cents, `payment` reais — compute the surplus as `payment * 100 - ticketPrice` and format with the shared helper, with the same comment. (POS-523 deletes this arithmetic entirely.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit`
Expected: PASS, whole suite.

- [ ] **Step 5: Commit**

```bash
git add app/copy/admin/events.ts app/components
git commit -m "feat(money): show every price through the shared formatter"
```

---

### Task 6: Fixtures and E2E helpers

**Files:**
- Modify: `e2e/utils/application-helpers.ts:168,234` (`ticket_price: 50` → `5000`)
- Modify: `app/pages/api/admin/event.test.ts:21`, `app/components/pages/dashboard/dashboard-page.test.tsx:20-52`, `events-section.test.tsx:46`, `dashboard-sections.test.tsx:16`, `event-form.test.tsx:35,129,202,247`, `db-values-to-form-schema.test.ts:95-163`, `revenue-chart.test.tsx:25-41` — every `ticket_price` literal becomes cents

- [ ] **Step 1: Find them all**

Run: `grep -rn "ticket_price" app e2e --include='*.ts' --include='*.tsx' | grep -v format-currency`
Every literal in a fixture must be ×100 of what it was.

- [ ] **Step 2: Run the whole unit suite**

Run: `pnpm test:unit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app e2e
git commit -m "test(money): move the ticket price fixtures to cents"
```

---

### Task 7: Integration test for the migration

**Files:**
- Create: `app/business/admin/ticket-price-cents.integration.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from "vitest"
import { sql } from "kysely"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import { createTestEvent } from "~/test/db-test-utils"

describe("events.ticket_price in cents", () => {
  const { tracker, kysely } = setupIntegrationTest()

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("stores the column as an integer", async () => {
    const { rows } = await sql<{ data_type: string }>`
      SELECT data_type FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'events'
         AND column_name = 'ticket_price'
    `.execute(kysely)

    expect(rows[0]?.data_type).toBe("integer")
  })

  it("refuses a fractional price rather than silently rounding a real into a cent", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Cents Test Event",
      ticket_price: 22000,
    })

    const stored = await kysely
      .selectFrom("events")
      .select("ticket_price")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()

    expect(stored.ticket_price).toBe(22000)
  })

  it("every seeded event has a price in the cents range", async () => {
    const { rows } = await sql<{ min: number; max: number }>`
      SELECT min(ticket_price) AS min, max(ticket_price) AS max FROM public.events
    `.execute(kysely)

    expect(Number(rows[0].min)).toBeGreaterThanOrEqual(1000)
  })
})
```

Add the missing `afterEach` import from `vitest`.

- [ ] **Step 2: Run it**

Check the DB lock, then run: `pnpm test:integration`
Expected: PASS, whole integration suite.

- [ ] **Step 3: Commit**

```bash
git add app/business/admin/ticket-price-cents.integration.test.ts
git commit -m "test(events): assert the ticket price column is integer cents"
```

---

### Task 8: Full verification

- [ ] Run: `supabase db reset` — clean
- [ ] Run: `pnpm lint` — clean
- [ ] Run: `pnpm test` — unit and integration green
- [ ] Manually: open `/admin/eventos/novo`, type `220` in "Valor", save, reopen the event for editing — the field reads `220` again, and the event page shows `R$ 220,00`
- [ ] Run E2E **once, as the last step**, after checking the lock: `pnpm test:e2e`

## Definition of done

- PR title: `[POS-520] Store every price in cents`
- PR body follows `.github/pull_request_template.md`, `Fixes POS-520`
- Delete this plan file before opening the PR
- No news dialog item: an admin-facing formatting change that alters nothing a participant sees does not clear the bar
