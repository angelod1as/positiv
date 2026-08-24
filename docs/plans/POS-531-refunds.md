# POS-531 — Refunds through Asaas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin gives money back from the same modal that shows the payment, in full or in part, and the ledger follows the refund through to completion.

**Architecture:** The request and the completion are separate facts. Clicking "Reembolsar" claims the request with a guarded `UPDATE` on `refund_requested_at` — that claim is what stops a second click from asking Asaas twice — and then calls Asaas. Only the webhook (POS-530) sets `refunded` / `partially_refunded`, because only Asaas knows when the money actually left. If the call fails, the claim is released and the row stays `paid`.

**Tech Stack:** Kysely, composable-functions, ShadcN AlertDialog, Vitest.

**Spec:** `docs/plans/payments-v3-design.md` §5.4, §10 PR 12.

**Branch:** `pos-531-refunds` from `main`, worktree `wt/pos-531-refunds`.

**Depends on:** POS-530.

---

## What the admin needs to know, and where the copy says it

Asaas' rules, from the research: a PIX payment can be refunded within 90 days and the fee comes back; a card payment within 365 days, and a *partial* refund does not return the original fee. The modal says so before the confirmation, because the difference is money and the admin is the one deciding.

---

### Task 1: `requestRefund`

**Files:**
- Modify: `app/business/payment/payment-refund.server.ts`
- Test: `app/business/payment/payment-refund-asaas.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"

const refundAsaasPayment = vi.fn().mockResolvedValue(undefined)
const refundAsaasInstallment = vi.fn().mockResolvedValue(undefined)
vi.mock("./asaas-client.server", () => ({
  refundAsaasPayment: (...a: unknown[]) => refundAsaasPayment(...a),
  refundAsaasInstallment: (...a: unknown[]) => refundAsaasInstallment(...a),
  reaisToCents: (reais: number) => Math.round(reais * 100),
}))

const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

import { requestRefund } from "./payment-refund.server"

describe("requestRefund", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string
  let counter = 0

  beforeEach(async () => {
    tracker.clear()
    counter += 1
    refundAsaasPayment.mockClear().mockResolvedValue(undefined)
    refundAsaasInstallment.mockClear().mockResolvedValue(undefined)
    logger.error.mockClear()

    const testId = `${Date.now()}-${counter}`
    const event = await createTestEvent(tracker, kysely, { title: "Refund Event" })
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

  async function paidCharge(overrides: Record<string, unknown> = {}) {
    return createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      method: "pix",
      amount: 22199,
      asaas_payment_id: `pay_${counter}`,
      ...overrides,
    })
  }

  async function reload(id: string) {
    return kysely
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow()
  }

  it("claims the request and asks Asaas for the full amount", async () => {
    const payment = await paidCharge()

    const result = await requestRefund({ paymentId: payment.id, amount: null, reason: "Cancelou" })

    expect(result.success).toBe(true)
    expect(refundAsaasPayment).toHaveBeenCalledWith(`pay_${counter}`, {
      amount: null,
      description: "Cancelou",
    })

    const after = await reload(payment.id)
    expect(after.refund_requested_at).not.toBeNull()
    // The webhook, not this call, moves the status.
    expect(after.status).toBe("paid")
    expect(after.refund_amount).toBeNull()
  })

  it("asks for a partial amount when one is given", async () => {
    const payment = await paidCharge()

    await requestRefund({ paymentId: payment.id, amount: 5000, reason: null })

    expect(refundAsaasPayment).toHaveBeenCalledWith(`pay_${counter}`, {
      amount: 5000,
      description: null,
    })
  })

  it("refunds the whole plan for an installment payment", async () => {
    const payment = await paidCharge({
      method: "credit_card",
      installment_count: 3,
      asaas_installment_id: `inst_${counter}`,
    })

    await requestRefund({ paymentId: payment.id, amount: null, reason: null })

    expect(refundAsaasInstallment).toHaveBeenCalledWith(`inst_${counter}`, null)
    expect(refundAsaasPayment).not.toHaveBeenCalled()
  })

  it("asks Asaas once however many times it is clicked", async () => {
    const payment = await paidCharge()

    const [first, second] = await Promise.all([
      requestRefund({ paymentId: payment.id, amount: null, reason: null }),
      requestRefund({ paymentId: payment.id, amount: null, reason: null }),
    ])

    expect([first.success, second.success].filter(Boolean)).toHaveLength(1)
    expect(refundAsaasPayment).toHaveBeenCalledTimes(1)
  })

  it("releases the claim when Asaas refuses", async () => {
    refundAsaasPayment.mockRejectedValueOnce(new Error("Asaas 400 on /refund: invalid_value"))
    const payment = await paidCharge()

    const result = await requestRefund({ paymentId: payment.id, amount: null, reason: null })

    expect(result.success).toBe(false)
    const after = await reload(payment.id)
    expect(after.refund_requested_at).toBeNull()
    expect(after.status).toBe("paid")
    expect(logger.error).toHaveBeenCalled()
  })

  it("refuses to refund more than was paid", async () => {
    const payment = await paidCharge()

    const result = await requestRefund({ paymentId: payment.id, amount: 30000, reason: null })

    expect(result.success).toBe(false)
    expect(refundAsaasPayment).not.toHaveBeenCalled()
  })

  it("refuses a charge that was never paid", async () => {
    const payment = await paidCharge({ status: "awaiting_payment", amount: 22199, paid_at: null })

    const result = await requestRefund({ paymentId: payment.id, amount: null, reason: null })

    expect(result.success).toBe(false)
    expect(refundAsaasPayment).not.toHaveBeenCalled()
  })

  it("refuses a manual payment — that one is marked by hand", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "manual",
      method: "pix",
      amount: 22000,
    })

    const result = await requestRefund({ paymentId: payment.id, amount: null, reason: null })

    expect(result.success).toBe(false)
    expect(refundAsaasPayment).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/business/payment/payment-refund-asaas.integration.test.ts`
