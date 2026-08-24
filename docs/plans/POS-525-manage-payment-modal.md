# POS-525 — "Gerenciar pagamento" modal with manual payments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One modal where an admin sees a participant's whole payment history and records what happened outside the system — money received, money given back, a charge called off. Closes Phase A: the ledger is fully usable with no Asaas at all.

**Architecture:** A server module per verb (`manual-payment.server.ts`, `payment-refund.server.ts`, `payment-totals.server.ts`), each a guarded statement so two admins clicking at once cannot double-write. The modal is one component opened from two places — the `$` button POS-523 left in the grid, and a button on the participant detail page — and posts to intents on the routes that already own those pages.

**Tech Stack:** Kysely, composable-functions, React with `useFetcher`, ShadcN Dialog/AlertDialog, zod v4, Vitest.

**Spec:** `docs/plans/payments-v3-design.md` §5.5, §7, §10 PR 6.

**Branch:** `pos-525-manage-payment-modal` from `main`, worktree `wt/pos-525-manage-payment-modal`.

**Depends on:** POS-524. Ship it right after — between POS-523 and this PR there is no way to record a payment.

---

## A security hole this PR closes

`app/pages/admin/events/view-event-participant/view-event-participant.tsx` has an `action` that dispatches on `intent` and **never checks that the caller is an admin**. The only guard is the loader in `app/pages/guard/admin.tsx`, and React Router runs actions *before* revalidating loaders — a layout loader does not gate a POST. Any authenticated user can currently post `intent=update-event-participant` to that URL.

Task 5 adds `getAdminContext` to both admin actions. It is in scope here because this PR is the one adding money-moving intents to them.

---

### Task 1: Reading a participant's payments

