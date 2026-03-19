# POS-471: Payment Edge Cases Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all payment edge cases before launch — orphaned Asaas payments, missing cancellation flow, atomic refunds, single payment_request enforcement, and refund notification email.

**Architecture:** Each fix is self-contained. We start with the Asaas cancel API (foundation), then enforce single active request (fixes orphan problem), add cancellation UI, make refunds atomic, and finally add refund notification email. All changes follow TDD with composable-functions error handling.

**Tech Stack:** TypeScript, Vitest, Kysely, React Router 7, composable-functions, Nodemailer (AWS SES)

---

## Edge Cases Being Fixed

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | Resend orphans old Asaas payment | No cancel before creating new payment | Cancel old Asaas payment when creating new request |
| 2 | No cancellation flow | `cancelled` status exists but nothing sets it | Add cancel button + action handler + Asaas cancel |
| 3 | Refund is fire-and-forget | Asaas refund + DB update not atomic | Try DB first (optimistic), rollback if Asaas fails |
| 4 | Multiple active payment_requests | No enforcement at creation time | Cancel previous active before creating new |
| 5 | No refund notification | Missing email template + sender | Add refund email template, formatter, sender |

---

## Task 1: Add `cancelAsaasPayment` to Asaas client (TDD)

**Files:**
- Modify: `app/business/payment/asaas-client.server.ts`
- Modify: `app/business/payment/asaas-client.server.test.ts`

Asaas cancel API: `DELETE /payments/{id}` → returns `{ deleted: true, id: "pay_xxx" }`.
This is the foundation for tasks 2 and 4.

**Step 1: Write the failing test**

In `asaas-client.server.test.ts`, add a new describe block after the `refundAsaasPayment` block:

```typescript
describe("cancelAsaasPayment", () => {
  it("calls DELETE /payments/{id}", async () => {
    mockFetchResponse({ deleted: true, id: "pay_123" })

    await cancelAsaasPayment("pay_123")

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://sandbox.asaas.com/api/v3/payments/pay_123",
      expect.objectContaining({ method: "DELETE" }),
    )
  })

  it("throws on HTTP error", async () => {
    mockFetchError("Not Found", 404)

    await expect(cancelAsaasPayment("pay_123")).rejects.toThrow(
      "Asaas API error (404): Not Found",
    )
  })
})
```

