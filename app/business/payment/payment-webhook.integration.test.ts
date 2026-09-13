import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"

const { sendPaymentConfirmedEmail, logger } = vi.hoisted(() => ({
  sendPaymentConfirmedEmail: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("./payment-emails.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./payment-emails.server")>()
  return { ...original, sendPaymentConfirmedEmail }
})

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

import { applyWebhookEvent, recordWebhookEvent } from "./payment-webhook.server"

describe("applyWebhookEvent", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string
  let counter = 0

  beforeEach(async () => {
    tracker.clear()
    counter += 1
    sendPaymentConfirmedEmail.mockClear().mockResolvedValue({ success: true })
    logger.error.mockClear()
    logger.warn.mockClear()

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
    await kysely
      .deleteFrom("payment_webhook_events")
      .where("asaas_event_id", "like", "evt_test_%")
      .execute()
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
    return kysely
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow()
  }

  it("marks a charge paid on PAYMENT_RECEIVED and records the net", async () => {
    const payment = await awaitingCharge()

    await deliver({
      event: "PAYMENT_RECEIVED",
      payment: {
        id: `pay_${counter}`,
        value: 221.99,
        netValue: 220.0,
        status: "RECEIVED",
      },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("paid")
    expect(after.amount).toBe(22199)
    expect(after.asaas_net).toBe(22000)
    expect(after.paid_at).not.toBeNull()
    expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1)
  })

  it("marks a card charge paid on the first PAYMENT_CONFIRMED", async () => {
    const payment = await awaitingCharge({
      method: "credit_card",
      installment_count: 3,
    })

    await deliver({
      event: "PAYMENT_CONFIRMED",
      payment: {
        id: `pay_${counter}`,
        value: 78.18,
        netValue: 75.0,
        status: "CONFIRMED",
      },
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

    await deliver({
      event: "PAYMENT_OVERDUE",
      payment: { id: `pay_${counter}` },
    })

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

    await deliver({
      event: "PAYMENT_OVERDUE",
      payment: { id: `pay_${counter}` },
    })

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
      payment: {
        id: `pay_${counter}`,
        value: 221.99,
        refunds: [{ value: 221.99, status: "DONE" }],
      },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("refunded")
    expect(after.refund_amount).toBe(22199)
    expect(after.refunded_at).not.toBeNull()
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

  it("marks a refund in progress without leaving paid", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      method: "pix",
      amount: 22199,
      asaas_payment_id: `pay_${counter}`,
    })

    await deliver({
      event: "PAYMENT_REFUND_IN_PROGRESS",
      payment: { id: `pay_${counter}` },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("paid")
    expect(after.refund_requested_at).not.toBeNull()
  })

  it("cancels on PAYMENT_DELETED but leaves a paid charge alone", async () => {
    const open = await awaitingCharge()
    await deliver({
      event: "PAYMENT_DELETED",
      payment: { id: `pay_${counter}` },
    })
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

  it("accumulates the net of every installment of a card plan", async () => {
    const payment = await awaitingCharge({
      method: "credit_card",
      installment_count: 3,
      amount: 23454,
      asaas_installment_id: `inst_${counter}`,
    })

    await deliver({
      event: "PAYMENT_CONFIRMED",
      payment: {
        id: `pay_inst1_${counter}`,
        installment: `inst_${counter}`,
        value: 78.18,
        netValue: 75.3,
      },
    })

    expect((await statusOf(payment.id)).asaas_net).toBe(7530)

    await deliver({
      event: "PAYMENT_CONFIRMED",
      payment: {
        id: `pay_inst2_${counter}`,
        installment: `inst_${counter}`,
        value: 78.18,
        netValue: 75.3,
      },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("paid")
    expect(after.asaas_net).toBe(15060)
  })

  it("counts one installment once, however many events describe it", async () => {
    const payment = await awaitingCharge({
      method: "credit_card",
      installment_count: 3,
      amount: 23454,
      asaas_installment_id: `inst_${counter}`,
    })

    await deliver({
      event: "PAYMENT_CONFIRMED",
      payment: {
        id: `pay_inst1_${counter}`,
        installment: `inst_${counter}`,
        value: 78.18,
        netValue: 75.3,
      },
    })
    await deliver({
      event: "PAYMENT_RECEIVED",
      payment: {
        id: `pay_inst1_${counter}`,
        installment: `inst_${counter}`,
        value: 78.18,
        netValue: 75.3,
      },
    })

    expect((await statusOf(payment.id)).asaas_net).toBe(7530)
  })

  it("falls back to externalReference", async () => {
    const payment = await awaitingCharge({ asaas_payment_id: null })

    await deliver({
      event: "PAYMENT_RECEIVED",
      payment: {
        id: "pay_unknown",
        externalReference: payment.id,
        value: 221.99,
        netValue: 220,
      },
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

    await deliver({
      event: "PAYMENT_CHARGEBACK_REQUESTED",
      payment: { id: `pay_${counter}` },
    })

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