**Files:**
- Create: `app/business/payment/payment-totals.server.ts`
- Test: `app/business/payment/payment-totals.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"
import { getPaymentsForParticipant } from "./payment-totals.server"

describe("getPaymentsForParticipant", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Totals Event",
      ticket_price: 20000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-totals@example.com`,
      full_name: "Totals Tester",
    })
    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profile.id,
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("returns the totals and an empty list when nothing was paid", async () => {
    const result = await getPaymentsForParticipant(participantId)

    expect(result.payments).toEqual([])
    expect(result.totals).toMatchObject({ paid_gross: 0, net: 0, fee: 0, has_paid: false })
    expect(result.active).toBeNull()
  })

  it("lists payments newest first and names the open one", async () => {
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 11000,
      created_at: new Date(Date.now() - 60_000).toISOString(),
    })
    const active = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
    })

    const result = await getPaymentsForParticipant(participantId)

    expect(result.payments).toHaveLength(2)
    expect(result.payments[0].id).toBe(active.id)
    expect(result.active?.id).toBe(active.id)
    expect(result.totals.paid_gross).toBe(11000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/business/payment/payment-totals.integration.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/business/payment/payment-totals.server.ts
import type { Selectable } from "kysely"
import { kyselyDb } from "~/kysely-db"
import type { Database } from "~types/database/kysely.types"

export type PaymentRow = Selectable<Database["payments"]>

export type ParticipantPayments = {
  payments: PaymentRow[]
  totals: {
    paid_gross: number
    refunded: number
    fee: number
    net: number
    has_paid: boolean
    current_status: PaymentRow["status"] | null
  }
  active: PaymentRow | null
}

const ACTIVE_STATUSES = ["pending", "awaiting_payment"] as const

export async function getPaymentsForParticipant(
  eventParticipantId: string,
): Promise<ParticipantPayments> {
  const [payments, totals] = await Promise.all([
    kyselyDb
      .selectFrom("payments")
      .selectAll()
      .where("event_participant_id", "=", eventParticipantId)
      .orderBy("created_at", "desc")
      .execute(),
    kyselyDb
      .selectFrom("event_participant_payments")
      .selectAll()
      .where("event_participant_id", "=", eventParticipantId)
      .executeTakeFirst(),
  ])

  return {
    payments,
    totals: {
      paid_gross: totals?.paid_gross ?? 0,
      refunded: totals?.refunded ?? 0,
      fee: totals?.fee ?? 0,
      net: totals?.net ?? 0,
      has_paid: totals?.has_paid ?? false,
      current_status: totals?.current_status ?? null,
    },
    active:
      payments.find((payment) =>
        (ACTIVE_STATUSES as readonly string[]).includes(payment.status),
      ) ?? null,
  }
}
```

The list is sorted newest first, and the open charge is by definition the newest of the active ones, so `find` on the sorted list is enough — the partial unique index guarantees there is at most one.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:integration -- app/business/payment/payment-totals.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/payment-totals.server.ts app/business/payment/payment-totals.integration.test.ts
git commit -m "feat(payments): read a participant's payments and totals"
```

---

### Task 2: Recording a manual payment

**Files:**
- Create: `app/business/payment/manual-payment.server.ts`
- Test: `app/business/payment/manual-payment.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"
import { registerManualPayment } from "./manual-payment.server"

describe("registerManualPayment", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string
  let adminProfileId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Manual Payment Event",
      ticket_price: 20000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-manual@example.com`,
      full_name: "Manual Tester",
    })
    const admin = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-admin@example.com`,
      full_name: "Admin",
    })
    adminProfileId = admin.id
    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profile.id,
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("records a paid row and credits the totals", async () => {
    const result = await registerManualPayment({
      eventParticipantId: participantId,
      amount: 15000,
      method: "pix",
      paidAt: "2026-08-20",
      note: "Combinado no WhatsApp",
      createdBy: adminProfileId,
    })

    expect(result.success).toBe(true)

    const row = await kysely
      .selectFrom("payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .executeTakeFirstOrThrow()
    tracker.track("payments", row.id)

    expect(row).toMatchObject({
      kind: "manual",
      status: "paid",
      method: "pix",
      amount: 15000,
      base_amount: 15000,
      note: "Combinado no WhatsApp",
      created_by: adminProfileId,
    })

    const totals = await kysely
      .selectFrom("event_participant_payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .executeTakeFirstOrThrow()
    expect(totals.net).toBe(15000)
    expect(totals.fee).toBe(0)
  })

  it("refuses an amount of zero or less", async () => {
    const result = await registerManualPayment({
      eventParticipantId: participantId,
      amount: 0,
      method: "cash",
      paidAt: "2026-08-20",
      note: null,
      createdBy: adminProfileId,
    })

    expect(result.success).toBe(false)
  })

  it("refuses to record one while a charge is still open", async () => {
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
    })

    const result = await registerManualPayment({
      eventParticipantId: participantId,
      amount: 15000,
      method: "pix",
      paidAt: "2026-08-20",
      note: null,
      createdBy: adminProfileId,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0].message).toMatch(/cobrança em aberto/i)
    }
  })

  it("allows a second manual payment once the first is recorded", async () => {
    await registerManualPayment({
      eventParticipantId: participantId,
      amount: 10000,
      method: "pix",
      paidAt: "2026-08-20",
      note: null,
      createdBy: adminProfileId,
    })
    const second = await registerManualPayment({
      eventParticipantId: participantId,
      amount: 5000,
      method: "cash",
      paidAt: "2026-08-21",
      note: null,
      createdBy: adminProfileId,
    })

    expect(second.success).toBe(true)

    const totals = await kysely
      .selectFrom("event_participant_payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .executeTakeFirstOrThrow()
    expect(totals.paid_gross).toBe(15000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/business/payment/manual-payment.integration.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/business/payment/manual-payment.server.ts
import { applySchema } from "composable-functions"
import { kyselyDb } from "~/kysely-db"
import { paymentsCopy } from "~/copy/payments"
import { zod } from "~/lib/helpers/zod"
import { reaisToCents } from "~/lib/helpers/format-currency"

export const manualPaymentSchema = zod.object({
  eventParticipantId: zod.string().uuid(),
  amount: zod
    .union([zod.string(), zod.number()])
    .transform(reaisToCents)
    .refine((cents) => Number.isFinite(cents) && cents > 0, {
      error: paymentsCopy.errors.amountRequired,
    }),
  method: zod.enum(["pix", "cash", "transfer", "other"]),
  paidAt: zod.string().min(1),
  note: zod.string().nullish(),
  createdBy: zod.string().uuid().nullish(),
})

/**
 * Money that arrived outside Asaas: a transfer, cash at the door, a courtesy
 * settled by hand. `base_amount` equals `amount` because there is no fee and
 * nothing was negotiated separately — what arrived is what was agreed.
 */
export const registerManualPayment = applySchema(manualPaymentSchema)(
  async (values) => {
    const open = await kyselyDb
      .selectFrom("payments")
      .select("id")
      .where("event_participant_id", "=", values.eventParticipantId)
      .where("status", "in", ["pending", "awaiting_payment"])
      .executeTakeFirst()

    if (open) {
      throw new Error(paymentsCopy.errors.activeChargeExists)
    }

    const paidAt = new Date(values.paidAt).toISOString()

    await kyselyDb
      .insertInto("payments")
      .values({
        event_participant_id: values.eventParticipantId,
        kind: "manual",
        status: "paid",
        method: values.method,
        base_amount: values.amount,
        amount: values.amount,
        paid_at: paidAt,
        due_at: paidAt,
        note: values.note ?? null,
        created_by: values.createdBy ?? null,
      })
      .execute()

    return { ok: true as const }
  },
)
```

