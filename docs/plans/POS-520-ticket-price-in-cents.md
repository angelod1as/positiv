# POS-520 — `events.ticket_price` in integer cents — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every money value in the schema and in TypeScript is an integer number of cents, formatted for display by one shared helper.

**Architecture:** One migration converts `events.ticket_price` from `numeric(10,2)` to `integer` (`ROUND(value * 100)`). A new pure helper `formatCurrency(cents)` replaces the six ad-hoc formatters. The admin still types reais in the event form, so the form's schema converts on the way in and `toEventAnswers` converts on the way out — the conversion lives at that one boundary and nowhere else.

`event_participants.payment` is still `numeric` reais in the database until POS-522/POS-524 retire it. Rather than let two units meet in a component, the three server queries that read it multiply by 100 on the way out, so that **everything in TypeScript is cents from this PR onward**. POS-523 replaces those queries with the view and deletes the multiplication.

**Tech Stack:** PostgreSQL migration (Supabase CLI), Kysely, zod v4, React, Vitest.

**Spec:** `docs/plans/payments-v3-design.md` §3, §10 PR 1. Supersedes the cancelled POS-467.

**Non-negotiables from CLAUDE.md:** TDD (red before green), no `@ts-ignore`, no skipped tests, `pnpm lint` and `pnpm test` green before the PR, `supabase db reset` from a clean state, migrations never edited after being applied.

## Findings that shaped this plan

- **The migration has no dependents.** No view, function, generated column or
  index reads `events.ticket_price`, so `ALTER COLUMN … USING` needs no
  `DROP VIEW`/recreate dance.
- **A `transform` in `eventFormSchema` is safe for the form runtime.**
  `validate-question.ts:39` calls `question.schema.safeParse` and discards the
  parsed value on success — it validates only. The answer the admin sees stays
  the text they typed; the cents appear on the server, where
  `applySchema(eventFormSchema)` hands `createOrUpdateEvent` the parsed output.
- **There are six local formatters, not three:** `kpi-scores.tsx:25`,
  `chart-utils.ts:15`, `financial-summary.tsx:13` and `:17`,
  `participant-event-history.tsx:114` and `:130`, plus the inline
  `R$ ${…}` in `copy/admin/events.ts:53`.
- **`avg_ticket_price` is computed and never rendered.** `kpi-scores.server.ts:31`
  produces it, `KpiScoresData` carries it, no component reads it. It needs no
  display work — only its fixtures move.
- **`financial-summary` and `participant-event-history` share one boundary.**
  Both are fed by `getParticipantFullEventHistory` (`admin.server.ts:453`), so
  converting `payment` there fixes both.

---

### Task 1: The shared `formatCurrency` helper

**Files:**
- Create: `app/lib/helpers/format-currency.ts`
- Test: `app/lib/helpers/format-currency.test.ts`

The existing formatters disagree: `kpi-scores.tsx` and `chart-utils.ts` use `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` (which emits a non-breaking space), `financial-summary.tsx` and `participant-event-history.tsx` build `` `R$ ${value.toLocaleString(…)}` `` with a regular space, and `copy/admin/events.ts:53` emits `R$ 220` with no decimals at all. The new helper standardises on a **regular space**, because the existing tests assert on `"R$ 150,00"` and a non-breaking space would fail them invisibly.

- [ ] **Step 1: Write the failing test** (`formatCurrency`, `formatSignedCurrency`)
- [ ] **Step 2:** `pnpm test:unit -- app/lib/helpers/format-currency.test.ts` → FAIL, module not found
- [ ] **Step 3:** implement `formatCurrency`, `formatSignedCurrency`, `reaisToCents`, `centsToReaisInput`
- [ ] **Step 4:** rerun → PASS
- [ ] **Step 5:** add the tests for `reaisToCents` / `centsToReaisInput`, rerun → PASS
- [ ] **Step 6:** `git commit -m "feat(money): add one helper that formats cents"`

Contract:

