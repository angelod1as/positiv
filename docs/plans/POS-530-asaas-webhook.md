# POS-530 — The Asaas webhook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Asaas tells us the money moved, and the ledger follows — exactly once, in the right direction, no matter how many times or in what order the events arrive.

**Architecture:** Every delivery is written to `payment_webhook_events` first; the unique index on `asaas_event_id` is what makes a redelivery a no-op. Then the payment is located (by charge id, by installment plan, or by the `externalReference` we set) and one guarded `UPDATE` applies the transition. Side effects — the confirmation email, the Telegram alert — run only when that `UPDATE` returned a row, so a redelivery can never send a second email. An unexpected failure returns 500 so Asaas retries; an event about a charge we do not know returns 200, because retrying will not make it ours.

**Tech Stack:** React Router resource route, Kysely transactions, zod v4 (permissive), `crypto.timingSafeEqual`, Vitest.

**Spec:** `docs/plans/payments-v3-design.md` §4 and §5.3 (the event table).

**Branch:** `pos-530-asaas-webhook` from `main`, worktree `wt/pos-530-asaas-webhook`.

**Depends on:** POS-529.

---

### Task 1: Authentication and the inbox

**Files:**
- Create: `app/routes/api.asaas-webhook.ts`
- Modify: `app/routes.ts`
- Test: `app/routes/api.asaas-webhook.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const env = {
  PAYMENTS_ENABLED: true,
  ASAAS_WEBHOOK_TOKEN: "whsec_a_token_long_enough_to_be_real_0000",
  APP_ENV: "test",
}
vi.mock("varlock/env", () => ({ ENV: env }))

const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

const recordWebhookEvent = vi.fn().mockResolvedValue({ isNew: true, id: "row-1" })
const applyWebhookEvent = vi.fn().mockResolvedValue({ applied: true })
vi.mock("~/business/payment/payment-webhook.server", () => ({
  recordWebhookEvent: (...a: unknown[]) => recordWebhookEvent(...a),
  applyWebhookEvent: (...a: unknown[]) => applyWebhookEvent(...a),
}))

import { action } from "./api.asaas-webhook"

function post(body: unknown, token?: string) {
  return action({
    request: new Request("http://localhost/api/asaas/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "asaas-access-token": token } : {}),
      },
      body: JSON.stringify(body),
    }),
    params: {},
    context: {} as never,
  })
}

const validEvent = {
  id: "evt_1",
  event: "PAYMENT_RECEIVED",
  dateCreated: "2026-08-24 12:00:00",
  payment: { id: "pay_1", status: "RECEIVED", value: 221.99, netValue: 220.0 },
}

beforeEach(() => {
  env.PAYMENTS_ENABLED = true
  env.ASAAS_WEBHOOK_TOKEN = "whsec_a_token_long_enough_to_be_real_0000"
  recordWebhookEvent.mockClear().mockResolvedValue({ isNew: true, id: "row-1" })
  applyWebhookEvent.mockClear().mockResolvedValue({ applied: true })
  logger.error.mockClear()
})

describe("POST /api/asaas/webhook", () => {
  it("answers 404 when payments are switched off", async () => {
    env.PAYMENTS_ENABLED = false
    const response = await post(validEvent, env.ASAAS_WEBHOOK_TOKEN)
    expect(response.status).toBe(404)
  })

  it("answers 503 and shouts when the token is not configured", async () => {
    env.ASAAS_WEBHOOK_TOKEN = ""
    const response = await post(validEvent, "anything")
    expect(response.status).toBe(503)
    expect(logger.error).toHaveBeenCalled()
  })

  it("answers 401 without a token", async () => {
    const response = await post(validEvent)
    expect(response.status).toBe(401)
  })

  it("answers 401 with the wrong token", async () => {
    const response = await post(validEvent, "whsec_wrong_but_the_same_length_00000")
    expect(response.status).toBe(401)
  })

  it("answers 401 with a token of a different length, without throwing", async () => {
    const response = await post(validEvent, "short")
    expect(response.status).toBe(401)
  })

  it("accepts a valid delivery and applies it", async () => {
    const response = await post(validEvent, env.ASAAS_WEBHOOK_TOKEN)
    expect(response.status).toBe(200)
    expect(applyWebhookEvent).toHaveBeenCalled()
  })

  it("does not apply a redelivery twice", async () => {
    recordWebhookEvent.mockResolvedValueOnce({ isNew: false, id: "row-1" })

    const response = await post(validEvent, env.ASAAS_WEBHOOK_TOKEN)

    expect(response.status).toBe(200)
    expect(applyWebhookEvent).not.toHaveBeenCalled()
  })

  it("accepts a body with fields it does not know", async () => {
    const response = await post(
      { ...validEvent, somethingNew: { nested: true }, payment: { ...validEvent.payment, extra: 1 } },
      env.ASAAS_WEBHOOK_TOKEN,
    )
    expect(response.status).toBe(200)
  })

  it("answers 400 for a body that is not an Asaas event", async () => {
    const response = await post({ hello: "world" }, env.ASAAS_WEBHOOK_TOKEN)
    expect(response.status).toBe(400)
  })

  it("answers 500 so Asaas retries when applying blows up", async () => {
    applyWebhookEvent.mockRejectedValueOnce(new Error("database is down"))

    const response = await post(validEvent, env.ASAAS_WEBHOOK_TOKEN)

    expect(response.status).toBe(500)
    expect(logger.error).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/routes/api.asaas-webhook.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/routes/api.asaas-webhook.ts
import { timingSafeEqual } from "node:crypto"
import type { ActionFunctionArgs } from "react-router"
import { ENV } from "varlock/env"
import {
  applyWebhookEvent,
  recordWebhookEvent,
  webhookEventSchema,
} from "~/business/payment/payment-webhook.server"
import { logger } from "~/lib/logger/logger.server"

function tokensMatch(sent: string | null, expected: string): boolean {
  // A length mismatch would make timingSafeEqual throw, and returning early on
  // it leaks the length — so compare against a buffer of the right size either
  // way and let the result be false.
  const sentBuffer = Buffer.from(sent ?? "")
  const expectedBuffer = Buffer.from(expected)
  if (sentBuffer.length !== expectedBuffer.length) {
    timingSafeEqual(expectedBuffer, expectedBuffer)
    return false
  }
  return timingSafeEqual(sentBuffer, expectedBuffer)
}

export async function action({ request }: ActionFunctionArgs) {
  if (!ENV.PAYMENTS_ENABLED) {
    return new Response(null, { status: 404 })
  }

  const expected = ENV.ASAAS_WEBHOOK_TOKEN
  if (!expected) {
    // Never accept an unauthenticated webhook. A deploy without the token is a
    // misconfiguration to fix, not a door to leave open.
    logger.error("ASAAS_WEBHOOK_TOKEN is not configured; refusing every webhook")
    return Response.json({ error: "not_configured" }, { status: 503 })
  }

  if (!tokensMatch(request.headers.get("asaas-access-token"), expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }

  const parsed = webhookEventSchema.safeParse(body)
  if (!parsed.success) {
    logger.warn("Asaas webhook body did not parse", { issues: parsed.error.issues })
    return Response.json({ error: "invalid_body" }, { status: 400 })
  }

  const event = parsed.data

  try {
    const recorded = await recordWebhookEvent(event)
    if (!recorded.isNew) {
      return Response.json({ ok: true, deduped: true })
    }

    const result = await applyWebhookEvent(recorded.id, event)
    return Response.json({ ok: true, ...result })
  } catch (error) {
    logger.error("Asaas webhook could not be processed", {
      asaasEventId: event.id,
      event: event.event,
      asaasPaymentId: event.payment?.id,
      error: error instanceof Error ? error.message : String(error),
    })
    // 500 so Asaas retries. Its queue is sequential, so a failure here holds
    // the rest back — which is what we want: the next event about this payment
    // must not overtake the one that failed.
    return Response.json({ error: "processing_failed" }, { status: 500 })
  }
}
```