Create `app/copy/payments.ts` with what this plan needs (POS-527 and POS-528 add to it):

```ts
export const paymentsCopy = {
  manage: {
    title: "Pagamentos",
    trigger: "Gerenciar pagamento",
    empty: "Nenhum pagamento registrado.",
    totals: {
      gross: "Total pago",
      fee: "Taxas",
      net: "Líquido",
      refunded: "Reembolsado",
    },
    columns: {
      status: "Situação",
      kind: "Origem",
      method: "Forma",
      amount: "Valor",
      date: "Data",
    },
    kinds: { asaas: "Asaas", manual: "Manual" },
    methods: {
      pix: "Pix",
      credit_card: "Cartão de crédito",
      cash: "Dinheiro",
      transfer: "Transferência",
      other: "Outro",
    },
  },
  manual: {
    title: "Registrar pagamento manual",
    description:
      "Para dinheiro que não passou pelo Asaas: transferência, dinheiro ou cortesia combinada por fora.",
    amount: "Valor recebido",
    method: "Forma",
    paidAt: "Data do pagamento",
    note: "Observação",
    submit: "Registrar pagamento",
    success: "Pagamento registrado.",
  },
  refund: {
    title: "Marcar como reembolsado",
    description:
      "Registra que o dinheiro voltou para a pessoa. Não movimenta nada no Asaas.",
    amount: "Valor devolvido",
    full: "Reembolso total",
    partial: "Reembolso parcial",
    submit: "Marcar reembolso",
    confirm: "Confirmar reembolso?",
    success: "Reembolso registrado.",
  },
  cancel: {
    title: "Cancelar cobrança",
    confirm: "Cancelar a cobrança em aberto?",
    submit: "Cancelar cobrança",
    success: "Cobrança cancelada.",
  },
  errors: {
    amountRequired: "Informe um valor maior que zero.",
    activeChargeExists:
      "Existe uma cobrança em aberto. Cancele-a antes de registrar um pagamento manual.",
    refundTooLarge: "O reembolso não pode ser maior que o valor pago.",
    notRefundable: "Só é possível reembolsar um pagamento já confirmado.",
    notCancellable: "Só é possível cancelar uma cobrança em aberto.",
    generic: "Não foi possível concluir a operação.",
  },
} as const
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:integration -- app/business/payment/manual-payment.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/manual-payment.server.ts app/business/payment/manual-payment.integration.test.ts app/copy/payments.ts
git commit -m "feat(payments): record a payment that did not go through Asaas"
```

