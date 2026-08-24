# POS-523 — Readers switch to `event_participant_payments` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nothing in `app/` reads or writes `event_participants.has_paid` or `.payment` any more. Every number about money comes from the view, and the admin sees gross, fee and net instead of a single ambiguous "Pagamento".

**Architecture:** Bottom-up. First the two server queries that feed the admin grid and the participant history learn to join the view; then the schemas stop accepting the two fields, which makes the writes impossible; then each component is moved onto the new numbers. The columns still exist in the database throughout — POS-524 drops them — so every step can be verified against the old values.

**Tech Stack:** Kysely, React, AG Grid, zod v4, Recharts, Vitest.

**Spec:** `docs/plans/payments-v3-design.md` §8 (the table of readers), §10 PR 4.

**Branch:** `pos-523-readers-on-the-view` from `main`, worktree `wt/pos-523-readers-on-the-view`.

**Depends on:** POS-522 (the backfill must have run, or every screen shows zero).

---

## What the admin loses and gains

Losing: the inline `payment` number editor and the `has_paid` checkbox in the grid. Gaining: a read-only status badge and amount, a `$` button per row (a placeholder here; POS-525 hangs the modal on it), and a financial summary that separates what the participant paid from what Positiv kept.

This is the moment the grid stops being the way money is edited. Between this PR and POS-525 there is **no way to record a payment in the UI**. That is deliberate and short-lived, and it is why POS-525 must follow immediately — do not deploy this one to production without it unless an event is not in flight.

---

### Task 1: The admin queries join the view

**Files:**
- Modify: `app/business/admin/admin.server.ts` — `profilesWithExtraDataQuery` (~line 89), `getParticipantFullEventHistory` (~line 453), `getEventParticipantBasic` (~line 764)
- Test: `app/business/admin/profile-event-queries.integration.test.ts`

- [ ] **Step 1: Write the failing test**

In `app/business/admin/profile-event-queries.integration.test.ts`, replace the fixtures that pass `has_paid`/`payment` to `createTestEventParticipant` with a `createTestPayment` call, and assert the new fields:

```ts
import { createTestPayment } from "~/test/db-test-utils"

  it("reports the payment totals from the ledger", async () => {
    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: profile.id,
    })
    await createTestPayment(tracker, kysely, {
      event_participant_id: participant.id,
      kind: "asaas",
      method: "credit_card",
      base_amount: 20000,
      amount: 21000,
      asaas_net: 20050,
    })

    const rows = await getProfilesWithExtraDataById({ eventId: event.id })
    const row = rows.find((r) => r.id === profile.id)

    expect(row).toMatchObject({
      paid_gross: 21000,
      net: 20050,
      fee: 950,
      payment_status: "paid",
    })
  })

  it("reports zeros and a null status for a participant who never paid", async () => {
    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: otherProfile.id,
    })

    const rows = await getProfilesWithExtraDataById({ eventId: event.id })
    const row = rows.find((r) => r.id === otherProfile.id)

    expect(row).toMatchObject({ paid_gross: 0, net: 0, payment_status: null })
    expect(row?.active_payment_id).toBeNull()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/business/admin/profile-event-queries.integration.test.ts`
Expected: FAIL — `paid_gross` is undefined.

- [ ] **Step 3: Write minimal implementation**

`profilesWithExtraDataQuery` currently does `selectAll(["p", "current_ep"])`. Add the join and the explicit selects:

```ts
    .leftJoin(
      "event_participant_payments as epp",
      "epp.event_participant_id",
      "current_ep.id",
    )
```

and, next to the existing `selectAll`:

```ts
    .select([
      sql<number>`coalesce(epp.paid_gross, 0)`.as("paid_gross"),
      sql<number>`coalesce(epp.net, 0)`.as("net"),
      sql<number>`coalesce(epp.fee, 0)`.as("fee"),
      sql<number>`coalesce(epp.refunded, 0)`.as("refunded"),
      "epp.current_status as payment_status",
      "epp.active_payment_id",
    ])
```