Expected: FAIL — `requestRefund` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `app/business/payment/payment-refund.server.ts`:

```ts
import { refundAsaasInstallment, refundAsaasPayment } from "./asaas-client.server"
import { logger } from "~/lib/logger/logger.server"

export const requestRefundSchema = zod.object({
  paymentId: zod.string().uuid(),
  amount: zod.union([zod.string(), zod.number()]).transform(reaisToCents).nullish(),
  reason: zod.string().nullish(),
})

/**
 * Asks Asaas to give the money back.
 *
 * `refund_requested_at` is claimed first, with a guarded UPDATE: whoever wins
 * that write is the only one who calls Asaas, so a double click — or two admins
 * — cannot refund twice. The status stays `paid` until the webhook says the
 * money actually left; a refund can take days on a card, and claiming otherwise
 * would show the participant a refund that has not happened.
 */
export const requestRefund = applySchema(requestRefundSchema)(async (values) => {
  const payment = await kyselyDb
    .selectFrom("payments")
    .selectAll()
    .where("id", "=", values.paymentId)
    .executeTakeFirst()

  if (!payment || payment.kind !== "asaas") {
    throw new Error(paymentsCopy.errors.notAsaasRefundable)
  }

  if (payment.status !== "paid" || payment.amount === null) {
    throw new Error(paymentsCopy.errors.notRefundable)
  }

  const amount = values.amount ?? null
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0 || amount > payment.amount)) {
    throw new Error(paymentsCopy.errors.refundTooLarge)
  }

  const claimed = await kyselyDb
    .updateTable("payments")
    .set({ refund_requested_at: new Date().toISOString() })
    .where("id", "=", payment.id)
    .where("status", "=", "paid")
    .where("refund_requested_at", "is", null)
    .returning("id")
    .executeTakeFirst()

  if (!claimed) {
    throw new Error(paymentsCopy.errors.refundAlreadyRequested)
  }

  try {
    if (payment.asaas_installment_id) {
      // A card plan is refunded as a whole; Asaas has no partial refund for one.
      await refundAsaasInstallment(payment.asaas_installment_id, values.reason ?? null)
    } else if (payment.asaas_payment_id) {
      await refundAsaasPayment(payment.asaas_payment_id, {
        amount,
        description: values.reason ?? null,
      })
    } else {
      throw new Error(paymentsCopy.errors.notAsaasRefundable)
    }
  } catch (error) {
    // Release the claim so the admin can try again once the reason is fixed.
    await kyselyDb
      .updateTable("payments")
      .set({ refund_requested_at: null })
      .where("id", "=", payment.id)
      .execute()

    logger.error("Asaas refused the refund", {
      paymentId: payment.id,
      asaasPaymentId: payment.asaas_payment_id,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }

  return { requested: true as const }
})
```

Add to `app/copy/payments.ts` under `errors`:

```ts
    notAsaasRefundable:
      "Este pagamento não passou pelo Asaas. Use 'Marcar como reembolsado'.",
    refundAlreadyRequested: "O reembolso já foi solicitado.",
```

and under `refund`:

```ts
    requested: "Reembolso solicitado.",
    inProgress: "Reembolso solicitado — aguardando o Asaas confirmar.",
    windowPix: "Pix: o Asaas devolve na hora e a taxa volta para a Positiv.",
    windowCard:
      "Cartão: aparece na fatura em até 10 dias úteis. Num reembolso parcial a taxa original não volta.",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:integration -- app/business/payment/payment-refund-asaas.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/payment-refund.server.ts app/business/payment/payment-refund-asaas.integration.test.ts app/copy/payments.ts
git commit -m "feat(payments): ask Asaas for a refund, once"
```

---

### Task 2: The modal offers it