---

### Task 3: Marking a manual payment refunded, and cancelling a charge

**Files:**
- Create: `app/business/payment/payment-refund.server.ts`
- Create: `app/business/payment/payment-cancel.server.ts`
- Test: `app/business/payment/payment-refund.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"
import { markManualRefunded } from "./payment-refund.server"
import { cancelPayment } from "./payment-cancel.server"

describe("markManualRefunded", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Refund Event",
      ticket_price: 20000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-refund@example.com`,
      full_name: "Refund Tester",
    })
    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profile.id,
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("marks a full refund", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 20000,
    })

    const result = await markManualRefunded({ paymentId: payment.id, amount: null })
    expect(result.success).toBe(true)

    const after = await kysely
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow()

    expect(after.status).toBe("refunded")
    expect(after.refund_amount).toBe(20000)
    expect(after.refunded_at).not.toBeNull()
  })

  it("marks a partial refund", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 20000,
    })

    await markManualRefunded({ paymentId: payment.id, amount: 5000 })

    const after = await kysely
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow()

    expect(after.status).toBe("partially_refunded")
    expect(after.refund_amount).toBe(5000)

    const totals = await kysely
      .selectFrom("event_participant_payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .executeTakeFirstOrThrow()
    expect(totals.net).toBe(15000)
  })

  it("refuses a refund larger than the payment", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 20000,
    })

    const result = await markManualRefunded({ paymentId: payment.id, amount: 30000 })
    expect(result.success).toBe(false)
  })

  it("refuses to refund a payment that is not paid", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
    })

    const result = await markManualRefunded({ paymentId: payment.id, amount: null })
    expect(result.success).toBe(false)
  })

  it("refuses to refund twice", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 20000,
    })

    await markManualRefunded({ paymentId: payment.id, amount: null })
    const second = await markManualRefunded({ paymentId: payment.id, amount: null })

    expect(second.success).toBe(false)
  })
})

describe("cancelPayment", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, { title: "Cancel Event" })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-cancel@example.com`,
      full_name: "Cancel Tester",
    })
    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profile.id,
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("cancels an open charge", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
    })

    const result = await cancelPayment({ paymentId: payment.id })
    expect(result.success).toBe(true)

    const after = await kysely
      .selectFrom("payments")
      .select("status")
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow()
    expect(after.status).toBe("cancelled")
  })

  it("refuses to cancel a paid one", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 20000,
    })

    const result = await cancelPayment({ paymentId: payment.id })
    expect(result.success).toBe(false)
  })

  it("frees the participant to receive a new charge", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
    })

    await cancelPayment({ paymentId: payment.id })

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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/business/payment/payment-refund.integration.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/business/payment/payment-refund.server.ts
import { applySchema } from "composable-functions"
import { kyselyDb } from "~/kysely-db"
import { paymentsCopy } from "~/copy/payments"
import { zod } from "~/lib/helpers/zod"
import { reaisToCents } from "~/lib/helpers/format-currency"

export const markManualRefundedSchema = zod.object({
  paymentId: zod.string().uuid(),
  amount: zod
    .union([zod.string(), zod.number()])
    .transform(reaisToCents)
    .nullish(),
})

/**
 * Money given back outside Asaas. The UPDATE is guarded on the status it
 * expects, so a second click — or a second admin — writes nothing instead of
 * refunding twice.
 */
export const markManualRefunded = applySchema(markManualRefundedSchema)(
  async (values) => {
    const payment = await kyselyDb
      .selectFrom("payments")
      .select(["amount", "status"])
      .where("id", "=", values.paymentId)
      .executeTakeFirst()

    if (!payment || payment.status !== "paid" || payment.amount === null) {
      throw new Error(paymentsCopy.errors.notRefundable)
    }

    const refundAmount = values.amount ?? payment.amount
    if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > payment.amount) {
      throw new Error(paymentsCopy.errors.refundTooLarge)
    }

    const now = new Date().toISOString()
    const updated = await kyselyDb
      .updateTable("payments")
      .set({
        status: refundAmount === payment.amount ? "refunded" : "partially_refunded",
        refund_amount: refundAmount,
        refunded_at: now,
      })
      .where("id", "=", values.paymentId)
      .where("status", "=", "paid")
      .returning("id")
      .executeTakeFirst()

    if (!updated) {
      throw new Error(paymentsCopy.errors.notRefundable)
    }

    return { ok: true as const }
  },
)
```