```
formatCurrency(22000)        === "R$ 220,00"
formatCurrency(5)            === "R$ 0,05"
formatCurrency(123456789)    === "R$ 1.234.567,89"
formatCurrency(-2500)        === "-R$ 25,00"
formatCurrency(null)         === "R$ 0,00"
formatCurrency(100).charCodeAt(2) === 32      // regular space, not U+00A0
formatSignedCurrency(7000)   === "+R$ 70,00"
formatSignedCurrency(0)      === "+R$ 0,00"
reaisToCents("1.234,56")     === 123456
reaisToCents("abc")          → NaN
centsToReaisInput(22050)     === "220.5"
```

---

### Task 2: The migration

**Files:** create `supabase/migrations/<timestamp>_ticket_price_in_cents.sql`

- [ ] **Step 1:** write it — guarded on `data_type = 'numeric'` so a database that
  already holds an integer is left alone rather than multiplied again; then
  `COMMENT ON COLUMN` saying the unit is cents.
- [ ] **Step 2:** check the DB lock, `supabase db reset`, confirm
  `\d public.events` says `ticket_price | integer` and that the seeded prices
  land in the thousands.
- [ ] **Step 3:** `pnpm db:types --local` — `integer` and `numeric` both map to
  `number`, so the diff may be empty. Commit whatever changes.
- [ ] **Step 4:** `git commit -m "feat(events): store the ticket price in cents"`

---

### Task 3: Seeds produce cents

**Files:** modify `supabase/seeds/03_events.sql:144`

- [ ] **Step 1:** `(10 + (random() * 140))::numeric(10,2)` → `((10 + (random() * 140)) * 100)::int`
- [ ] **Step 2:** `supabase db reset`, confirm the range is 1000–15000
- [ ] **Step 3:** `git commit -m "feat(seeds): seed the ticket price in cents"`

---

### Task 4: The event form reads and writes reais

**Files:**
- Modify: `app/business/admin/common.ts:32`, `app/components/forms/custom/event/to-event-answers.ts`, `app/copy/admin/events.ts`
- Test: `app/business/admin/common.test.ts` (new), `app/components/forms/custom/event/to-event-answers.test.ts`

The admin types `220`; the database stores `22000`. `eventFormSchema` is the boundary on the way in, `toEventAnswers` on the way out. `eventSchema.ticket_price` (line 53) describes a row read **from** the database, which is already cents — it stays `zod.coerce.number().nullish()`.

- [ ] **Step 1:** failing test — `eventFormSchema.parse({… ticket_price: "220,50" }).ticket_price` is `22050`; `"0,50"` throws; `"abc"` throws
- [ ] **Step 2:** run → FAIL (`expected 220 to be 22000`)
- [ ] **Step 3:** `ticket_price: zod.union([zod.string(), zod.number()]).transform(reaisToCents).refine(cents => Number.isFinite(cents) && cents >= 100, { error: eventFormValidation.ticketPriceTooSmall })`, plus the new copy string
- [ ] **Step 4:** run → PASS
- [ ] **Step 5:** failing test — `toEventAnswers({ ticket_price: 22050 }).ticket_price` is `"220.5"`, and a zero price survives as `"0"`
- [ ] **Step 6:** run → FAIL
- [ ] **Step 7:** drop `ticket_price` from `NUMBER_FIELDS`, write it through `centsToReaisInput`
- [ ] **Step 8:** run → PASS
- [ ] **Step 9:** `git commit -m "feat(events): let admins type reais while the column keeps cents"`

---

### Task 5: Every admin query returns cents

**Files:**
- Modify: `app/business/admin/dataviz/kpi-scores.server.ts:109`
- Modify: `app/business/admin/dataviz/event-metrics.server.ts:101`
- Modify: `app/business/admin/admin.server.ts:453` (`getParticipantFullEventHistory`)
- Tests: `kpi-scores.server.integration.test.ts`, `dataviz.integration.test.ts`, `admin.server.integration.test.ts`