Extend `ProfileWithExtraData` (declared around line 78) with the six fields:

```ts
  paid_gross: number
  net: number
  fee: number
  refunded: number
  payment_status: Database["public"]["Enums"]["payment_status"] | null
  active_payment_id: string | null
```

Do the same join and selects in `getParticipantFullEventHistory` (which already selects `events.ticket_price`) and in `getEventParticipantBasic`. In `app/types/database/entities.types.ts`, add the same six fields to `ParticipantVsEvent` and to `ParticipantEventHistoryData`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:integration -- app/business/admin/profile-event-queries.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/admin/admin.server.ts app/types/database/entities.types.ts app/business/admin/profile-event-queries.integration.test.ts
git commit -m "feat(payments): read the participant totals from the ledger view"
```

---

### Task 2: The write path stops accepting the two fields

**Files:**
- Modify: `app/business/admin/common.ts` — `updateParticipantVsEventSchema` (line 98 `has_paid`, 101 `payment`), `updateEventParticipantByIdSchema` (line 115 `payment`, 118 `has_paid`)
- Test: `app/business/admin/admin.server.test.ts` and `admin.server.integration.test.ts`

Both mutations spread their validated input straight into `.set(data)`, so removing the fields from the schemas removes the writes.

- [ ] **Step 1: Write the failing test**

In `app/business/admin/admin.server.test.ts`:

```ts
  it("ignores has_paid and payment, which the ledger owns now", async () => {
    const result = await updateEventParticipantById({
      intent: "update-event-participant",
      id: "ep-1",
      profile_id: "profile-1",
      has_paid: "true",
      payment: "220",
      notes: "still saved",
    })

    expect(result.success).toBe(true)
    const written = mockKyselyDb.lastSetPayload()
    expect(written).not.toHaveProperty("has_paid")
    expect(written).not.toHaveProperty("payment")
    expect(written).toHaveProperty("notes", "still saved")
  })