Import `cancelAsaasPayment` in the import block at the top.

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/asaas-client.server.test.ts`
Expected: FAIL — `cancelAsaasPayment` is not exported

**Step 3: Write minimal implementation**

In `asaas-client.server.ts`, add after `refundAsaasPayment`:

```typescript
export async function cancelAsaasPayment(paymentId: string): Promise<void> {
  await asaasFetch(
    `/payments/${paymentId}`,
    {},
    z.object({ deleted: z.boolean(), id: z.string() }),
    "DELETE",
  )
}
```

Also update `asaasFetch` signature to support `DELETE`:

```typescript
async function asaasFetch<T>(
  path: string,
  body: Record<string, unknown>,
  schema: z.ZodType<T>,
  method: "POST" | "GET" | "DELETE" = "POST",
): Promise<T> {
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/asaas-client.server.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/business/payment/asaas-client.server.ts app/business/payment/asaas-client.server.test.ts
git commit -m "feat(payment): add cancelAsaasPayment to Asaas client"
```

---

## Task 2: Enforce single active payment_request + cancel old Asaas payment (TDD)

**Files:**
- Modify: `app/business/payment/trigger-payment-request.server.ts`
- Modify: `app/business/payment/trigger-payment-request.server.test.ts`
- Modify: `app/business/payment/payment-request.server.ts`
- Modify: `app/business/payment/payment-request.server.test.ts`

**Context:** Currently `resolvePaymentRequest` reuses an existing active request if one exists. Instead, when creating a NEW payment request (or resending), we should:
1. Find any active payment request for the participant
2. If it has an `asaas_payment_id`, cancel it on Asaas
3. Mark it as `cancelled` in our DB
4. Create the new payment request

This fixes BOTH issue 1 (orphaned Asaas payments) AND issue 4 (multiple active requests).

### Step 2a: Add `cancelActivePaymentRequest` function

**Step 2a.1: Write the failing test**

In `payment-request.server.test.ts`, add:

```typescript
describe("cancelActivePaymentRequest", () => {
  it("cancels active request and calls Asaas cancel when asaas_payment_id exists", async () => {
    const activeRequest = {
      id: "pr-active",
      event_participant_id: "ep-1",
      asaas_payment_id: "pay_old",
      status: "awaiting_payment",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }

    mockKyselyDb._setResults([activeRequest])

    await cancelActivePaymentRequest("ep-1")

    expect(cancelAsaasPayment).toHaveBeenCalledWith("pay_old")
  })

  it("cancels active request without Asaas call when no asaas_payment_id", async () => {
    const activeRequest = {
      id: "pr-active",
      event_participant_id: "ep-1",
      asaas_payment_id: null,
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }

    mockKyselyDb._setResults([activeRequest])

    await cancelActivePaymentRequest("ep-1")

    expect(cancelAsaasPayment).not.toHaveBeenCalled()
  })

  it("does nothing when no active request exists", async () => {
    mockKyselyDb._setResults([undefined])

    await cancelActivePaymentRequest("ep-1")

    expect(cancelAsaasPayment).not.toHaveBeenCalled()
  })
})
```

Mock `cancelAsaasPayment` at the top of the test file:

```typescript
vi.mock("./asaas-client.server", () => ({
  createAsaasCustomer: vi.fn(),
  createAsaasPayment: vi.fn(),
  cancelAsaasPayment: vi.fn().mockResolvedValue(undefined),
}))
```

Import `cancelActivePaymentRequest` and `cancelAsaasPayment`.

**Step 2a.2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/payment-request.server.test.ts`
Expected: FAIL — `cancelActivePaymentRequest` not exported

**Step 2a.3: Write minimal implementation**

In `payment-request.server.ts`, add:

```typescript
import { cancelAsaasPayment } from "./asaas-client.server"
import { logger } from "~/lib/logger/logger.server"

export async function cancelActivePaymentRequest(eventParticipantId: string) {
  const active = await getActivePaymentRequest(eventParticipantId)
  if (!active) return

  if (active.asaas_payment_id) {
    await cancelAsaasPayment(active.asaas_payment_id)
    logger.info("Cancelled Asaas payment before creating new request", {
      paymentRequestId: active.id,
      asaasPaymentId: active.asaas_payment_id,
    })
  }

  await kyselyDb
    .updateTable("payment_requests")
    .set({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", active.id)
    .execute()
}
```

**Step 2a.4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/payment-request.server.test.ts`
Expected: PASS

### Step 2b: Update `resolvePaymentRequest` to cancel before creating

**Step 2b.1: Update the existing test**

In `trigger-payment-request.server.test.ts`, update the test "reuses active payment request if one exists" to instead test cancellation:

```typescript
it("cancels active payment request before creating new one", async () => {
  const existingRequest = {
    id: "pr-existing",
    event_participant_id: "ep-1",
    asaas_payment_id: "pay_old",
    amount: 220,
    status: "awaiting_payment",
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  }

  mockKyselyDb._setResults([
    { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
    existingRequest, // getActivePaymentRequest finds this
    // cancelActivePaymentRequest DB operations...
    undefined, // getActivePaymentRequest returns null after cancel
    newPaymentRequest, // createPaymentRequest creates new
    { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: "12345678900" },
  ])

  const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1")

  expect(result.success).toBe(true)
  expect(cancelAsaasPayment).toHaveBeenCalledWith("pay_old")
})
```

Add the mock for `cancelAsaasPayment`:

```typescript
vi.mock("./asaas-client.server", () => ({
  refundAsaasPayment: vi.fn(),
  cancelAsaasPayment: vi.fn().mockResolvedValue(undefined),
}))
```

**Step 2b.2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/trigger-payment-request.server.test.ts`
Expected: FAIL — resolvePaymentRequest still reuses instead of cancelling

**Step 2b.3: Update `resolvePaymentRequest`**

In `trigger-payment-request.server.ts`, replace the active request reuse logic (lines 73-90) with:

```typescript
// Cancel any existing active request (and its Asaas payment) before creating a new one.
// This prevents orphaned Asaas payments and ensures single active request per participant.
await cancelActivePaymentRequest(eventParticipantId)

const paymentRequest = await createPaymentRequest({
  eventParticipantId,
  ticketPrice: amount,
  paymentMode: isPaymentSystemOnline ? "automatic" : "manual",
})
```

Import `cancelActivePaymentRequest` from `./payment-request.server`.
Remove the `getActivePaymentRequest` import from this file since it's now used internally by `cancelActivePaymentRequest`.

**Step 2b.4: Run all payment tests**

Run: `pnpm test:unit -- app/business/payment/`
Expected: PASS (may need to adjust mock result sequences in some tests)

**Step 2b.5: Commit**

```bash
git add app/business/payment/payment-request.server.ts app/business/payment/payment-request.server.test.ts app/business/payment/trigger-payment-request.server.ts app/business/payment/trigger-payment-request.server.test.ts
git commit -m "feat(payment): enforce single active request and cancel old Asaas payment"
```

---

## Task 3: Add cancellation flow — admin cancel button + action handler (TDD)

**Files:**
- Modify: `app/pages/admin/events/view-event-participant/view-event-participant.tsx`
- Modify: `app/components/pages/admin/participants/participant-vs-event-data.tsx`

**Context:** Admin should be able to cancel an automatic payment that's in `pending` or `awaiting_payment` status. This sets payment_request.status = cancelled and cancels the Asaas payment if it exists.

### Step 3a: Add action handler in route

In `view-event-participant.tsx`, add a new intent handler after `mark-manual-payment-refunded`:

```typescript
if (intent === "cancel-payment") {
  const entries = Object.fromEntries(formData)
  const result = await cancelActivePaymentRequest(entries.id as string)
  return { success: true }
}
```

Import `cancelActivePaymentRequest` from `~/business/payment/payment-request.server`.

Note: `cancelActivePaymentRequest` takes `eventParticipantId` (which is `entries.id` — the event_participant ID).

### Step 3b: Add cancel button in admin UI

In `participant-vs-event-data.tsx`:

1. Add a `cancelFetcher`:
```typescript
const cancelFetcher = useFetcher<ComposableFetcherData>()
const isCancelling = cancelFetcher.state !== "idle"
```

2. Add cancel handler:
```typescript
const handleCancelPayment = () => {
  const formData = new FormData()
  formData.set("intent", "cancel-payment")
  formData.set("id", id)
  cancelFetcher.submit(formData, { method: "POST" })
}
```

3. Add useEffect for toast:
```typescript
useEffect(() => {
  if (cancelFetcher.data?.success === true) {
    toast.success("Pagamento cancelado com sucesso")
  }
  if (cancelFetcher.data?.success === false) {
    toast.error("Erro ao cancelar pagamento. Tente novamente.", { duration: Infinity, closeButton: true })
  }
}, [cancelFetcher.data])
```

4. Add cancel button below the "Reenviar link" button, visible when `isAutomatic && isPendingPayment`:
```tsx
{isAutomatic && isPendingPayment && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        variant="destructive"
        size="sm"
        disabled={isCancelling}
      >
        {isCancelling ? "Cancelando..." : "Cancelar pagamento"}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Cancelar pagamento</AlertDialogTitle>
        <AlertDialogDescription>
          Tem certeza que deseja cancelar este pagamento? O link de pagamento será invalidado.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Voltar</AlertDialogCancel>
        <AlertDialogAction onClick={handleCancelPayment}>
          Confirmar cancelamento
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

### Step 3c: Run lint and tests

Run: `pnpm lint && pnpm test:unit`
Expected: PASS

### Step 3d: Commit

```bash
git add app/pages/admin/events/view-event-participant/view-event-participant.tsx app/components/pages/admin/participants/participant-vs-event-data.tsx
git commit -m "feat(payment): add admin cancel payment button and action handler"
```

---

## Task 4: Make refund atomic — DB first, rollback if Asaas fails (TDD)

**Files:**
- Modify: `app/business/payment/trigger-payment-request.server.ts`
- Modify: `app/business/payment/trigger-payment-request.server.test.ts`

**Context:** Currently `processRefund` does: Asaas refund → DB update. If Asaas succeeds but DB fails, the money is refunded but the DB still shows "paid". Fix: DB first (optimistic status to "refunded"), then Asaas. If Asaas fails, rollback DB to "paid".

### Step 4a: Write the failing tests

In `trigger-payment-request.server.test.ts`, add tests in the `processRefund` describe (or create one):

```typescript
describe("processRefund", () => {
  it("marks as refunded in DB then calls Asaas refund", async () => {
    const paidRequest = {
      id: "pr-paid",
      event_participant_id: "ep-1",
      asaas_payment_id: "pay_123",
      amount: 220,
      status: "paid",
    }

    mockKyselyDb._setResults([paidRequest])
    vi.mocked(refundAsaasPayment).mockResolvedValueOnce(undefined)

    const result = await processRefund("ep-1")

    expect(result.success).toBe(true)
    expect(refundAsaasPayment).toHaveBeenCalledWith("pay_123")
  })

  it("rolls back DB to paid if Asaas refund fails", async () => {
    const paidRequest = {
      id: "pr-paid",
      event_participant_id: "ep-1",
      asaas_payment_id: "pay_123",
      amount: 220,
      status: "paid",
    }

    mockKyselyDb._setResults([paidRequest])
    vi.mocked(refundAsaasPayment).mockRejectedValueOnce(
      new Error("Asaas API error (500): Internal Server Error"),
    )

    const result = await processRefund("ep-1")

    expect(result.success).toBe(false)
  })

  it("fails when no paid payment request found", async () => {
    mockKyselyDb._setResults([undefined])

    const result = await processRefund("ep-1")

    expect(result.success).toBe(false)
  })
})
```

Import `refundAsaasPayment` from the mock.

### Step 4b: Run test to verify current behavior

Run: `pnpm test:unit -- app/business/payment/trigger-payment-request.server.test.ts`
Expected: The rollback test should FAIL since current code doesn't rollback

### Step 4c: Rewrite `processRefund`

In `trigger-payment-request.server.ts`, replace `processRefund`:

```typescript
export const processRefund = composable(
  async (eventParticipantId: string) => {
    const paymentRequest = await kyselyDb
      .selectFrom("payment_requests")
      .selectAll()
      .where("event_participant_id", "=", eventParticipantId)
      .where("status", "=", "paid")
      .executeTakeFirst()

    if (!paymentRequest) {
      throw new Error("No paid payment request found for this participant")
    }

    if (!paymentRequest.asaas_payment_id) {
      throw new Error("Payment request has no Asaas payment ID — cannot refund")
    }

    const now = new Date().toISOString()

    // Optimistic: mark as refunded in DB first
    await kyselyDb
      .updateTable("payment_requests")
      .set({
        status: "refunded",
        refund_amount: paymentRequest.amount,
        refunded_at: now,
        updated_at: now,
      })
      .where("id", "=", paymentRequest.id)
      .execute()

    try {
      await refundAsaasPayment(paymentRequest.asaas_payment_id)
    } catch (error) {
      // Rollback DB to paid if Asaas fails
      await kyselyDb
        .updateTable("payment_requests")
        .set({
          status: "paid",
          refund_amount: 0,
          refunded_at: null,
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", paymentRequest.id)
        .execute()

      logger.error("Asaas refund failed, rolled back DB status to paid", {
        paymentRequestId: paymentRequest.id,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }

    logger.info("Payment refunded", {
      paymentRequestId: paymentRequest.id,
      eventParticipantId,
      amount: paymentRequest.amount,
    })
  },
)
```

### Step 4d: Run tests

Run: `pnpm test:unit -- app/business/payment/trigger-payment-request.server.test.ts`
Expected: PASS

### Step 4e: Commit

```bash
git add app/business/payment/trigger-payment-request.server.ts app/business/payment/trigger-payment-request.server.test.ts
git commit -m "fix(payment): make refund atomic — rollback DB if Asaas refund fails"
```

---

## Task 5: Refund notification email (TDD)

**Files:**
- Create: `app/business/email/templates/payment-refund-mail.template.ts`
- Create: `app/business/email/templates/payment-refund-mail.template.test.ts`
- Create: `app/business/email/format-payment-refund-mail.ts`
- Create: `app/business/email/format-payment-refund-mail.test.ts`
- Create: `app/business/payment/send-payment-refund-email.server.ts`
- Create: `app/business/payment/send-payment-refund-email.server.test.ts`
- Modify: `app/business/payment/trigger-payment-request.server.ts`
- Modify: `app/business/payment/trigger-payment-request.server.test.ts`

**Pattern:** Follow the exact same pattern as payment-link-mail: template → formatter → sender → caller.

### Step 5a: Email template (TDD)

**Step 5a.1: Write the failing test**

Create `app/business/email/templates/payment-refund-mail.template.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { paymentRefundMailTemplate } from "./payment-refund-mail.template"

const baseParams = {
  participantName: "João",
  eventName: "Positiv Regular",
  refundAmount: 220,
}

describe("paymentRefundMailTemplate", () => {
  it("includes participant name", () => {
    const html = paymentRefundMailTemplate(baseParams)
    expect(html).toContain("João")
  })

  it("includes event name", () => {
    const html = paymentRefundMailTemplate(baseParams)
    expect(html).toContain("Positiv Regular")
  })

  it("includes formatted refund amount", () => {
    const html = paymentRefundMailTemplate(baseParams)
    expect(html).toContain("R$")
    expect(html).toContain("220")
  })

  it("sanitizes participant name against XSS", () => {
    const html = paymentRefundMailTemplate({
      ...baseParams,
      participantName: "<script>alert('xss')</script>",
    })
    expect(html).not.toContain("<script>")
  })

  it("sanitizes event name against XSS", () => {
    const html = paymentRefundMailTemplate({
      ...baseParams,
      eventName: '<img onerror="alert(1)">',
    })
    expect(html).not.toContain("onerror")
  })
})
```

**Step 5a.2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/email/templates/payment-refund-mail.template.test.ts`
Expected: FAIL — module not found

**Step 5a.3: Implement template**

Create `app/business/email/templates/payment-refund-mail.template.ts`:

```typescript
import { POSITIV_URL } from "~/lib/constants/constants"
import { sanitizeHtml } from "~/lib/email/sanitize-html"

type PaymentRefundMailParams = {
  participantName: string
  eventName: string
  refundAmount: number
}

function formatCurrency(reais: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(reais)
}

export function paymentRefundMailTemplate({
  participantName,
  eventName,
  refundAmount,
}: PaymentRefundMailParams): string {
  const safeName = sanitizeHtml(participantName)
  const safeEventName = sanitizeHtml(eventName)
  const formattedAmount = formatCurrency(refundAmount)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reembolso Processado - Positiv</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Nunito', 'Helvetica Neue', Arial, sans-serif;">

  <div style="background: linear-gradient(135deg, #4a75d2 0%, #bf03c3 100%); padding: 40px 20px; min-height: 100vh;">

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 0 auto;">
      <tr>
        <td>
          <div style="background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">

            <div style="text-align: center; padding: 30px 24px 20px 24px; background: #ffffff;">
              <img src="${POSITIV_URL}positiv-logo-colors.png" alt="Positiv" width="250" style="max-width: 250px; height: auto; margin: 0 auto; display: block;">
            </div>

            <div style="padding: 0 24px 30px 24px; color: #333333;">

              <h1 style="font-family: 'DM Sans', Arial, sans-serif; font-size: 28px; font-weight: 800; color: #bf03c3; margin: 0 0 16px 0; line-height: 1.2; text-align: center;">
                Reembolso Processado
              </h1>

              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #333;">
                Olá, <strong>${safeName}</strong>! O reembolso do seu pagamento para o evento <strong>${safeEventName}</strong> foi processado.
              </p>

              <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 0 0 20px 0; text-align: center;">
                <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666; margin: 0 0 4px 0;">
                  Valor reembolsado
                </p>
                <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 24px; font-weight: 800; color: #4a75d2; margin: 0;">
                  ${formattedAmount}
                </p>
              </div>

              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; color: #666;">
                O prazo para o valor aparecer na sua conta depende do método de pagamento utilizado. Em caso de dúvidas, entre em contato conosco.
              </p>

            </div>

            <div style="background: #f9f9f9; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="font-family: 'Nunito', Arial, sans-serif; font-size: 14px; color: #666666; margin: 0 0 8px 0;">
                E-mail enviado pela
                <a href="${POSITIV_URL}" style="color: #bf03c3; text-decoration: none; font-weight: 700;">Positiv</a>
              </p>
            </div>

          </div>
        </td>
      </tr>
    </table>

  </div>

</body>
</html>`
}
```

**Step 5a.4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/email/templates/payment-refund-mail.template.test.ts`
Expected: PASS

**Step 5a.5: Commit**

```bash
git add app/business/email/templates/payment-refund-mail.template.ts app/business/email/templates/payment-refund-mail.template.test.ts
git commit -m "feat(payment): add refund notification email template"
```

### Step 5b: Email formatter (TDD)

**Step 5b.1: Write the failing test**

Create `app/business/email/format-payment-refund-mail.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { formatPaymentRefundMail } from "./format-payment-refund-mail"

describe("formatPaymentRefundMail", () => {
  it("returns html and text versions", () => {
    const result = formatPaymentRefundMail({
      participantName: "João",
      eventName: "Positiv Regular",
      refundAmount: 220,
    })

    expect(result.html).toContain("João")
    expect(result.text).toContain("João")
  })
})
```

**Step 5b.2: Run test — expected FAIL**

**Step 5b.3: Implement formatter**

Create `app/business/email/format-payment-refund-mail.ts`:

```typescript
import { htmlToText } from "html-to-text"
import { paymentRefundMailTemplate } from "./templates/payment-refund-mail.template"

type FormatPaymentRefundMailParams = {
  participantName: string
  eventName: string
  refundAmount: number
}

export function formatPaymentRefundMail(params: FormatPaymentRefundMailParams) {
  const html = paymentRefundMailTemplate(params)
  const text = htmlToText(html)
  return { html, text }
}
```

**Step 5b.4: Run test — expected PASS**

**Step 5b.5: Commit**

```bash
git add app/business/email/format-payment-refund-mail.ts app/business/email/format-payment-refund-mail.test.ts
git commit -m "feat(payment): add refund notification email formatter"
```

### Step 5c: Email sender (TDD)

**Step 5c.1: Write the failing test**

Create `app/business/payment/send-payment-refund-email.server.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("~/business/email/format-payment-refund-mail", () => ({
  formatPaymentRefundMail: vi.fn().mockReturnValue({
    html: "<html>refund</html>",
    text: "refund",
  }),
}))

vi.mock("~/business/email/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

import { sendPaymentRefundEmail } from "./send-payment-refund-email.server"
import { sendEmail } from "~/business/email/send-email"

describe("sendPaymentRefundEmail", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sends email with correct subject and returns emailSent: true", async () => {
    const result = await sendPaymentRefundEmail({
      participantEmail: "joao@test.com",
      participantName: "João",
      eventName: "Positiv Regular",
      refundAmount: 220,
    })

    expect(result.emailSent).toBe(true)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "joao@test.com",
        subject: expect.stringContaining("Reembolso"),
      }),
    )
  })

  it("returns emailSent: false when sendEmail fails", async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce({ success: false, errors: [{ message: "fail" }] })

    const result = await sendPaymentRefundEmail({
      participantEmail: "joao@test.com",
      participantName: "João",
      eventName: "Positiv Regular",
      refundAmount: 220,
    })

    expect(result.emailSent).toBe(false)
  })
})
```

**Step 5c.2: Run test — expected FAIL**

**Step 5c.3: Implement sender**

Create `app/business/payment/send-payment-refund-email.server.ts`:

```typescript
import { formatPaymentRefundMail } from "~/business/email/format-payment-refund-mail"
import { type MailOptions, sendEmail } from "~/business/email/send-email"
import { logger } from "~/lib/logger/logger.server"

type SendPaymentRefundEmailParams = {
  participantEmail: string
  participantName: string
  eventName: string
  refundAmount: number
}

export async function sendPaymentRefundEmail({
  participantEmail,
  participantName,
  eventName,
  refundAmount,
}: SendPaymentRefundEmailParams): Promise<{ emailSent: boolean }> {
  const { html, text } = formatPaymentRefundMail({
    participantName,
    eventName,
    refundAmount,
  })

  const options: MailOptions = {
    to: participantEmail,
    subject: `Reembolso processado — ${eventName}`,
    html,
    text,
  }

  const result = await sendEmail(options)

  if (!result.success) {
    logger.error("Refund notification email failed", {
      participantEmail,
      errors: result.errors,
    })
    return { emailSent: false }
  }

  return { emailSent: true }
}
```

**Step 5c.4: Run test — expected PASS**

**Step 5c.5: Commit**

```bash
git add app/business/payment/send-payment-refund-email.server.ts app/business/payment/send-payment-refund-email.server.test.ts
git commit -m "feat(payment): add refund notification email sender"
```

### Step 5d: Integrate refund email into `processRefund`

**Step 5d.1: Update test**

In `trigger-payment-request.server.test.ts`, update the successful refund test to verify email is sent:

```typescript
it("sends refund notification email after successful refund", async () => {
  const paidRequest = {
    id: "pr-paid",
    event_participant_id: "ep-1",
    asaas_payment_id: "pay_123",
    amount: 220,
    status: "paid",
  }

  mockKyselyDb._setResults([
    paidRequest,
    // DB update for refund
    // Profile lookup for email
    { email: "joao@test.com", full_name: "João" },
    // Event lookup for name
    { title: "Positiv Regular" },
  ])
  vi.mocked(refundAsaasPayment).mockResolvedValueOnce(undefined)

  const result = await processRefund("ep-1")

  expect(result.success).toBe(true)
  expect(sendPaymentRefundEmail).toHaveBeenCalledWith(
    expect.objectContaining({
      participantEmail: "joao@test.com",
      participantName: "João",
      eventName: "Positiv Regular",
      refundAmount: 220,
    }),
  )
})
```

Add mock for `sendPaymentRefundEmail`:

```typescript
vi.mock("./send-payment-refund-email.server", () => ({
  sendPaymentRefundEmail: vi.fn().mockResolvedValue({ emailSent: true }),
}))
```

**Step 5d.2: Run test — expected FAIL**

**Step 5d.3: Update `processRefund` to send email**

After the successful Asaas refund call in `processRefund`, add:

```typescript
// Look up participant info for refund email
const participantInfo = await kyselyDb
  .selectFrom("event_participants")
  .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
  .innerJoin("events", "events.id", "event_participants.event_id")
  .select(["profiles.email", "profiles.full_name", "events.title"])
  .where("event_participants.id", "=", eventParticipantId)
  .executeTakeFirst()

if (participantInfo?.email) {
  await sendPaymentRefundEmail({
    participantEmail: participantInfo.email,
    participantName: participantInfo.full_name ?? "Participante",
    eventName: participantInfo.title ?? "Evento Positiv",
    refundAmount: Number(paymentRequest.amount),
  })
}
```

Import `sendPaymentRefundEmail`.

Note: If the email fails, we still log but don't fail the refund — the money has already been returned, the email is best-effort.

**Step 5d.4: Run all payment tests**

Run: `pnpm test:unit -- app/business/payment/`
Expected: PASS

**Step 5d.5: Commit**

```bash
git add app/business/payment/trigger-payment-request.server.ts app/business/payment/trigger-payment-request.server.test.ts
git commit -m "feat(payment): send refund notification email after successful refund"
```

---

## Task 6: Update DIAGRAM.md — remove fixed issues

**Files:**
- Modify: `DIAGRAM.md`

Remove the 5 fixed issues from the "Known Issues / Edge Cases" section. Keep issue 6 (custom amount only from detail page) as a known limitation since it's intentional.

**Commit:**

```bash
git add DIAGRAM.md
git commit -m "docs: update DIAGRAM.md — remove fixed edge cases"
```

---

## Final Verification

Run: `pnpm lint && pnpm test:unit && pnpm test:integration`
Expected: All green

---

## Files Summary

### New
| File | Purpose |
|------|---------|
| `app/business/email/templates/payment-refund-mail.template.ts` | Refund notification HTML template |
| `app/business/email/templates/payment-refund-mail.template.test.ts` | Template tests |
| `app/business/email/format-payment-refund-mail.ts` | HTML → text formatter |
| `app/business/email/format-payment-refund-mail.test.ts` | Formatter tests |
| `app/business/payment/send-payment-refund-email.server.ts` | Email sender |
| `app/business/payment/send-payment-refund-email.server.test.ts` | Sender tests |

### Modified
| File | Change |
|------|--------|
| `app/business/payment/asaas-client.server.ts` | Add `cancelAsaasPayment`, support DELETE in `asaasFetch` |
| `app/business/payment/asaas-client.server.test.ts` | Tests for cancel |
| `app/business/payment/payment-request.server.ts` | Add `cancelActivePaymentRequest` |
| `app/business/payment/payment-request.server.test.ts` | Tests for cancel |
| `app/business/payment/trigger-payment-request.server.ts` | Cancel before create, atomic refund, refund email |
| `app/business/payment/trigger-payment-request.server.test.ts` | Updated tests |
| `app/pages/admin/events/view-event-participant/view-event-participant.tsx` | Cancel intent handler |
| `app/components/pages/admin/participants/participant-vs-event-data.tsx` | Cancel button UI |
| `DIAGRAM.md` | Remove fixed issues |

### Commit Plan
1. `feat(payment): add cancelAsaasPayment to Asaas client`
2. `feat(payment): enforce single active request and cancel old Asaas payment`
3. `feat(payment): add admin cancel payment button and action handler`
4. `fix(payment): make refund atomic — rollback DB if Asaas refund fails`
5. `feat(payment): add refund notification email template`
6. `feat(payment): add refund notification email formatter`
7. `feat(payment): add refund notification email sender`
8. `feat(payment): send refund notification email after successful refund`
9. `docs: update DIAGRAM.md — remove fixed edge cases`