**Files:**
- Modify: `app/components/organisms/payment/manage-payment-modal.tsx`
- Modify: `app/pages/admin/events/view-event-participant/view-event-participant.tsx`, `view-event-page.tsx`
- Test: `manage-payment-modal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
  it("offers an Asaas refund on a paid Asaas payment", async () => {
    render(<ManagePaymentModal {...baseProps} payments={[paidAsaasPayment]} />)

    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }))
    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }))

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect(formData.get("intent")).toBe("payment-refund")
    expect(formData.get("paymentId")).toBe(paidAsaasPayment.id)
    expect(formData.get("amount")).toBe("")
  })

  it("sends the partial amount when one is typed", async () => {
    render(<ManagePaymentModal {...baseProps} payments={[paidAsaasPayment]} />)

    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }))
    await userEvent.click(screen.getByRole("radio", { name: "Reembolso parcial" }))
    await userEvent.type(screen.getByLabelText("Valor devolvido"), "50")
    await userEvent.click(screen.getByRole("button", { name: /confirmar/i }))

    const [formData] = submit.mock.calls.at(-1) ?? []
    expect(formData.get("amount")).toBe("50")
  })

  it("warns about the card fee on a card payment", async () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[{ ...paidAsaasPayment, method: "credit_card", installment_count: 3 }]}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Reembolsar" }))
    expect(screen.getByText(/em até 10 dias úteis/i)).toBeInTheDocument()
  })

  it("offers only the manual mark for a manual payment", () => {
    render(<ManagePaymentModal {...baseProps} payments={[paidManualPayment]} />)

    expect(screen.getByRole("button", { name: /marcar como reembolsado/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Reembolsar" })).not.toBeInTheDocument()
  })

  it("says a refund is under way instead of offering another", () => {
    render(
      <ManagePaymentModal
        {...baseProps}
        payments={[{ ...paidAsaasPayment, refund_requested_at: "2026-08-24T12:00:00Z" }]}
      />,
    )

    expect(screen.getByText(/aguardando o Asaas confirmar/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Reembolsar" })).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/components/organisms/payment`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

In the modal, on a row with `kind === "asaas" && status === "paid" && !refund_requested_at`, render a "Reembolsar" button opening an `AlertDialog` with a radio pair (`refund.full` / `refund.partial`), an amount field enabled by the partial option, an optional reason, and the window warning chosen by `method` (`windowPix` or `windowCard`). Confirming posts `intent=payment-refund` with `paymentId`, `amount` and `reason`.

When `refund_requested_at` is set and the status is still `paid`, show `refund.inProgress` in place of the button.

Add the intent to both admin actions:

```ts
  if (intent === "payment-refund") {
    const result = await requestRefund(Object.fromEntries(formData))
    return { success: result.success, intent, errors: result.success ? undefined : result.errors }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/components/organisms/payment app/pages/admin`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/organisms/payment app/pages/admin
git commit -m "feat(payments): refund from the payment modal"
```

---

### Task 3: The refund email

**Files:**
- Create: `app/copy/emails/payment-refund.ts`
- Create: `app/business/email/templates/payment-refund-mail.template.ts`
- Create: `app/business/email/format-payment-refund-mail.ts`
- Modify: `app/business/payment/payment-emails.server.ts` (`sendPaymentRefundEmail`, already called by POS-530 and by `markManualRefunded`)
- Test: `payment-refund-mail.template.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe("paymentRefundMailTemplate", () => {
  it("states the amount returned and how long it takes", () => {
    const html = paymentRefundMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa de Setembro",
      eventEmoji: "🎉",
      refundAmount: 22199,
      amount: 22199,
      method: "pix",
    } as never)

    expect(html).toContain("R$ 221,99")
    expect(html).toContain("Pix")
  })

  it("says it is partial when it is", () => {
    const html = paymentRefundMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa",
      eventEmoji: null,
      refundAmount: 5000,
      amount: 22199,
      method: "credit_card",
    } as never)

    expect(html).toContain("R$ 50,00")
    expect(html).toContain("parcial")
  })

  it("escapes the name", () => {
    const html = paymentRefundMailTemplate({
      displayName: "<script>x</script>",
      eventTitle: "Festa",
      eventEmoji: null,
      refundAmount: 100,
      amount: 100,
      method: "pix",
    } as never)

    expect(html).not.toContain("<script>")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/email/templates/payment-refund-mail.template.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Same template shape as the others. The copy names the expected timing by method — instant for PIX, up to ten business days on a card — and says "parcial" when `refundAmount < amount`. `sendPaymentRefundEmail({ paymentId })` loads what it needs and sends; failures are logged, never thrown, for the same reason as the confirmation email.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/email`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/email app/copy/emails/payment-refund.ts app/business/payment/payment-emails.server.ts
git commit -m "feat(payments): email the participant when money is returned"
```

---

### Task 4: Full verification

- [ ] Run: `pnpm lint`, `pnpm test` — green
- [ ] Manually on the sandbox: pay a PIX charge, refund it in full from the modal, watch the webhook arrive and the row become `refunded`, with the email in Mailpit
- [ ] Manually: refund a second charge partially and check `partially_refunded`, `refund_amount`, and that the financial summary's net drops by exactly that amount
- [ ] Manually: refund one that Asaas will refuse (a charge deleted in the dashboard) and check the row stays `paid` with `refund_requested_at` empty and a Telegram alert raised
- [ ] Run E2E **once, last**: `pnpm test:e2e`

## Definition of done

- PR title: `[POS-531] Refund a payment from the admin panel`
- `Fixes POS-531`; Implementation Notes explains why the status waits for the webhook
- Delete this plan file before opening the PR