Without this task `ticket_price` is cents while `sum(payment)` is reais, and the two meet inside one chart (`revenue-chart` plots them on a shared axis) and inside one subtraction (`payment - ticket_price` in `financial-summary` and `participant-event-history`). The chart would be unreadable and the subtraction would display a wrong number.

- [ ] **Step 1:** failing integration expectations — `faturamento_total` for two R$ 90,00 payments is `18000`, `total_revenue` likewise, and `getParticipantFullEventHistory` returns `payment` in cents
- [ ] **Step 2:** run → FAIL
- [ ] **Step 3:** `coalesce(sum(event_participants.payment), 0) * 100)::int` in both dataviz queries; in `getParticipantFullEventHistory`, map `payment` through `Math.round(Number(payment) * 100)` after `execute`, leaving `null` as `null`
- [ ] **Step 4:** run → PASS
- [ ] **Step 5:** `git commit -m "feat(money): return every amount from the admin queries in cents"`

---

### Task 6: Every display goes through `formatCurrency`

**Files:**
- Modify: `app/copy/admin/events.ts:53`, `app/components/organisms/event-card/event-card.tsx:66`, `app/components/pages/admin/dataviz/kpi-scores.tsx:25-33`, `app/components/pages/admin/dataviz/revenue-chart.tsx:20`, `app/lib/helpers/chart-utils.ts:15`, `app/components/pages/admin/participants/financial-summary.tsx:13-22`, `app/components/pages/admin/participants/participant-event-history.tsx:114,130`
- Tests: the matching `.test.tsx` files

- [ ] **Step 1:** failing tests — the fixtures become cents and the assertions keep the same rendered strings
- [ ] **Step 2:** run → FAIL
- [ ] **Step 3:** delete all six local formatters and import the shared helper. `chart-utils.formatCurrency` goes away entirely; keep `kpi-scores`'s local `formatNumber` (it formats counts, not money) and `chart-utils`'s `buildEventLabel`
- [ ] **Step 4:** `pnpm test:unit` → PASS
- [ ] **Step 5:** `git commit -m "refactor(money): show every amount through the shared formatter"`

---

### Task 7: Fixtures move to cents

Every money literal in a fixture is ×100 of what it was: `ticket_price`, `payment`, `total_revenue`, `avg_revenue_per_event`, `avg_ticket_price`, `faturamento_total`.

- [ ] **Step 1:** `grep -rn "ticket_price\|payment:\|faturamento_total\|_revenue" app e2e` and convert every fixture literal — including the ten integration suites, which stay green either way but would otherwise read `100` as R$ 100,00
- [ ] **Step 2:** `pnpm test:unit` → PASS
- [ ] **Step 3:** `git commit -m "test(money): move the money fixtures to cents"`

---

### Task 8: Integration test for the migration

**Files:** create `app/business/admin/ticket-price-cents.integration.test.ts`

- [ ] **Step 1:** assert `information_schema.columns` says `integer`, that a stored `22000` reads back as `22000`, and that every seeded event's price is at least 1000
- [ ] **Step 2:** check the DB lock, `pnpm test:integration` → PASS
- [ ] **Step 3:** `git commit -m "test(events): assert the ticket price column is integer cents"`

---

### Task 9: Full verification

- [ ] `supabase db reset` — clean
- [ ] `pnpm lint` — clean
- [ ] `pnpm test` — unit and integration green
- [ ] Manually: open `/admin/eventos/novo`, type `220` in "Valor", save, reopen for editing — the field reads `220` again and the event page shows `R$ 220,00`
- [ ] `pnpm test:e2e` **once, as the last step**, after checking the lock

## Definition of done

- PR title: `[POS-520] Store every price in cents`
- PR body follows `.github/pull_request_template.md`, `Fixes POS-520`
- Delete this plan file before opening the PR
- No news dialog item: an admin-facing formatting change that alters nothing a participant sees does not clear the bar
