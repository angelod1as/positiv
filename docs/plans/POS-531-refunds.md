# POS-531 — Refunds through Asaas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin gives money back from the same modal that shows the payment, in full or in part, and the ledger follows the refund through to completion.

**Architecture:** The request and the completion are separate facts. Clicking "Reembolsar" claims the request with a guarded `UPDATE` on `refund_requested_at` — that claim is what stops a second click from asking Asaas twice — and then calls Asaas. Only the webhook (POS-530) sets `refunded` / `partially_refunded`, because only Asaas knows when the money actually left. If the call fails and nothing moved, the claim is released and the row stays `paid`.

**Tech Stack:** Kysely, composable-functions, ShadcN AlertDialog, Vitest.

**Spec:** `docs/plans/payments-v3-design.md` §5.4, §10 PR 12.

**Branch:** `pos-531-payments-v3-pr-12-refunds-through-asaas`, worktree of the same name. Already created, at `main`.

**Depends on:** POS-530 — merged. The webhook already finalises `refunded` / `partially_refunded` and already writes `refund_requested_at` on `PAYMENT_REFUND_IN_PROGRESS`.

**No migration.** `refund_requested_at`, `refund_amount`, `refunded_at` and `asaas_net` all exist on `payments` since PR 2.

---

## What is given back, and why it is not the gross

**A refund gives back `asaas_net`, never `amount`.** The participant paid the
fees and keeps paying them. See design §5.4 for the arithmetic; the short
version is that this is the only shape that costs Positiv nothing:

- Refunding the gross is a *full* refund to Asaas. Asaas debits the gross and
  returns the transaction fee, but never the anticipation fee — and this
  project has anticipation always on. Positiv ends out of pocket by the
  anticipation on every refund.
- Refunding `asaas_net` is a *partial* refund to Asaas. It debits `asaas_net`
  and returns nothing. Positiv ends at zero and the participant absorbs the
  fees they chose to pay.

Asaas' rules behind that, verified against their docs in POS-528: the
transaction fee comes back on a full refund and not on a partial one;
compensation and notification fees never come back; the anticipation fee never
comes back, in any scenario. PIX can be refunded within 90 days and a card
within 365 — both far outside the 30-day registration window, so no deadline
is reachable in practice and the copy does not mention them. A PIX refund
needs the money available in the account and answers 400 when it is not.

### Decision: a card plan is refunded installment by installment

The open question this plan carried — `refundAsaasInstallment` refunds a plan
as a whole, which is a *full* refund by definition — is **settled: the plan is
never refunded as a whole.** `requestRefund` asks Asaas which payments make up
the installment, then refunds each one partially, for its share of the
amount. Positiv ends at zero on a plan exactly as it does on a PIX charge.

The price of that decision is a refund that is several HTTP calls instead of
one, and therefore a refund that can half-succeed. That case is handled
explicitly and never silently: if some installments were refunded and one
fails, **the claim is kept** — releasing it would let a retry refund the
already-refunded installments a second time — the failure is logged, and the
admin is told to finish the job in the Asaas dashboard.

`refundAsaasInstallment` becomes dead code and is deleted with its test, so
nothing in the client offers the shape this project decided against.

### Decision: no sandbox probe in this PR

The arithmetic is implemented from the documented fee rules and tested against
a mocked client. POS-532 already owns sandbox calibration, `scripts/asaas/smoke.ts`
and the runbook; it is where a real 3x charge is paid and refunded, and where
this formula is corrected if Asaas disagrees with it.

---

### Task 0: the client can list an installment's payments

**Files:**
- Modify: `app/business/payment/asaas-client.server.ts`
- Test: `app/business/payment/asaas-client.server.test.ts`

- [ ] **Step 1: Write the failing test**

In the `charges` describe, beside the existing refund tests:

```ts
it("lists the payments that make up an installment plan", async () => {
  fetchMock.mockResolvedValueOnce(
    jsonResponse({
      data: [
        { id: "pay_1", value: 78.77, netValue: 73.0, status: "CONFIRMED" },
        { id: "pay_2", value: 78.77, netValue: 73.0, status: "RECEIVED" },
        { id: "pay_3", value: 78.77, netValue: 73.0, status: "PENDING" },
      ],
    }),
  )

  const parts = await listAsaasInstallmentPayments("inst_1")

  expect(fetchMock.mock.calls[0][0]).toBe(
    "https://api-sandbox.asaas.com/v3/payments?installment=inst_1&limit=100",
  )
  // Only the ones whose money actually arrived can be given back.
  expect(parts).toEqual([
    { id: "pay_1", value: 7877 },
    { id: "pay_2", value: 7877 },
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/asaas-client.server.test.ts`
Expected: FAIL — `listAsaasInstallmentPayments` is not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
// The two statuses whose money is Positiv's to give back. A PENDING
// installment has not been charged to anyone yet, and refunding it answers 400.
const REFUNDABLE_STATUSES = ["CONFIRMED", "RECEIVED"]

export type AsaasInstallmentPayment = { id: string; value: number }

/**
 * The individual charges behind a card plan. A plan is refunded one payment at
 * a time — `/installments/{id}/refund` can only refund the whole thing, which
 * is a full refund, and a full refund costs Positiv the anticipation fee.
 */
export async function listAsaasInstallmentPayments(
  installmentId: string,
): Promise<AsaasInstallmentPayment[]> {
  const { data } = await asaasRequest(
    "GET",
    `/payments?installment=${installmentId}&limit=100`,
    zod.object({
      data: zod.array(
        zod.object({
          id: zod.string(),
          value: zod.number(),
          status: zod.string(),
        }),
      ),
    }),
  )

  return data
    .filter((payment) => REFUNDABLE_STATUSES.includes(payment.status))
    .map((payment) => ({ id: payment.id, value: reaisToCents(payment.value) }))
}
```

Delete `refundAsaasInstallment` and the test that covers it.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/asaas-client.server.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/asaas-client.server.ts app/business/payment/asaas-client.server.test.ts
git commit -m "feat(payments): list the charges behind a card plan"
```

---

### Task 1: the share each installment gives back

A pure function, tested on its own, because this is the part with the
arithmetic in it and it is the part a sandbox surprise will send us back to.

**Files:**
- Create: `app/business/payment/refund-split.ts`
- Test: `app/business/payment/refund-split.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe("splitRefund", () => {
  it("splits proportionally to what each installment charged", () => {
    expect(
      splitRefund(21900, [
        { id: "pay_1", value: 7877 },
        { id: "pay_2", value: 7877 },
        { id: "pay_3", value: 7877 },
      ]),
    ).toEqual([
      { id: "pay_1", amount: 7300 },
      { id: "pay_2", amount: 7300 },
      { id: "pay_3", amount: 7300 },
    ])
  })

  it("gives the rounding remainder to the last installment", () => {
    const split = splitRefund(10000, [
      { id: "pay_1", value: 5000 },
      { id: "pay_2", value: 5001 },
    ])
    expect(split.reduce((sum, part) => sum + part.amount, 0)).toBe(10000)
  })

  it("never asks an installment for more than it charged", () => {
    const split = splitRefund(9000, [
      { id: "pay_1", value: 1000 },
      { id: "pay_2", value: 9000 },
    ])
    split.forEach((part, index) =>
      expect(part.amount).toBeLessThanOrEqual([1000, 9000][index]),
    )
    expect(split.reduce((sum, part) => sum + part.amount, 0)).toBe(9000)
  })

  it("drops an installment whose share rounds to nothing", () => {
    expect(splitRefund(2, [{ id: "a", value: 100 }, { id: "b", value: 100 }])).toEqual([
      { id: "a", amount: 1 },
      { id: "b", amount: 1 },
    ])
    expect(splitRefund(1, [{ id: "a", value: 100 }, { id: "b", value: 100 }])).toEqual([
      { id: "b", amount: 1 },
    ])
  })

  it("refuses to split more than the plan charged", () => {
    expect(() => splitRefund(20000, [{ id: "a", value: 1000 }])).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/refund-split.test.ts`
Expected: FAIL — module does not exist. (The module is created empty first so
the failure is the assertion, not the import — see the TDD rule in CLAUDE.md:
a test that fails on a missing import proves nothing. Create
`refund-split.ts` exporting `splitRefund` that returns `[]`, and let the
first test fail on the value.)