Register in `app/routes.ts`, with the other API routes:

```ts
  route("/api/asaas/webhook", "routes/api.asaas-webhook.ts"),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/routes/api.asaas-webhook.test.ts`
Expected: PASS (after Task 2 provides the module — write Task 2's schema stub first if the import fails)

- [ ] **Step 5: Commit**

```bash
git add app/routes/api.asaas-webhook.ts app/routes/api.asaas-webhook.test.ts app/routes.ts
git commit -m "feat(payments): authenticate and record every Asaas webhook"
```

---

### Task 2: Parsing and recording

**Files:**
- Create: `app/business/payment/payment-webhook.server.ts`
- Test: `app/business/payment/payment-webhook.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { webhookEventSchema } from "./payment-webhook.server"

describe("webhookEventSchema", () => {
  it("accepts what Asaas documents", () => {
    const parsed = webhookEventSchema.parse({
      id: "evt_05b708f961d739ea7eba7e4db318f621&368604920",
      event: "PAYMENT_RECEIVED",
      dateCreated: "2026-06-12 16:45:03",
      payment: {
        object: "payment",
        id: "pay_080225913252",
        customer: "cus_1",
        installment: null,
        value: 100,
        netValue: 94.51,
        status: "RECEIVED",
        externalReference: "056984",
        refunds: null,
      },
    })

    expect(parsed.payment?.id).toBe("pay_080225913252")
    expect(parsed.payment?.netValue).toBe(94.51)
  })

  it("keeps fields it was not told about", () => {
    const parsed = webhookEventSchema.parse({
      id: "evt_1",
      event: "PAYMENT_UPDATED",
      payment: { id: "pay_1", brandNewField: "value" },
    })

    expect((parsed.payment as Record<string, unknown>).brandNewField).toBe("value")
  })

  it("accepts an event with no payment, like a checkout one", () => {
    expect(() =>
      webhookEventSchema.parse({ id: "evt_1", event: "CHECKOUT_PAID" }),
    ).not.toThrow()
  })

  it("refuses a body without an id or an event", () => {
    expect(() => webhookEventSchema.parse({ event: "PAYMENT_RECEIVED" })).toThrow()
    expect(() => webhookEventSchema.parse({ id: "evt_1" })).toThrow()
  })

  it("reads the refunded total from the refunds list", () => {
    const parsed = webhookEventSchema.parse({
      id: "evt_1",
      event: "PAYMENT_PARTIALLY_REFUNDED",
      payment: {
        id: "pay_1",
        value: 100,
        refunds: [
          { value: 30, status: "DONE" },
          { value: 20, status: "DONE" },
          { value: 10, status: "CANCELLED" },
        ],
      },
    })

    expect(parsed.payment?.refunds).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/payment/payment-webhook.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/business/payment/payment-webhook.server.ts
import { kyselyDb } from "~/kysely-db"
import { zod } from "~/lib/helpers/zod"

/**
 * Deliberately permissive. Asaas adds fields without warning, and the docs say
 * so: a body that carries something new must still be processed, not rejected.
 * Only `id` and `event` are required, because they are what dedupes and routes.
 */
export const webhookEventSchema = zod.looseObject({
  id: zod.string().min(1),
  event: zod.string().min(1),
  dateCreated: zod.string().optional(),
  payment: zod
    .looseObject({
      id: zod.string(),
      status: zod.string().optional(),
      value: zod.number().optional(),
      netValue: zod.number().nullable().optional(),
      installment: zod.string().nullable().optional(),
      externalReference: zod.string().nullable().optional(),
      paymentDate: zod.string().nullable().optional(),
      confirmedDate: zod.string().nullable().optional(),
      dueDate: zod.string().nullable().optional(),
      refunds: zod
        .array(
          zod.looseObject({
            value: zod.number().optional(),
            status: zod.string().optional(),
          }),
        )
        .nullable()
        .optional(),
    })
    .optional(),
})

export type AsaasWebhookEvent = zod.infer<typeof webhookEventSchema>

export async function recordWebhookEvent(
  event: AsaasWebhookEvent,
): Promise<{ isNew: boolean; id: string }> {
  const inserted = await kyselyDb
    .insertInto("payment_webhook_events")
    .values({
      asaas_event_id: event.id,
      event_type: event.event,
      asaas_payment_id: event.payment?.id ?? null,
      payload: JSON.stringify(event),
    })
    .onConflict((oc) => oc.column("asaas_event_id").doNothing())
    .returning("id")
    .executeTakeFirst()

  if (inserted) return { isNew: true, id: inserted.id }

  const existing = await kyselyDb
    .selectFrom("payment_webhook_events")
    .select("id")
    .where("asaas_event_id", "=", event.id)
    .executeTakeFirstOrThrow()

  return { isNew: false, id: existing.id }
}
```

(`zod.looseObject` is zod v4's passthrough. If the project's zod wrapper does not re-export it, use `zod.object({...}).loose()`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/payment/payment-webhook.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/payment-webhook.server.ts app/business/payment/payment-webhook.test.ts
git commit -m "feat(payments): parse and dedupe Asaas webhook deliveries"
```

---

### Task 3: Applying the transitions

**Files:**
- Modify: `app/business/payment/payment-webhook.server.ts`
- Test: `app/business/payment/payment-webhook.integration.test.ts`

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

const sendPaymentConfirmedEmail = vi.fn().mockResolvedValue({ success: true })
const sendPaymentRefundEmail = vi.fn().mockResolvedValue({ success: true })
vi.mock("./payment-emails.server", () => ({
  sendPaymentLinkEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPaymentConfirmedEmail: (...a: unknown[]) => sendPaymentConfirmedEmail(...a),
  sendPaymentRefundEmail: (...a: unknown[]) => sendPaymentRefundEmail(...a),
}))

const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

import { applyWebhookEvent, recordWebhookEvent } from "./payment-webhook.server"

describe("applyWebhookEvent", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string
  let counter = 0

  beforeEach(async () => {
    tracker.clear()
    counter += 1
    sendPaymentConfirmedEmail.mockClear()
    sendPaymentRefundEmail.mockClear()
    logger.error.mockClear()

    const testId = `${Date.now()}-${counter}`
    const event = await createTestEvent(tracker, kysely, {
      title: "Webhook Event",
      ticket_price: 22000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-webhook@example.com`,
      full_name: "Webhook Tester",
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
    await kysely.deleteFrom("payment_webhook_events").where("asaas_event_id", "like", "evt_test_%").execute()
  })

  async function awaitingCharge(overrides: Record<string, unknown> = {}) {
    return createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      method: "pix",
      base_amount: 22000,
      amount: 22199,
      paid_at: null,
      asaas_payment_id: `pay_${counter}`,
      ...overrides,
    })
  }

  async function deliver(event: Record<string, unknown>) {
    const full = { id: `evt_test_${Math.random()}`, ...event }
    const recorded = await recordWebhookEvent(full as never)
    return applyWebhookEvent(recorded.id, full as never)
  }

  async function statusOf(id: string) {
    const row = await kysely
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow()
    return row
  }

  it("marks a charge paid on PAYMENT_RECEIVED and records the net", async () => {
    const payment = await awaitingCharge()

    await deliver({
      event: "PAYMENT_RECEIVED",
      payment: { id: `pay_${counter}`, value: 221.99, netValue: 220.0, status: "RECEIVED" },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("paid")
    expect(after.amount).toBe(22199)
    expect(after.asaas_net).toBe(22000)
    expect(after.paid_at).not.toBeNull()
    expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1)
  })

  it("marks a card charge paid on the first PAYMENT_CONFIRMED", async () => {
    const payment = await awaitingCharge({ method: "credit_card", installment_count: 3 })

    await deliver({
      event: "PAYMENT_CONFIRMED",
      payment: { id: `pay_${counter}`, value: 78.18, netValue: 75.0, status: "CONFIRMED" },
    })

    expect((await statusOf(payment.id)).status).toBe("paid")
  })

  it("sends one email however many times the event is delivered", async () => {
    const payment = await awaitingCharge()
    const event = {
      id: "evt_test_fixed",
      event: "PAYMENT_RECEIVED",
      payment: { id: `pay_${counter}`, value: 221.99, netValue: 220.0 },
    }

    const first = await recordWebhookEvent(event as never)
    await applyWebhookEvent(first.id, event as never)
    const second = await recordWebhookEvent(event as never)
    expect(second.isNew).toBe(false)

    expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1)
    expect((await statusOf(payment.id)).status).toBe("paid")
  })

  it("does not send a second email when a different event says paid again", async () => {
    const payment = await awaitingCharge()

    await deliver({
      event: "PAYMENT_CONFIRMED",
      payment: { id: `pay_${counter}`, value: 221.99, netValue: 220.0 },
    })
    await deliver({
      event: "PAYMENT_RECEIVED",
      payment: { id: `pay_${counter}`, value: 221.99, netValue: 220.0 },
    })

    expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1)
    expect((await statusOf(payment.id)).status).toBe("paid")
  })

  it("expires an open charge on PAYMENT_OVERDUE", async () => {
    const payment = await awaitingCharge()

    await deliver({ event: "PAYMENT_OVERDUE", payment: { id: `pay_${counter}` } })

    expect((await statusOf(payment.id)).status).toBe("expired")
  })

  it("never flips a paid charge back to expired", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      method: "pix",
      amount: 22199,
      asaas_payment_id: `pay_${counter}`,
    })

    await deliver({ event: "PAYMENT_OVERDUE", payment: { id: `pay_${counter}` } })

    expect((await statusOf(payment.id)).status).toBe("paid")
  })

  it("accepts a payment that arrives after the charge expired", async () => {
    const payment = await awaitingCharge({ status: "expired" })

    await deliver({
      event: "PAYMENT_RECEIVED",
      payment: { id: `pay_${counter}`, value: 221.99, netValue: 220.0 },
    })

    expect((await statusOf(payment.id)).status).toBe("paid")
  })

  it("records a full refund", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      method: "pix",
      amount: 22199,
      asaas_payment_id: `pay_${counter}`,
    })

    await deliver({
      event: "PAYMENT_REFUNDED",
      payment: { id: `pay_${counter}`, value: 221.99, refunds: [{ value: 221.99, status: "DONE" }] },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("refunded")
    expect(after.refund_amount).toBe(22199)
    expect(sendPaymentRefundEmail).toHaveBeenCalledTimes(1)
  })

  it("records a partial refund from the refunds list", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      method: "pix",
      amount: 22199,
      asaas_payment_id: `pay_${counter}`,
    })

    await deliver({
      event: "PAYMENT_PARTIALLY_REFUNDED",
      payment: {
        id: `pay_${counter}`,
        refunds: [
          { value: 50, status: "DONE" },
          { value: 10, status: "CANCELLED" },
        ],
      },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("partially_refunded")
    expect(after.refund_amount).toBe(5000)
  })

  it("cancels on PAYMENT_DELETED but leaves a paid charge alone", async () => {
    const open = await awaitingCharge()
    await deliver({ event: "PAYMENT_DELETED", payment: { id: `pay_${counter}` } })
    expect((await statusOf(open.id)).status).toBe("cancelled")
  })

  it("finds the payment by installment plan when the id is a later installment", async () => {
    const payment = await awaitingCharge({
      method: "credit_card",
      installment_count: 3,
      asaas_installment_id: `inst_${counter}`,
    })

    await deliver({
      event: "PAYMENT_RECEIVED",
      payment: {
        id: `pay_other_${counter}`,
        installment: `inst_${counter}`,
        value: 78.18,
        netValue: 75.0,
      },
    })

    expect((await statusOf(payment.id)).status).toBe("paid")
  })

  it("falls back to externalReference", async () => {
    const payment = await awaitingCharge({ asaas_payment_id: null })

    await deliver({
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay_unknown", externalReference: payment.id, value: 221.99, netValue: 220 },
    })

    expect((await statusOf(payment.id)).status).toBe("paid")
  })

  it("shrugs at an event about a charge that is not ours", async () => {
    const result = await deliver({
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay_not_ours", value: 10 },
    })

    expect(result.applied).toBe(false)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("shouts about a chargeback without changing the status", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      method: "credit_card",
      amount: 22199,
      asaas_payment_id: `pay_${counter}`,
    })

    await deliver({ event: "PAYMENT_CHARGEBACK_REQUESTED", payment: { id: `pay_${counter}` } })

    expect((await statusOf(payment.id)).status).toBe("paid")
    expect(logger.error).toHaveBeenCalled()
  })

  it("marks the inbox row processed", async () => {
    await awaitingCharge()
    const event = {
      id: "evt_test_processed",
      event: "PAYMENT_RECEIVED",
      payment: { id: `pay_${counter}`, value: 221.99, netValue: 220 },
    }
    const recorded = await recordWebhookEvent(event as never)
    await applyWebhookEvent(recorded.id, event as never)

    const row = await kysely
      .selectFrom("payment_webhook_events")
      .select(["processed_at", "error"])
      .where("id", "=", recorded.id)
      .executeTakeFirstOrThrow()

    expect(row.processed_at).not.toBeNull()
    expect(row.error).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:integration -- app/business/payment/payment-webhook.integration.test.ts`
Expected: FAIL — `applyWebhookEvent` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `payment-webhook.server.ts`:

```ts
import { logger } from "~/lib/logger/logger.server"
import { reaisToCents } from "./asaas-client.server"
import { sendPaymentConfirmedEmail, sendPaymentRefundEmail } from "./payment-emails.server"

const PAID_EVENTS = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]
const ALARM_EVENTS = [
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
  "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
  "PAYMENT_REFUND_DENIED",
]

/** Statuses a charge can still be paid from — including expired: Asaas lets
 *  someone pay a boleto or a Pix after the due date, and the money is real. */
const PAYABLE = ["pending", "awaiting_payment", "expired"] as const

async function findPayment(event: AsaasWebhookEvent) {
  const payment = event.payment
  if (!payment) return null

  const byId = await kyselyDb
    .selectFrom("payments")
    .selectAll()
    .where("asaas_payment_id", "=", payment.id)
    .executeTakeFirst()
  if (byId) return byId

  if (payment.installment) {
    const byInstallment = await kyselyDb
      .selectFrom("payments")
      .selectAll()
      .where("asaas_installment_id", "=", payment.installment)
      .executeTakeFirst()
    if (byInstallment) return byInstallment
  }

  if (payment.externalReference) {
    const byReference = await kyselyDb
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", payment.externalReference)
      .executeTakeFirst()
    if (byReference) return byReference
  }

  return null
}

function refundedCents(event: AsaasWebhookEvent, fallback: number | null): number | null {
  const refunds = event.payment?.refunds
  if (!refunds?.length) return fallback
  const done = refunds.filter((refund) => refund.status !== "CANCELLED")
  if (!done.length) return fallback
  return done.reduce((sum, refund) => sum + reaisToCents(refund.value ?? 0), 0)
}

export async function applyWebhookEvent(
  inboxId: string,
  event: AsaasWebhookEvent,
): Promise<{ applied: boolean; reason?: string }> {
  try {
    const payment = await findPayment(event)

    if (!payment) {
      // A charge created straight in the Asaas dashboard, or one from another
      // system on the same account. Retrying will not make it ours.
      logger.warn("Asaas webhook about an unknown charge", {
        asaasEventId: event.id,
        event: event.event,
        asaasPaymentId: event.payment?.id,
      })
      await markProcessed(inboxId, null)
      return { applied: false, reason: "unknown_payment" }
    }

    const result = await applyToPayment(payment, event)
    await markProcessed(inboxId, null)
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await markProcessed(inboxId, message)
    throw error
  }
}

async function markProcessed(inboxId: string, error: string | null) {
  await kyselyDb
    .updateTable("payment_webhook_events")
    .set({ processed_at: new Date().toISOString(), error })
    .where("id", "=", inboxId)
    .execute()
}

async function applyToPayment(
  payment: { id: string; amount: number | null; status: string },
  event: AsaasWebhookEvent,
): Promise<{ applied: boolean; reason?: string }> {
  const now = new Date().toISOString()

  if (ALARM_EVENTS.includes(event.event)) {
    logger.error("Asaas raised an alarm on a payment", {
      paymentId: payment.id,
      event: event.event,
      asaasPaymentId: event.payment?.id,
    })
    return { applied: false, reason: "alarm_logged" }
  }

  if (PAID_EVENTS.includes(event.event)) {
    const amount =
      payment.amount ??
      (event.payment?.value ? reaisToCents(event.payment.value) : null)
    const net =
      event.payment?.netValue != null ? reaisToCents(event.payment.netValue) : null

    const updated = await kyselyDb
      .updateTable("payments")
      .set({ status: "paid", paid_at: now, amount, asaas_net: net })
      .where("id", "=", payment.id)
      .where("status", "in", PAYABLE)
      .returning("id")
      .executeTakeFirst()

    // No row means it was already paid — a redelivery, or the second event of
    // the CONFIRMED/RECEIVED pair. The email has been sent once already.
    if (!updated) return { applied: false, reason: "already_paid" }

    await sendPaymentConfirmedEmail({ paymentId: payment.id })
    return { applied: true }
  }

  if (event.event === "PAYMENT_OVERDUE") {
    const updated = await kyselyDb
      .updateTable("payments")
      .set({ status: "expired" })
      .where("id", "=", payment.id)
      .where("status", "in", ["pending", "awaiting_payment"])
      .returning("id")
      .executeTakeFirst()
    return { applied: Boolean(updated) }
  }

  if (event.event === "PAYMENT_DELETED") {
    const updated = await kyselyDb
      .updateTable("payments")
      .set({ status: "cancelled" })
      .where("id", "=", payment.id)
      .where("status", "in", ["pending", "awaiting_payment", "expired"])
      .returning("id")
      .executeTakeFirst()
    return { applied: Boolean(updated) }
  }

  if (event.event === "PAYMENT_RESTORED") {
    const updated = await kyselyDb
      .updateTable("payments")
      .set({ status: "awaiting_payment" })
      .where("id", "=", payment.id)
      .where("status", "in", ["cancelled", "expired"])
      .returning("id")
      .executeTakeFirst()
    return { applied: Boolean(updated) }
  }

  if (event.event === "PAYMENT_REFUNDED" || event.event === "PAYMENT_PARTIALLY_REFUNDED") {
    const refunded = refundedCents(event, payment.amount)
    if (!refunded || !payment.amount) return { applied: false, reason: "no_refund_amount" }

    const isFull = refunded >= payment.amount
    const updated = await kyselyDb
      .updateTable("payments")
      .set({
        status: isFull ? "refunded" : "partially_refunded",
        refund_amount: Math.min(refunded, payment.amount),
        refunded_at: now,
      })
      .where("id", "=", payment.id)
      .where("status", "in", ["paid", "partially_refunded"])
      .returning("id")
      .executeTakeFirst()

    if (!updated) return { applied: false, reason: "not_refundable" }

    await sendPaymentRefundEmail({ paymentId: payment.id })
    return { applied: true }
  }

  if (event.event === "PAYMENT_REFUND_IN_PROGRESS") {
    await kyselyDb
      .updateTable("payments")
      .set({ refund_requested_at: now })
      .where("id", "=", payment.id)
      .where("refund_requested_at", "is", null)
      .execute()
    return { applied: true }
  }

  if (event.event === "PAYMENT_UPDATED") {
    const amount = event.payment?.value ? reaisToCents(event.payment.value) : null
    if (amount) {
      await kyselyDb
        .updateTable("payments")
        .set({ amount })
        .where("id", "=", payment.id)
        .where("status", "in", ["pending", "awaiting_payment"])
        .execute()
    }
    return { applied: true }
  }

  // PAYMENT_CREATED, PAYMENT_CHECKOUT_VIEWED and everything else: recorded,
  // nothing to do.
  return { applied: false, reason: "ignored" }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:integration -- app/business/payment/payment-webhook.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/payment/payment-webhook.server.ts app/business/payment/payment-webhook.integration.test.ts
git commit -m "feat(payments): apply Asaas events to the ledger, once each"
```

---

### Task 4: The confirmation email

**Files:**
- Create: `app/copy/emails/payment-confirmed.ts`
- Create: `app/business/email/templates/payment-confirmed-mail.template.ts`
- Create: `app/business/email/format-payment-confirmed-mail.ts`
- Modify: `app/business/payment/payment-emails.server.ts`
- Test: `payment-confirmed-mail.template.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe("paymentConfirmedMailTemplate", () => {
  it("states what was paid, how, and for which event", () => {
    const html = paymentConfirmedMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa de Setembro",
      eventEmoji: "🎉",
      amount: 23454,
      method: "credit_card",
      installmentCount: 3,
      paidAt: "2026-08-24T12:00:00Z",
    } as never)

    expect(html).toContain("Ana")
    expect(html).toContain("Festa de Setembro")
    expect(html).toContain("R$ 234,54")
    expect(html).toContain("Cartão de crédito")
    expect(html).toContain("3x")
  })

  it("does not mention installments for Pix", () => {
    const html = paymentConfirmedMailTemplate({
      displayName: "Ana",
      eventTitle: "Festa",
      eventEmoji: null,
      amount: 22199,
      method: "pix",
      installmentCount: null,
      paidAt: "2026-08-24T12:00:00Z",
    } as never)

    expect(html).toContain("Pix")
    expect(html).not.toMatch(/\dx/)
  })

  it("escapes the name", () => {
    const html = paymentConfirmedMailTemplate({
      displayName: "<img src=x onerror=alert(1)>",
      eventTitle: "Festa",
      eventEmoji: null,
      amount: 100,
      method: "pix",
      installmentCount: null,
      paidAt: "2026-08-24T12:00:00Z",
    } as never)

    expect(html).not.toContain("onerror")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- app/business/email/templates/payment-confirmed-mail.template.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Same shape as `payment-link-mail.template.ts` from POS-528: sanitize every user-controlled value, format the amount with `formatCurrency`, name the method through `paymentsCopy.manage.methods`, add the installment count only when there is one. `sendPaymentConfirmedEmail({ paymentId })` loads the payment with its event and profile and sends it, logging on failure without throwing — a failed email must not make the webhook retry a transition that already happened.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- app/business/email`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/business/email app/copy/emails/payment-confirmed.ts app/business/payment/payment-emails.server.ts
git commit -m "feat(payments): email the participant when the payment is confirmed"
```

---

### Task 5: Full verification

- [ ] Run: `pnpm lint`, `pnpm test` — green
- [ ] Register the webhook against the sandbox: `pnpm asaas:register-webhook https://<your-tunnel>.trycloudflare.com`
- [ ] Manually, end to end on the sandbox: open the payment page, pick Pix, confirm the charge in the sandbox dashboard, watch the tunnel receive the delivery, and check that the row is `paid`, `asaas_net` is filled, the confirmation email is in Mailpit, and the admin grid says "Pago"
- [ ] Deliver the same event twice from the Asaas dashboard's retry button: the second changes nothing and sends no second email
- [ ] Run E2E **once, last**: `pnpm test:e2e`

## Definition of done

- PR title: `[POS-530] Follow Asaas events in the ledger`
- `Fixes POS-530`; Implementation Notes covers the inbox, the guarded updates and the 200-vs-500 rule
- Delete this plan file before opening the PR