```ts
// app/business/payment/payment-cancel.server.ts
import { applySchema } from "composable-functions"
import { kyselyDb } from "~/kysely-db"
import { paymentsCopy } from "~/copy/payments"
import { zod } from "~/lib/helpers/zod"

export const cancelPaymentSchema = zod.object({ paymentId: zod.string().uuid() })

/**
 * Calls off a charge nobody has paid. Guarded on the open statuses so a payment
 * confirmed a moment ago cannot be cancelled out from under the money.
 *
 * POS-528 extends this to delete the charge on Asaas as well.
 */
export const cancelPayment = applySchema(cancelPaymentSchema)(async (values) => {
  const cancelled = await kyselyDb
    .updateTable("payments")
    .set({ status: "cancelled" })
    .where("id", "=", values.paymentId)
    .where("status", "in", ["pending", "awaiting_payment"])
    .returning("id")
    .executeTakeFirst()

  if (!cancelled) {
    throw new Error(paymentsCopy.errors.notCancellable)
  }

  return { ok: true as const }
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:integration -- app/business/payment/payment-refund.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/payment-refund.server.ts app/business/payment/payment-cancel.server.ts app/business/payment/payment-refund.integration.test.ts
git commit -m "feat(payments): mark a manual refund and cancel an open charge"
```

---

### Task 4: The modal