```

(Adapt `lastSetPayload` to whatever the file's existing mock exposes; if it exposes nothing, assert through the integration test below instead and skip this unit test.)

In `app/business/admin/admin.server.integration.test.ts`:

```ts
  it("leaves the deprecated money columns untouched", async () => {
    const before = await kysely
      .selectFrom("event_participants")
      .select(["has_paid", "payment"])
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    await updateEventParticipantById({
      intent: "update-event-participant",
      id: participant.id,
      profile_id: profile.id,
      has_paid: "true",
      payment: "999",
      notes: "touched",
    })

    const after = await kysely
      .selectFrom("event_participants")
      .select(["has_paid", "payment", "notes"])
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(after.has_paid).toBe(before.has_paid)
    expect(Number(after.payment)).toBe(Number(before.payment))
    expect(after.notes).toBe("touched")
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/business/admin/admin.server.integration.test.ts`
Expected: FAIL — the columns were written.

- [ ] **Step 3: Write minimal implementation**

Delete the four lines from the two schemas in `app/business/admin/common.ts`. Zod strips unknown keys, so a stale form field is ignored rather than rejected.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:integration -- app/business/admin/admin.server.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/admin/common.ts app/business/admin
git commit -m "feat(payments): stop writing has_paid and payment from the admin forms"
```

---

### Task 3: The grid shows status and amount, read-only

**Files:**
- Modify: `app/components/organisms/tables/admin/participants-table/view-event-participants-table.tsx`
- Delete: `app/components/organisms/tables/admin/participants-table/payment-column-helpers.ts` and its test
- Modify: `app/copy/admin/tables.ts`, `app/copy/admin/prop-maps.ts`, `app/lib/helpers/propMaps.ts`
- Test: `view-event-participants-table.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
  it("shows the payment status as a read-only badge", async () => {
    renderTable([
      { ...baseRow, payment_status: "paid", paid_gross: 22000, net: 22000 },
    ])

    expect(await screen.findByText("Pago")).toBeInTheDocument()
    expect(screen.getByText("R$ 220,00")).toBeInTheDocument()
  })

  it("shows a dash for a participant with no payment", async () => {
    renderTable([{ ...baseRow, payment_status: null, paid_gross: 0, net: 0 }])

    expect(await screen.findByText("—")).toBeInTheDocument()
  })

  it("offers a button that opens payment management for the row", async () => {
    const onManage = vi.fn()
    renderTable([{ ...baseRow, payment_status: "paid" }], { onManagePayment: onManage })

    await userEvent.click(
      await screen.findByRole("button", { name: /gerenciar pagamento/i }),
    )
    expect(onManage).toHaveBeenCalledWith(baseRow.id)
  })

  it("no longer offers an editable paid checkbox or amount", async () => {
    renderTable([baseRow])

    expect(screen.queryByRole("checkbox", { name: /pago/i })).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/components/organisms/tables/admin/participants-table`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Replace the two column definitions (lines ~453–500) with three:

```tsx
      {
        field: "payment_status",
        headerName: tableCopy.columns.paymentStatus,
        headerTooltip: tableCopy.columns.paymentStatusTooltip,
        editable: false,
        valueFormatter: (params) =>
          params.value ? paymentStatusPropMap(params.value) : "—",
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: paymentStatusOptions,
          field: "payment_status",
          model: paymentStatusFilter,
          onModelChange: setPaymentStatusFilter,
        },
      },
      {
        field: "paid_gross",
        headerName: tableCopy.columns.paidGross,
        headerTooltip: tableCopy.columns.paidGrossTooltip,
        editable: false,
        valueFormatter: (params) =>
          params.value ? formatCurrency(params.value) : "—",
      },
      {
        colId: "manage_payment",
        headerName: "",
        editable: false,
        sortable: false,
        filter: false,
        width: 60,
        cellRenderer: (params: ICellRendererParams<ProfileWithExtraData>) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label={tableCopy.columns.managePayment}
            onClick={() => params.data && onManagePayment?.(params.data.id)}
          >
            <DollarSign className="h-4 w-4" />
          </Button>
        ),
      },
```

Then:

- delete `"has_paid"` and `"payment"` from `EDITABLE_FIELDS` (line ~70)
- delete `STORAGE_KEYS.hasPaid` and the `hasPaidFilter` state, its `sessionStorage` effect, and its entries in the two dependency arrays (lines 60, 127–129, 157, 169, 574, 586); add `paymentStatusFilter` in the same shape
- delete the `payment` branch of `handleCellValueChanged` (lines 204–218) — POS-385's auto-check has nothing left to check
- delete the imports of `shouldAutoCheckHasPaid`, `parsePaymentValue`, `hasPaidOptions`
- bump `stateVersion` from `2` to `3` (line ~644) so a stored column layout mentioning the removed fields is discarded
- add an `onManagePayment?: (eventParticipantId: string) => void` prop; the page passes `undefined` for now and POS-525 wires it

New copy in `app/copy/admin/tables.ts`, replacing `hasPaid`/`hasPaidTooltip`:

```ts
      paymentStatus: "Pagamento",
      paymentStatusTooltip: "Situação do pagamento",
      paidGross: "Valor pago",
      paidGrossTooltip: "Valor bruto pago pela pessoa, taxas incluídas",
      managePayment: "Gerenciar pagamento",
```

New status labels in `app/copy/admin/prop-maps.ts`, replacing the `hasPaid` map:

```ts
  paymentStatus: {
    pending: "Aguardando escolha",
    awaiting_payment: "Aguardando pagamento",
    paid: "Pago",
    expired: "Expirado",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
    partially_refunded: "Reembolsado em parte",
  },
```

and in `app/lib/helpers/propMaps.ts`, replace `hasPaidOptions` with `paymentStatusOptions` + a `paymentStatusPropMap(value)` lookup, in the same shape as the existing `spotTypeOptions`.

Delete `payment-column-helpers.ts` and `payment-column-helpers.test.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/components/organisms/tables`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/organisms/tables app/copy/admin app/lib/helpers/propMaps.ts
git rm app/components/organisms/tables/admin/participants-table/payment-column-helpers.ts app/components/organisms/tables/admin/participants-table/payment-column-helpers.test.ts
git commit -m "feat(payments): show payment status and amount in the grid, read-only"
```

---

### Task 4: The participant detail form drops its money fields

**Files:**
- Modify: `app/components/pages/admin/participants/participant-vs-event-data.tsx` (schema line 38, destructure 59, initialData 78, JSX 155–168)
- Test: `participant-vs-event-data.test.tsx` (names at 112, 119, 156)

- [ ] **Step 1: Write the failing test**

```tsx
  it("no longer offers the paid checkbox or the amount field", () => {
    render(<ParticipantVsEventData {...baseProps} />)

    expect(screen.queryByLabelText(/pago\?/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^pagamento$/i)).not.toBeInTheDocument()
  })

  it("shows what the participant paid, read-only", () => {
    render(
      <ParticipantVsEventData
        {...baseProps}
        participant={{ ...baseProps.participant, paid_gross: 22000, net: 21500, payment_status: "paid" }}
      />,
    )

    expect(screen.getByText("R$ 220,00")).toBeInTheDocument()
    expect(screen.getByText("Pago")).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/components/pages/admin/participants/participant-vs-event-data.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Remove `has_paid` from the local zod schema, from the destructure and from `initialData`; delete the `<Checkbox {...register.checkbox("has_paid")} />` block and the payment number input. In their place render a read-only pair, using the copy already added in Task 3:

```tsx
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">
            {adminParticipantsCopy.vsEvent.payment}
          </span>
          <span>
            {payment_status ? paymentStatusPropMap(payment_status) : "—"}
            {paid_gross > 0 && ` · ${formatCurrency(paid_gross)}`}
          </span>
        </div>
```

The existing test names at lines 112, 119 and 156 mention the removed fields; rename them to describe what the block does now.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/components/pages/admin/participants`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/pages/admin/participants
git commit -m "feat(payments): show the payment on the participant page instead of editing it"
```

---

### Task 5: Financial summary and event history read gross, fee and net

**Files:**
- Modify: `app/components/pages/admin/participants/financial-summary.tsx`
- Modify: `app/components/pages/admin/participants/participant-event-history.tsx` (`PaymentRenderer`, `SurplusRenderer`, lines 109–169)
- Modify: `app/copy/admin/participants.ts`
- Tests: both `.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
  it("separates what was paid from what Positiv kept", () => {
    render(
      <FinancialSummary
        participantHistory={[
          { ...baseItem, paid_gross: 23000, fee: 1000, net: 22000, ticket_price: 20000 },
        ]}
      />,
    )

    expect(screen.getByText("R$ 230,00")).toBeInTheDocument() // total pago
    expect(screen.getByText("R$ 10,00")).toBeInTheDocument()  // taxas
    expect(screen.getByText("R$ 220,00")).toBeInTheDocument() // líquido
    expect(screen.getByText("+R$ 20,00")).toBeInTheDocument() // surplus = net - ticket_price
  })

  it("counts an event as paid when the ledger says so, even at zero surplus", () => {
    render(
      <FinancialSummary
        participantHistory={[
          { ...baseItem, paid_gross: 20000, fee: 0, net: 20000, ticket_price: 20000 },
        ]}
      />,
    )

    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("+R$ 0,00")).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/components/pages/admin/participants/financial-summary.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

In `financial-summary.tsx`: delete the local `formatCurrency`/`formatSurplus` and import the shared ones from POS-520. Filter on `item.paid_gross > 0` instead of `Number(item.payment) > 0`. The four tiles become five: total pago (`Σ paid_gross`), taxas (`Σ fee`), líquido (`Σ net`), eventos pagos, média por evento (`Σ net / count`). Surplus is `Σ (net − ticket_price)` — both cents, no conversion. Each row in the list shows `formatCurrency(item.paid_gross)` with the surplus beside it.

New copy keys in `app/copy/admin/participants.ts` under `financialSummary`:

```ts
    totalFees: "Taxas",
    totalNet: "Líquido",
```

In `participant-event-history.tsx`, `PaymentRenderer` shows `formatCurrency(data.paid_gross)` and `SurplusRenderer` computes `data.net - (data.ticket_price ?? 0)`. Delete the reais/cents mixing comment added by POS-520 — both sides are cents now.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/components/pages/admin/participants`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/pages/admin/participants app/copy/admin/participants.ts
git commit -m "feat(payments): show gross, fees and net in the financial summary"
```

---

### Task 6: Dataviz counts money from the ledger

**Files:**
- Modify: `app/business/admin/dataviz/event-metrics.server.ts` (`getEventRevenueData` ~78, `getConversionFunnelData` ~120)
- Modify: `app/business/admin/dataviz/kpi-scores.server.ts` (~104)
- Modify: `app/business/admin/dataviz/dataviz.types.ts`
- Modify: `app/components/pages/admin/dataviz/revenue-chart.tsx`
- Test: `app/business/admin/dataviz/dataviz.integration.test.ts`, `kpi-scores.server.integration.test.ts`

Revenue becomes **net** — what Positiv actually kept. Gross and fee ride along so the tooltip can show all three.

- [ ] **Step 1: Write the failing test**

In `dataviz.integration.test.ts`, replace every `createTestEventParticipant({ has_paid, payment })` fixture with a `createTestPayment` call and assert:

```ts
    it("reports revenue as what Positiv kept, with the gross and the fee beside it", async () => {
      // one participant, charged 230,00, Asaas kept 10,00
      const [row] = await getEventRevenueData()

      expect(row.faturamento_total).toBe(22000)
      expect(row.faturamento_bruto).toBe(23000)
      expect(row.taxas).toBe(1000)
      expect(row.num_pagantes).toBe(1)
    })

    it("counts a refunded payment as a payer but not as revenue", async () => {
      const [row] = await getEventRevenueData()

      expect(row.num_pagantes).toBe(1)
      expect(row.faturamento_total).toBe(0)
    })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/business/admin/dataviz`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

In `getEventRevenueData`, join the view and replace the two aggregates:

```ts
    .leftJoin(
      "event_participant_payments as epp",
      "epp.event_participant_id",
      "event_participants.id",
    )
```

```ts
      sql<number>`coalesce(sum(epp.net), 0)::int`.as("faturamento_total"),
      sql<number>`coalesce(sum(epp.paid_gross), 0)::int`.as("faturamento_bruto"),
      sql<number>`coalesce(sum(epp.fee), 0)::int`.as("taxas"),
      sql<number>`count(*) filter (where epp.has_paid)::int`.as("num_pagantes"),
```

Same join in `getConversionFunnelData`, with `count(*) filter (where epp.has_paid)` replacing the `has_paid = true` filter. Same in `kpi-scores.server.ts` for the revenue sum (line ~104). `avg(ticket_price)` at line 31 already reads cents after POS-520 — leave it.

Add `faturamento_bruto` and `taxas` to `EventRevenueDataPoint` in `dataviz.types.ts`. In `revenue-chart.tsx`, keep the bar on `faturamento_total` and add both new numbers to the tooltip, with copy in `app/copy/admin/dataviz.ts`:

```ts
    grossRevenue: "Faturamento bruto",
    fees: "Taxas",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:integration -- app/business/admin/dataviz`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/admin/dataviz app/components/pages/admin/dataviz app/copy/admin/dataviz.ts
git commit -m "feat(payments): count revenue from the ledger, net of fees"
```

---

### Task 7: Seeds and E2E helpers

**Files:**
- Modify: `supabase/seeds/04_event_participants.sql`, `supabase/seeds/07_test_registration_history.sql`
- Create: `supabase/seeds/08_payments.sql` (or the next free number — check `ls supabase/seeds`)
- Modify: `e2e/utils/event-helpers.ts:93`

- [ ] **Step 1: Move the seeded money into `payments`**

Remove `has_paid` and `payment` from the six column lists in `04_event_participants.sql` and the positional values that go with them, and from `07_test_registration_history.sql`. Create a new seed that inserts a `payments` row for the participants that used to be marked paid:

```sql
-- Payments for the seeded history. Everything before the ledger existed was a
-- PIX transfer arranged by hand, so that is what the seed produces.
INSERT INTO public.payments (
  event_participant_id, kind, status, method,
  base_amount, amount, paid_at, due_at, note
)
SELECT
  ep.id,
  'manual',
  'paid',
  'pix',
  COALESCE(NULLIF(e.ticket_price, 0), 20000),
  COALESCE(NULLIF(e.ticket_price, 0), 20000),
  ep.updated_at,
  ep.updated_at,
  'seed'
FROM public.event_participants ep
JOIN public.events e ON e.id = ep.event_id
WHERE ep.application_status = 'finalised'
  AND ep.attendance_status IN ('attended', 'not-attended')
  AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.event_participant_id = ep.id);
```

In `e2e/utils/event-helpers.ts:93`, drop `has_paid: i === 0` from the insert; if a spec needs a paid participant, insert a `payments` row instead.

- [ ] **Step 2: Verify**

Run: `supabase db reset`
Run: `psql "$SUPABASE_CONNECT_URL" -c "SELECT count(*) FROM public.payments WHERE note = 'seed';"`
Expected: a few hundred, not zero.

Open `/admin/eventos/<id>` on the dev server: the grid shows "Pago" and an amount for the finalised participants.

- [ ] **Step 3: Commit**

```bash
git add supabase/seeds e2e/utils/event-helpers.ts
git commit -m "feat(seeds): seed payments in the ledger instead of the old columns"
```

---

### Task 8: Sweep the remaining references

- [ ] **Step 1: Find them**

Run:
```bash
grep -rn "has_paid\|hasPaid\|\bpayment\b" app e2e supabase/seeds --include='*.ts' --include='*.tsx' --include='*.sql' \
  | grep -v "app/business/payment/" \
  | grep -v "payments" \
  | grep -v "payment_status\|payment_method\|payment_kind\|paymentStatus"
```

Every remaining hit is either a fixture literal to delete or a name that means something else (`time_payment_start`, the `payments` table itself). The generated `database.types.ts` still declares the columns — that is correct until POS-524.

- [ ] **Step 2: Run everything**

Run: `pnpm lint`
Run: `pnpm test`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(payments): drop the last has_paid and payment fixtures"
```

---

### Task 9: Full verification

- [ ] Run: `supabase db reset`, `pnpm lint`, `pnpm test` — all clean
- [ ] Manually: the admin grid shows status + amount and a `$` button; the participant page shows the payment read-only; `/admin/numeros` shows revenue with gross and fees in the tooltip; the financial summary adds up
- [ ] Compare against the old columns before merging:
  ```bash
  psql "$SUPABASE_CONNECT_URL" -c "
    SELECT count(*) AS mismatches
      FROM public.event_participants ep
      JOIN public.event_participant_payments epp ON epp.event_participant_id = ep.id
     WHERE ep.has_paid <> epp.has_paid;"
  ```
  Expected: `0`
- [ ] Run E2E **once, last**, after checking the lock: `pnpm test:e2e`

## Definition of done

- PR title: `[POS-523] Read every payment from the ledger`
- `Fixes POS-523`; Breaking Changes names the removed inline editing and points at POS-525
- Delete this plan file before opening the PR
- News item: yes, admin-facing — the grid stops being editable for money. Use the `news-dialog` skill, `isAdmin: true`