- [ ] **Step 3: Write minimal implementation**

`splitRefund(amount, parts)`: proportional shares in integer cents, floored,
with the remainder added to the last part; each share capped at that part's
`value`; zero shares dropped; throws when `amount` exceeds the sum of values.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/refund-split.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/refund-split.ts app/business/payment/refund-split.test.ts
git commit -m "feat(payments): split a refund across a plan's installments"
```

---

### Task 2: `requestRefund`

**Files:**
- Modify: `app/business/payment/payment-refund.server.ts`
- Modify: `app/copy/payments.ts`
- Test: `app/business/payment/payment-refund-asaas.integration.test.ts`

- [ ] **Step 1: Write the failing test**

An integration suite in the shape of `payment-refund.integration.test.ts`,
with the Asaas client mocked. Cases:

- claims the request and asks Asaas for `asaas_net`, not for `amount`
- leaves the row `paid` — the webhook, not this call, moves the status
- asks for a smaller amount when one is given
- refunds a card plan installment by installment, never through
  `/installments/{id}/refund`
- asks Asaas once however many times it is clicked (two calls in parallel,
  exactly one wins)
- releases the claim when Asaas refuses the only call, and logs
- **keeps** the claim when Asaas refuses the second of three installments, and
  logs — the money that already moved must not move twice
- refuses an amount above `asaas_net`
- refuses a row that is not `paid`
- refuses a `kind='manual'` row — that one is marked by hand

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/business/payment/payment-refund-asaas.integration.test.ts`
Expected: FAIL — `requestRefund` is not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
export const requestRefundSchema = zod.object({
  paymentId: zod.string().uuid(),
  // Same empty-string dance as markManualRefunded: an empty field is the form
  // saying "everything Positiv received", and reaisToCents("") is NaN.
  amount: zod
    .union([zod.string(), zod.number()])
    .transform((value) =>
      typeof value === "string" && value.trim() === "" ? null : reaisToCents(value),
    )
    .nullish(),
  reason: zod.string().nullish(),
})
```

`requestRefund = applySchema(requestRefundSchema)(async (values) => { ... })`:

1. Load the row. Refuse unless `kind === 'asaas'`, `status === 'paid'`,
   `amount !== null`.
2. `refundable = payment.asaas_net ?? payment.amount` — both the default and
   the ceiling. Refuse `<= 0` and `> refundable`.
3. Claim: `UPDATE ... SET refund_requested_at = now() WHERE id = ? AND status =
   'paid' AND refund_requested_at IS NULL RETURNING id`. No row → already
   requested.
4. Call Asaas:
   - plan (`asaas_installment_id`): `listAsaasInstallmentPayments` →
     `splitRefund` → `refundAsaasPayment` **sequentially**, counting successes.
     Asaas queues these anyway and sequence is what makes the failure legible.
   - single charge (`asaas_payment_id`): one `refundAsaasPayment` for the
     amount.
5. On failure: release the claim **only when nothing moved**; `logger.error`
   either way; raise `refundTooLarge`-style copy for the total failure and
   `refundPartiallyApplied` for the half-done one.

Copy added to `app/copy/payments.ts`:

```ts
// errors
notAsaasRefundable:
  "Este pagamento não passou pelo Asaas. Use 'Marcar como reembolsado'.",
refundAlreadyRequested: "O reembolso já foi solicitado.",
refundPartiallyApplied:
  "Parte das parcelas foi reembolsada e uma falhou. Confira no painel do Asaas antes de tentar de novo.",
refundNothingToRefund:
  "O Asaas não encontrou parcelas reembolsáveis nesta cobrança.",
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

### Task 3: the modal offers it

**Files:**
- Modify: `app/components/organisms/payment/manage-payment-modal.tsx`
- Modify: `app/business/payment/payment-intents.server.ts`
- Modify: `app/copy/payments.ts`
- Test: `app/components/organisms/payment/manage-payment-modal.test.tsx`

The existing `RefundDialog` stays exactly as it is — it is the manual mark and
its wording is about not moving anything at Asaas. The Asaas refund is a second
dialog beside it, on `kind === 'asaas' && status === 'paid'` rows.

- [ ] **Step 1: Write the failing test**