**Files:**
- Create: `app/components/organisms/payment/manage-payment-modal.tsx`
- Test: `app/components/organisms/payment/manage-payment-modal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import { render, screen, within } from "~/test/test-utils"
import { ManagePaymentModal } from "./manage-payment-modal"

const submit = vi.fn()
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router")
  return {
    ...actual,
    useFetcher: () => ({ submit, state: "idle", data: undefined, Form: "form" }),
  }
})

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  eventParticipantId: "ep-1",
  participantName: "Ana",
  payments: [],
  totals: { paid_gross: 0, refunded: 0, fee: 0, net: 0, has_paid: false, current_status: null },
  active: null,
}

describe("ManagePaymentModal", () => {
  it("says when there is nothing recorded", () => {
    render(<ManagePaymentModal {...baseProps} />)
    expect(screen.getByText("Nenhum pagamento registrado.")).toBeInTheDocument()
  })

  it("lists a payment with its origin, method and amount", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[
          {
            id: "p1",
            kind: "manual",
            status: "paid",
            method: "pix",
            amount: 22000,
            base_amount: 22000,
            paid_at: "2026-08-20T12:00:00Z",
            asaas_net: null,
            refund_amount: null,
          } as never,
        ]}
        totals={{ ...baseProps.totals, paid_gross: 22000, net: 22000, has_paid: true }}
      />,
    )

    const row = screen.getByRole("row", { name: /pix/i })
    expect(within(row).getByText("R$ 220,00")).toBeInTheDocument()
    expect(within(row).getByText("Manual")).toBeInTheDocument()
    expect(screen.getByText("Pago")).toBeInTheDocument()
  })

  it("records a manual payment through the form", async () => {
    render(<ManagePaymentModal {...baseProps} />)

    await userEvent.type(screen.getByLabelText("Valor recebido"), "150")
    await userEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }))

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect(formData.get("intent")).toBe("payment-manual")
    expect(formData.get("amount")).toBe("150")
    expect(formData.get("eventParticipantId")).toBe("ep-1")
  })

  it("offers a refund only for a paid row", async () => {
    const paid = {
      id: "p1",
      kind: "manual",
      status: "paid",
      method: "pix",
      amount: 22000,
    } as never

    const { rerender } = render(<ManagePaymentModal {...baseProps} payments={[paid]} />)
    expect(screen.getByRole("button", { name: /marcar como reembolsado/i })).toBeInTheDocument()

    rerender(
      <ManagePaymentModal
        {...baseProps}
        payments={[{ ...(paid as object), status: "refunded" } as never]}
      />,
    )
    expect(
      screen.queryByRole("button", { name: /marcar como reembolsado/i }),
    ).not.toBeInTheDocument()
  })

  it("offers to cancel only an open charge", async () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        active={{ id: "p1", status: "pending", kind: "asaas" } as never}
        payments={[{ id: "p1", status: "pending", kind: "asaas", amount: null } as never]}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: /cancelar cobrança/i }))
    await userEvent.click(screen.getByRole("button", { name: /^cancelar cobrança$/i }))

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect(formData.get("intent")).toBe("payment-cancel")
    expect(formData.get("paymentId")).toBe("p1")
  })

  it("hides the manual form while a charge is open", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        active={{ id: "p1", status: "pending", kind: "asaas" } as never}
      />,
    )

    expect(screen.queryByLabelText("Valor recebido")).not.toBeInTheDocument()
    expect(
      screen.getByText(/cancele-a antes de registrar um pagamento manual/i),
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/components/organisms/payment`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Build `ManagePaymentModal` with ShadcN `Dialog`, and an `AlertDialog` around each destructive action (refund, cancel). Structure:

1. **Totals row** — gross, fees, net, refunded, each `formatCurrency`.
2. **Table of payments** — one row per payment: status badge, origin (`kinds`), method (`methods`), amount, date; a "Marcar como reembolsado" button on `status === "paid"`, a "Cancelar cobrança" button on an open row.
3. **Manual payment form** — amount (text, reais), method (`Select` over `pix|cash|transfer|other`), date (`input type="date"`, defaulting to today), note (optional). Rendered only when `active === null`; otherwise the sentence from `paymentsCopy.errors.activeChargeExists`.

Every action posts through one `useFetcher` with an `intent`, matching the strings the tests assert: `payment-manual`, `payment-manual-refund`, `payment-cancel`. Show `paymentsCopy.*.success` on success and the returned message on failure, following the toast pattern already used in `participant-vs-event-data.tsx`.

Every string comes from `paymentsCopy` — `react/jsx-no-literals` is enforced in this directory.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/components/organisms/payment`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/organisms/payment
git commit -m "feat(payments): add the manage payment modal"
```

---

### Task 5: Wire the modal, and guard the admin actions

**Files:**
- Modify: `app/pages/admin/events/view-event-participant/view-event-participant.tsx` (action + loader)
- Modify: `app/pages/admin/events/view-event-page/view-event-page.tsx` (action + loader)
- Modify: `app/components/pages/admin/participants/participant-detail.tsx`
- Modify: `app/components/organisms/tables/admin/participants-table/view-event-participants-table.tsx` (pass `onManagePayment`)
- Test: `view-event-participant.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
  it("refuses a payment intent from someone who is not an admin", async () => {
    vi.mocked(getAdminContext).mockRejectedValueOnce(new Response(null, { status: 302 }))

    await expect(
      action({
        request: new Request("http://localhost/admin/eventos/e1/participantes/p1", {
          method: "POST",
          body: new URLSearchParams({ intent: "payment-manual", amount: "100" }),
        }),
        params: { eventId: "e1", profileId: "p1" },
        context: {} as never,
      }),
    ).rejects.toBeInstanceOf(Response)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/pages/admin/events/view-event-participant`