- offers "Reembolsar" on a paid Asaas row, and posts `intent=payment-refund`
  with `paymentId`, `amount`, `reason`
- the amount field is pre-filled with `asaas_net`, not with `amount`
  (`23454` gross / `21900` net → the field reads `219,00`)
- says the fees stay with the participant
- says how long a card takes when the row is a card
- sends the typed amount when the admin changes it
- shows "aguardando o Asaas confirmar" and no button once
  `refund_requested_at` is set
- a manual row still offers only "Marcar como reembolsado"

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/components/organisms/payment`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

An `AsaasRefundDialog` component in the same file: amount input seeded from
`centsToReaisText(payment.asaas_net ?? payment.amount)`, an optional reason
input, the `feesStay` sentence, and the window warning picked by `payment.method`.
Confirming posts the intent. In `payment-intents.server.ts`:

```ts
if (intent === "payment-refund") {
  return toIntentResult(intent, await requestRefund(values))
}
```

Copy added under `refund`:

```ts
asaas: {
  title: "Reembolsar",
  confirm: "Reembolsar pelo Asaas?",
  description:
    "O Asaas devolve o dinheiro para a pessoa. A situação do pagamento muda quando o Asaas confirmar.",
  feesStay:
    "As taxas não voltam: a pessoa recebe o que a Positiv recebeu, sem as taxas que ela pagou.",
  amount: "Valor devolvido",
  amountHint: (net: string) => `A Positiv recebeu ${net}. Não é possível devolver mais que isso.`,
  reason: "Motivo (opcional)",
  windowPix: "Pix: o Asaas devolve na hora.",
  windowCard: "Cartão: aparece na fatura da pessoa em até 10 dias úteis.",
  submit: "Solicitar reembolso",
  inProgress: "Reembolso solicitado — aguardando o Asaas confirmar.",
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/components/organisms/payment app/copy`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/organisms/payment app/business/payment/payment-intents.server.ts app/copy/payments.ts
git commit -m "feat(payments): refund from the payment modal"
```

---

### Task 4: the refund email

**Files:**
- Create: `app/copy/emails/payment-refund.ts`
- Create: `app/business/email/templates/payment-refund-mail.template.ts`
- Create: `app/business/email/templates/payment-refund-mail.template.test.ts`
- Create: `app/business/email/format-payment-refund-mail.ts`
- Modify: `app/business/payment/payment-emails.server.ts`
- Modify: `app/business/payment/payment-webhook.server.ts`
- Modify: `app/business/payment/payment-refund.server.ts` (`markManualRefunded`)

- [ ] **Step 1: Write the failing test**

Template unit tests, in the shape of `payment-confirmed-mail.template.test.ts`:
states the amount returned and the method; says "parcial" when
`refundAmount < amount` and does not when it is the whole of it; escapes the
name.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/email/templates/payment-refund-mail.template.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Template and formatter copied in shape from the confirmation pair.
`sendPaymentRefundEmail({ paymentId })` in `payment-emails.server.ts` joins the
same four tables, reads `refund_amount`, `amount` and `method`, and sends;
failures are logged and swallowed, exactly like the confirmation.

Two callers:

- the webhook's refund branch returns `refundPaymentId` beside the existing
  `confirmPaymentId`, and `applyWebhookEvent` sends it outside the transaction
  in the same `try`/`logger.error` shape, replacing the "belongs to POS-531"
  comment.
- `markManualRefunded` sends it after its guarded update succeeds.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/email`, then
`pnpm test:integration -- app/business/payment`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/email app/copy/emails/payment-refund.ts app/business/payment
git commit -m "feat(payments): email the participant when money is returned"
```

---

### Task 5: Full verification

- [ ] `pnpm lint` — green for the whole project
- [ ] `pnpm test` — green for the whole project
- [ ] Check the database lock, then run E2E **once, as the last step**:
      `pnpm test:e2e`
- [ ] Delete this plan file
- [ ] Ask before opening the PR

## Definition of done

- PR title: `[POS-531] Refund a payment from the admin panel`
- `Fixes POS-531`; Implementation Notes explains why the status waits for the
  webhook, and why a card plan is refunded installment by installment
- This plan file deleted in the last commit before the PR