Expected: FAIL — the action never calls the guard.

- [ ] **Step 3: Write minimal implementation**

At the top of both actions, before reading `intent`:

```ts
export async function action({ request, params }: Route.ActionArgs) {
  // Actions run before loaders revalidate, so the admin layout's loader does not
  // gate this POST. Every intent below moves data; check here.
  const context = await getAdminContext(request, params)
  const formData = await request.formData()
  const intent = formData.get("intent")
```

Add the three intents to `view-event-participant.tsx`:

```ts
  if (intent === "payment-manual") {
    const result = await registerManualPayment({
      ...Object.fromEntries(formData),
      createdBy: context.currentProfile.id,
    })
    return { success: result.success, intent, errors: result.success ? undefined : result.errors }
  }

  if (intent === "payment-manual-refund") {
    const result = await markManualRefunded(Object.fromEntries(formData))
    return { success: result.success, intent, errors: result.success ? undefined : result.errors }
  }

  if (intent === "payment-cancel") {
    const result = await cancelPayment(Object.fromEntries(formData))
    return { success: result.success, intent, errors: result.success ? undefined : result.errors }
  }
```

and the same three to `view-event-page.tsx` so the grid's `$` button works without navigating.

Both loaders gain the payments: in `view-event-participant.tsx`, `getPaymentsForParticipant(eventParticipant.id)`; in `view-event-page.tsx`, nothing extra — the grid already has `payment_status` and `active_payment_id` from POS-523, and the modal fetches on open through a `useFetcher` GET to the participant route, or is opened with the row's data and refreshed after each mutation. Choose the simpler: open the modal from the grid with the row totals it already has and a `payments` list loaded by the participant route when the admin navigates. If that reads as half a feature, load the list in the event page loader for every row — it is one extra query on a page that already loads every participant.

`ParticipantDetail` renders a "Gerenciar pagamento" button that opens the modal with the loader's data.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/pages/admin`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/pages/admin app/components
git commit -m "feat(payments): open the payment modal from the grid and the participant page"
```

---

### Task 6: News item

**Files:**
- Create: `app/components/organisms/news-dialog/items/<YYYY-MM-DD>-gerenciar-pagamento.ts`

Use the `news-dialog` skill. Admin-facing, so `isAdmin: true`.

```ts
import type { NewsItemContent } from "../news"

export default {
  title: "💰 Pagamentos agora ficam num lugar só",
  content:
    "O 'Pago?' e o campo de valor saíram da tabela. No lugar deles há um botão de cifrão em cada linha: ele abre o histórico de pagamentos da pessoa, onde você registra um pagamento manual, marca um reembolso ou cancela uma cobrança. Cada pagamento passa a guardar data, forma e observação.",
  isAdmin: true,
  createdAt: new Date("<YYYY-MM-DD>T12:00:00"),
} satisfies NewsItemContent
```

- [ ] Commit:

```bash
git add app/components/organisms/news-dialog/items
git commit -m "docs(news): announce the payment management modal"
```

---

### Task 7: Full verification

- [ ] Run: `pnpm lint`, `pnpm test` — green
- [ ] Manually, on the dev server: from the grid, click `$` on a participant → record R$ 150 by PIX → the row shows "Pago · R$ 150,00" → reopen the modal → mark a partial refund of R$ 50 → the financial summary shows net R$ 100
- [ ] Manually: try posting `intent=payment-manual` to the participant URL while logged in as a non-admin — it must redirect, not write
- [ ] Run E2E **once, last**, after checking the lock: `pnpm test:e2e`

## Definition of done

- PR title: `[POS-525] Manage payments from one modal`
- `Fixes POS-525`; Implementation Notes explains the missing `getAdminContext` this PR adds
- Delete this plan file before opening the PR
- Phase A is complete: the ledger is usable end to end with no Asaas
