import { fromZonedTime } from "date-fns-tz"
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

const { sendPaymentConfirmedEmail, sendPaymentRefundEmail, logger } =
  vi.hoisted(() => ({
    sendPaymentConfirmedEmail: vi.fn(),
    sendPaymentRefundEmail: vi.fn(),
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  }))

vi.mock("./payment-emails.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./payment-emails.server")>()
  return { ...original, sendPaymentConfirmedEmail, sendPaymentRefundEmail }
})

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

import { applyWebhookEvent, recordWebhookEvent } from "./payment-webhook.server"
import {
  translateAsaasEvent,
  webhookEventSchema,
} from "./provider/asaas/asaas-webhook.server"

// The scenarios below are what Asaas actually sends, so each one goes through
// the connector's translation the way a real delivery does.
const asaas = (raw: unknown) =>
  translateAsaasEvent(webhookEventSchema.parse(raw))

describe("applyWebhookEvent", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string
  let counter = 0

  beforeEach(async () => {
    tracker.clear()
    counter += 1
    sendPaymentConfirmedEmail.mockClear().mockResolvedValue({ success: true })
    sendPaymentRefundEmail.mockClear().mockResolvedValue({ success: true })
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
      .where("provider_event_id", "like", "evt_test_%")
      .execute()
  })

  async function awaitingCharge(overrides: Record<string, unknown> = {}) {
    return createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      status: "awaiting_payment",
      method: "pix",
      base_amount: 22000,
      amount: 22199,
      paid_at: null,
      provider_charge_id: `pay_${counter}`,
      ...overrides,
    })
  }

  async function deliver(event: Record<string, unknown>) {
    const full = { id: `evt_test_${Math.random()}`, ...event }
    const recorded = await recordWebhookEvent(asaas(full), full)
    return applyWebhookEvent(recorded.id, asaas(full))
  }

  async function statusOf(id: string) {
    return kysely
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow()
  }

  it("marks a charge paid on PAYMENT_RECEIVED", async () => {
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
    expect(after.paid_at).not.toBeNull()
    expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1)
    const queued = await kysely
      .selectFrom("payment_emails")
      .selectAll()
      .where("payment_id", "=", payment.id)
      .executeTakeFirstOrThrow()
    expect(queued.kind).toBe("confirmation")
    expect(queued.sent_at).not.toBeNull()
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

    const first = await recordWebhookEvent(asaas(event), event)
    await applyWebhookEvent(first.id, asaas(event))
    const second = await recordWebhookEvent(asaas(event), event)
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
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
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
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
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
    expect(sendPaymentRefundEmail).toHaveBeenCalledWith({
      paymentId: payment.id,
    })
  })

  it("adds up a card plan refunded one charge at a time, and tells the participant once", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "credit_card",
      installment_count: 3,
      amount: 23631,
      provider_charge_id: `pay_a_${counter}`,
      provider_plan_id: `inst_${counter}`,
      refund_requested_at: new Date().toISOString(),
      refund_requested_amount: 21900,
    })

    // Asaas reports each charge of the plan in its own event, and each event
    // lists only that charge's refunds.
    const refundCharge = (charge: string) =>
      deliver({
        event: "PAYMENT_PARTIALLY_REFUNDED",
        payment: {
          id: `${charge}_${counter}`,
          installment: `inst_${counter}`,
          value: 78.77,
          refunds: [{ value: 73, status: "DONE" }],
        },
      })

    await refundCharge("pay_a")
    expect((await statusOf(payment.id)).refund_amount).toBe(7300)

    await refundCharge("pay_b")
    expect((await statusOf(payment.id)).refund_amount).toBe(14600)
    expect(sendPaymentRefundEmail).not.toHaveBeenCalled()

    await refundCharge("pay_c")
    const after = await statusOf(payment.id)
    // The fees stayed behind, so the plan is partially refunded in the ledger
    // even though everything that was asked for went back.
    expect(after.status).toBe("partially_refunded")
    expect(after.refund_amount).toBe(21900)
    expect(sendPaymentRefundEmail).toHaveBeenCalledTimes(1)
    expect(sendPaymentRefundEmail).toHaveBeenCalledWith({
      paymentId: payment.id,
    })
  })

  it("counts a plan charge's refund once, however many events describe it", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "credit_card",
      installment_count: 3,
      amount: 23631,
      provider_charge_id: `pay_a_${counter}`,
      provider_plan_id: `inst_${counter}`,
      refund_requested_at: new Date().toISOString(),
      refund_requested_amount: 21900,
    })

    for (let delivery = 0; delivery < 2; delivery++) {
      await deliver({
        event: "PAYMENT_PARTIALLY_REFUNDED",
        payment: {
          id: `pay_a_${counter}`,
          installment: `inst_${counter}`,
          value: 78.77,
          refunds: [{ value: 73, status: "DONE" }],
        },
      })
    }

    expect((await statusOf(payment.id)).refund_amount).toBe(7300)
    expect(sendPaymentRefundEmail).not.toHaveBeenCalled()
  })

  it("closes a plan refunded in full from the Asaas dashboard, and tells the participant once", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "credit_card",
      installment_count: 3,
      amount: 23631,
      provider_charge_id: `pay_a_${counter}`,
      provider_plan_id: `inst_${counter}`,
    })

    for (const charge of ["pay_a", "pay_b", "pay_c"]) {
      await deliver({
        event: "PAYMENT_REFUNDED",
        payment: {
          id: `${charge}_${counter}`,
          installment: `inst_${counter}`,
          value: 78.77,
          refunds: [{ value: 78.77, status: "DONE" }],
        },
      })
    }

    const after = await statusOf(payment.id)
    expect(after.status).toBe("refunded")
    expect(after.refund_amount).toBe(23631)
    expect(sendPaymentRefundEmail).toHaveBeenCalledTimes(1)
  })

  it("records a plan partially refunded from the Asaas dashboard without telling the participant", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "credit_card",
      installment_count: 3,
      amount: 23631,
      provider_charge_id: `pay_a_${counter}`,
      provider_plan_id: `inst_${counter}`,
    })

    await deliver({
      event: "PAYMENT_PARTIALLY_REFUNDED",
      payment: {
        id: `pay_a_${counter}`,
        installment: `inst_${counter}`,
        value: 78.77,
        refunds: [{ value: 50, status: "DONE" }],
      },
    })

    // Deliberate: with no request behind it, one event cannot say whether it
    // is a partial refund or the first charge of a whole one, so a plan is only
    // told once the gross is back. The panel is the path that tells.
    const after = await statusOf(payment.id)
    expect(after.status).toBe("partially_refunded")
    expect(after.refund_amount).toBe(5000)
    expect(sendPaymentRefundEmail).not.toHaveBeenCalled()
  })

  it("tells the participant once even when a plan's last charges are applied at the same time", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "credit_card",
      installment_count: 3,
      amount: 23631,
      provider_charge_id: `pay_a_${counter}`,
      provider_plan_id: `inst_${counter}`,
      refund_requested_at: new Date().toISOString(),
      refund_requested_amount: 21900,
    })

    const refundEvent = (charge: string) => ({
      id: `evt_test_${Math.random()}`,
      event: "PAYMENT_PARTIALLY_REFUNDED",
      payment: {
        id: `${charge}_${counter}`,
        installment: `inst_${counter}`,
        value: 78.77,
        refunds: [{ value: 73, status: "DONE" }],
      },
    })

    await deliver(refundEvent("pay_a"))

    // Both recorded before either is applied, so each transaction sees the
    // whole plan in the inbox and would reach the target on its own.
    const b = refundEvent("pay_b")
    const c = refundEvent("pay_c")
    const recordedB = await recordWebhookEvent(asaas(b), b)
    const recordedC = await recordWebhookEvent(asaas(c), c)
    await Promise.all([
      applyWebhookEvent(recordedB.id, asaas(b)),
      applyWebhookEvent(recordedC.id, asaas(c)),
    ])

    expect((await statusOf(payment.id)).refund_amount).toBe(21900)
    expect(sendPaymentRefundEmail).toHaveBeenCalledTimes(1)
  })

  it("records a partial refund from the refunds list", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
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

  it("records what is given back and what is still on its way", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
    })

    await deliver({
      event: "PAYMENT_PARTIALLY_REFUNDED",
      payment: {
        id: `pay_${counter}`,
        refunds: [
          { value: 50, status: "DONE" },
          { value: 30, status: "PENDING" },
        ],
      },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("partially_refunded")
    expect(after.refund_amount).toBe(5000)
    expect(after.refund_pending_amount).toBe(3000)
  })

  it("gives the claim back when Asaas cancels what was left of a request", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
      refund_requested_at: new Date().toISOString(),
      refund_requested_amount: 22000,
    })

    await deliver({
      event: "PAYMENT_PARTIALLY_REFUNDED",
      payment: {
        id: `pay_${counter}`,
        refunds: [
          { value: 100, status: "DONE" },
          { value: 120, status: "CANCELLED" },
        ],
      },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("partially_refunded")
    expect(after.refund_amount).toBe(10000)
    expect(after.refund_cancelled_amount).toBe(12000)
    expect(after.refund_requested_at).toBeNull()
  })

  it("counts a refund still in progress on a plan as on its way, not as given back", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "credit_card",
      installment_count: 2,
      amount: 23430,
      provider_charge_id: `pay_a_${counter}`,
      provider_plan_id: `inst_${counter}`,
      refund_requested_at: new Date().toISOString(),
      refund_requested_amount: 22566,
    })

    await deliver({
      event: "PAYMENT_REFUNDED",
      payment: {
        id: `pay_a_${counter}`,
        installment: `inst_${counter}`,
        value: 117.15,
        refunds: [{ value: 117.15, status: "DONE" }],
      },
    })
    await deliver({
      event: "PAYMENT_PARTIALLY_REFUNDED",
      payment: {
        id: `pay_b_${counter}`,
        installment: `inst_${counter}`,
        value: 117.15,
        refunds: [{ value: 108.51, status: "PENDING" }],
      },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("partially_refunded")
    expect(after.refund_amount).toBe(11715)
    expect(after.refund_pending_amount).toBe(10851)
    expect(sendPaymentRefundEmail).not.toHaveBeenCalled()
  })

  it("marks a refund in progress without leaving paid", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
    })

    await deliver({
      event: "PAYMENT_REFUND_IN_PROGRESS",
      payment: { id: `pay_${counter}` },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("paid")
    expect(after.refund_requested_at).not.toBeNull()
  })

  it("gives a denied refund its claim back, and still shouts about it", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
      refund_requested_at: new Date().toISOString(),
      refund_requested_amount: 22000,
    })

    await deliver({
      event: "PAYMENT_REFUND_DENIED",
      payment: { id: `pay_${counter}`, status: "RECEIVED" },
      additionalInfo: { denialReason: "Falha ao processar a transferência." },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("paid")
    expect(after.refund_requested_at).toBeNull()
    expect(after.refund_requested_amount).toBeNull()
    // What the admin is shown, so the returning button does not read as if
    // nothing had happened.
    expect(after.refund_denied_at).not.toBeNull()
    expect(after.refund_denial_reason).toBe("Falha ao processar a transferência.")
    expect(logger.error).toHaveBeenCalled()
  })

  it("records a denied refund even when Asaas gives no reason", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
      refund_requested_at: new Date().toISOString(),
      refund_requested_amount: 22000,
    })

    await deliver({
      event: "PAYMENT_REFUND_DENIED",
      payment: { id: `pay_${counter}`, status: "RECEIVED" },
    })

    const after = await statusOf(payment.id)
    expect(after.refund_denied_at).not.toBeNull()
    expect(after.refund_denial_reason).toBeNull()
  })

  // A plan is refunded with one request to the plan, so a denial there means
  // that request moved nothing, as on a single charge.
  it("gives a card plan's denied refund its claim back too", async () => {
    const requestedAt = new Date().toISOString()
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "credit_card",
      installment_count: 3,
      amount: 23430,
      provider_charge_id: `pay_${counter}`,
      provider_plan_id: `ins_${counter}`,
      refund_requested_at: requestedAt,
      refund_requested_amount: 22000,
    })

    await deliver({
      event: "PAYMENT_REFUND_DENIED",
      payment: { id: `pay_${counter}`, installment: `ins_${counter}` },
    })

    const after = await statusOf(payment.id)
    expect(after.refund_requested_at).toBeNull()
    expect(after.refund_requested_amount).toBeNull()
    expect(after.refund_denied_at).not.toBeNull()
  })

  it("leaves a refund that already went through alone when a denial arrives late", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "pix",
      status: "refunded",
      amount: 22199,
      refund_amount: 22199,
      refunded_at: new Date().toISOString(),
      provider_charge_id: `pay_${counter}`,
    })

    await deliver({
      event: "PAYMENT_REFUND_DENIED",
      payment: { id: `pay_${counter}`, status: "REFUNDED" },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("refunded")
    expect(after.refund_denied_at).toBeNull()
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
      provider_plan_id: `inst_${counter}`,
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

  it("leaves a settled plan alone when a later installment arrives", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      status: "refunded",
      method: "credit_card",
      installment_count: 3,
      amount: 23454,
      // The whole plan had settled: three installments, not the one the late
      // event on its own would add up to.
      refund_amount: 23454,
      refunded_at: new Date().toISOString(),
      provider_plan_id: `inst_${counter}`,
    })

    // Asaas keeps billing the plan, so a later installment still arrives after
    // the money went back. The row is settled: its audit trail says refunded.
    const result = await deliver({
      event: "PAYMENT_CONFIRMED",
      payment: {
        id: `pay_late_${counter}`,
        installment: `inst_${counter}`,
        value: 78.18,
        netValue: 75.3,
      },
    })

    expect(result.applied).toBe(false)
    const after = await statusOf(payment.id)
    expect(after.status).toBe("refunded")
  })

  it("falls back to externalReference", async () => {
    const payment = await awaitingCharge({ provider_charge_id: null })

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

  it("shrugs at an externalReference that is not a uuid", async () => {
    // A charge opened by another system on the same Asaas account carries its
    // own reference. Feeding that to a uuid column throws in Postgres, and the
    // 200 this path promises would become a 500 that Asaas retries forever.
    const result = await deliver({
      event: "PAYMENT_RECEIVED",
      payment: {
        id: "pay_from_another_system",
        externalReference: "ORDER-123",
        value: 10,
      },
    })

    expect(result.applied).toBe(false)
    expect(result.reason).toBe("unknown_payment")
  })

  it("leaves a failed delivery open for the redelivery to finish", async () => {
    const payment = await awaitingCharge()
    const event = {
      id: "evt_test_failed_once",
      event: "PAYMENT_RECEIVED",
      payment: { id: `pay_${counter}`, value: 221.99, netValue: 220.0 },
    }

    const first = await recordWebhookEvent(asaas(event), event)
    // What the catch in applyWebhookEvent leaves behind when a transition
    // throws: the error recorded, the row still waiting to be processed.
    await kysely
      .updateTable("payment_webhook_events")
      .set({ error: "database is down", processed_at: null })
      .where("id", "=", first.id)
      .execute()

    const second = await recordWebhookEvent(asaas(event), event)
    expect(second.isNew).toBe(false)
    expect(second.alreadyProcessed).toBe(false)

    await applyWebhookEvent(second.id, asaas(event))

    expect((await statusOf(payment.id)).status).toBe("paid")
    expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1)
  })

  it("keeps the translated event beside the raw payload in the inbox", async () => {
    const raw = {
      id: "evt_test_translated",
      event: "PAYMENT_PARTIALLY_REFUNDED",
      payment: {
        id: `pay_${counter}`,
        installment: `inst_${counter}`,
        value: 78.18,
        refunds: [{ value: 10, status: "DONE" }],
      },
    }

    const recorded = await recordWebhookEvent(asaas(raw), raw)

    const row = await kysely
      .selectFrom("payment_webhook_events")
      .select([
        "provider_event_id",
        "event_type",
        "provider_charge_id",
        "provider_plan_id",
        "payload",
        "event",
      ])
      .where("id", "=", recorded.id)
      .executeTakeFirstOrThrow()

    expect(row).toMatchObject({
      provider_event_id: "evt_test_translated",
      event_type: "PAYMENT_PARTIALLY_REFUNDED",
      provider_charge_id: `pay_${counter}`,
      provider_plan_id: `inst_${counter}`,
      payload: raw,
      event: {
        type: "partially_refunded",
        refunds: [{ amount: 1000, state: "done" }],
      },
    })
  })

  it("closes an event that was processed, so a redelivery is a no-op", async () => {
    await awaitingCharge()
    const event = {
      id: "evt_test_processed_once",
      event: "PAYMENT_RECEIVED",
      payment: { id: `pay_${counter}`, value: 221.99, netValue: 220.0 },
    }

    const first = await recordWebhookEvent(asaas(event), event)
    await applyWebhookEvent(first.id, asaas(event))

    const second = await recordWebhookEvent(asaas(event), event)
    expect(second.alreadyProcessed).toBe(true)
  })

  it("keeps the inbox row open when the transition throws", async () => {
    const payment = await awaitingCharge()
    const event = {
      id: "evt_test_throws",
      event: "PAYMENT_UPDATED",
      // More cents than an integer column holds: the update itself fails.
      payment: { id: `pay_${counter}`, value: 99_999_999_999 },
    }
    const recorded = await recordWebhookEvent(asaas(event), event)

    await expect(
      applyWebhookEvent(recorded.id, asaas(event)),
    ).rejects.toThrow()

    const row = await kysely
      .selectFrom("payment_webhook_events")
      .select(["processed_at", "error"])
      .where("id", "=", recorded.id)
      .executeTakeFirstOrThrow()

    expect(row.processed_at).toBeNull()
    expect(row.error).not.toBeNull()
    expect((await statusOf(payment.id)).amount).toBe(22199)
  })

  it("rolls the transition back when the inbox cannot be closed", async () => {
    const payment = await awaitingCharge()
    const event = {
      id: "evt_test_atomic",
      event: "PAYMENT_RECEIVED",
      payment: { id: `pay_${counter}`, value: 221.99, netValue: 220.0 },
    }
    await recordWebhookEvent(asaas(event), event)

    // The transition and the inbox row move together or not at all. A row
    // marked paid whose delivery was never closed would be redelivered into
    // `already_paid`, and the participant would never hear about it.
    await expect(
      applyWebhookEvent("not-a-uuid", asaas(event)),
    ).rejects.toThrow()

    expect((await statusOf(payment.id)).status).toBe("awaiting_payment")
    expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
  })

  it("keeps a transition that went through when the email fails", async () => {
    const payment = await awaitingCharge()
    sendPaymentConfirmedEmail.mockRejectedValueOnce(new Error("smtp is down"))

    const event = {
      id: "evt_test_email_down",
      event: "PAYMENT_RECEIVED",
      payment: { id: `pay_${counter}`, value: 221.99, netValue: 220.0 },
    }
    const recorded = await recordWebhookEvent(asaas(event), event)

    // The money moved. Asking Asaas to retry would not re-send the email —
    // the guarded update no longer matches — and would stall its queue.
    const result = await applyWebhookEvent(recorded.id, asaas(event))

    expect(result.applied).toBe(true)
    expect((await statusOf(payment.id)).status).toBe("paid")
    const row = await kysely
      .selectFrom("payment_webhook_events")
      .select(["processed_at", "error"])
      .where("id", "=", recorded.id)
      .executeTakeFirstOrThrow()
    expect(row.processed_at).not.toBeNull()
    expect(logger.warn).toHaveBeenCalled()
  })

  it("records no refund when every entry in the list was cancelled", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
    })

    await deliver({
      event: "PAYMENT_PARTIALLY_REFUNDED",
      payment: {
        id: `pay_${counter}`,
        refunds: [{ value: 50, status: "CANCELLED" }],
      },
    })

    const after = await statusOf(payment.id)
    expect(after.status).toBe("paid")
    expect(after.refund_amount).toBeNull()
    // Nothing moved, but the admin sees what Asaas dropped.
    expect(after.refund_cancelled_amount).toBe(5000)
    // Nothing moved, so there is nothing to tell the participant about.
    expect(sendPaymentRefundEmail).not.toHaveBeenCalled()
  })

  it("ignores a PAYMENT_UPDATED that carries nothing to sync", async () => {
    const payment = await awaitingCharge()

    const result = await deliver({
      event: "PAYMENT_UPDATED",
      payment: { id: `pay_${counter}`, value: 0 },
    })

    expect(result.applied).toBe(false)
    expect(result.reason).toBe("nothing_to_sync")
    expect((await statusOf(payment.id)).amount).toBe(22199)
  })

  it("follows the due date Asaas reports on PAYMENT_UPDATED", async () => {
    const payment = await awaitingCharge()

    await deliver({
      event: "PAYMENT_UPDATED",
      payment: { id: `pay_${counter}`, value: 250.0, dueDate: "2026-12-24" },
    })

    const after = await statusOf(payment.id)
    expect(after.amount).toBe(25000)
    // Asaas dates a charge by the calendar day in Brazil, and it stays payable
    // through the end of it -- the expiry cron reads this column.
    expect(new Date(after.due_at).toISOString()).toBe(
      fromZonedTime("2026-12-24T23:59:59", "America/Sao_Paulo").toISOString(),
    )
  })

  it("still follows an update after the charge expired", async () => {
    const payment = await awaitingCharge({ status: "expired" })

    const result = await deliver({
      event: "PAYMENT_UPDATED",
      payment: { id: `pay_${counter}`, value: 250.0, dueDate: "2026-12-24" },
    })

    expect(result.applied).toBe(true)
    expect((await statusOf(payment.id)).amount).toBe(25000)
  })

  it("does not call a partial refund full when Asaas itemises nothing", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
    })

    const result = await deliver({
      event: "PAYMENT_PARTIALLY_REFUNDED",
      payment: { id: `pay_${counter}`, value: 221.99 },
    })

    expect(result.applied).toBe(false)
    expect(result.reason).toBe("no_refund_amount")
    const after = await statusOf(payment.id)
    expect(after.status).toBe("paid")
    expect(after.refund_amount).toBeNull()
    // Nothing moved, so there is nothing to tell the participant about.
    expect(sendPaymentRefundEmail).not.toHaveBeenCalled()
  })

  it("syncs the amount on PAYMENT_UPDATED while the charge is open", async () => {
    const payment = await awaitingCharge()

    const result = await deliver({
      event: "PAYMENT_UPDATED",
      payment: { id: `pay_${counter}`, value: 250.0 },
    })

    expect(result.applied).toBe(true)
    expect((await statusOf(payment.id)).amount).toBe(25000)
  })

  it("does not resize a charge that is already paid", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
    })

    const result = await deliver({
      event: "PAYMENT_UPDATED",
      payment: { id: `pay_${counter}`, value: 250.0 },
    })

    expect(result.applied).toBe(false)
    expect((await statusOf(payment.id)).amount).toBe(22199)
  })

  it("reopens a cancelled charge on PAYMENT_RESTORED", async () => {
    const payment = await awaitingCharge({ status: "cancelled" })

    const result = await deliver({
      event: "PAYMENT_RESTORED",
      payment: { id: `pay_${counter}` },
    })

    expect(result.applied).toBe(true)
    expect((await statusOf(payment.id)).status).toBe("awaiting_payment")
  })

  it("does not restore a charge that was paid", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
    })

    const result = await deliver({
      event: "PAYMENT_RESTORED",
      payment: { id: `pay_${counter}` },
    })

    expect(result.applied).toBe(false)
    expect((await statusOf(payment.id)).status).toBe("paid")
  })

  it("records an event it has no transition for and leaves the row alone", async () => {
    const payment = await awaitingCharge()

    const result = await deliver({
      event: "PAYMENT_CREATED",
      payment: { id: `pay_${counter}`, value: 221.99 },
    })

    expect(result.applied).toBe(false)
    expect(result.reason).toBe("ignored")
    expect((await statusOf(payment.id)).status).toBe("awaiting_payment")
  })

  it("marks a refund in progress only the first time", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      method: "pix",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
    })

    const first = await deliver({
      event: "PAYMENT_REFUND_IN_PROGRESS",
      payment: { id: `pay_${counter}` },
    })
    const requestedAt = (await statusOf(payment.id)).refund_requested_at

    const second = await deliver({
      event: "PAYMENT_REFUND_IN_PROGRESS",
      payment: { id: `pay_${counter}` },
    })

    expect(first.applied).toBe(true)
    // The second one changed nothing, and says so like every other transition.
    expect(second.applied).toBe(false)
    expect((await statusOf(payment.id)).refund_requested_at).toEqual(requestedAt)
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
      kind: "online",
      method: "credit_card",
      amount: 22199,
      provider_charge_id: `pay_${counter}`,
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
    const recorded = await recordWebhookEvent(asaas(event), event)
    await applyWebhookEvent(recorded.id, asaas(event))

    const row = await kysely
      .selectFrom("payment_webhook_events")
      .select(["processed_at", "error"])
      .where("id", "=", recorded.id)
      .executeTakeFirstOrThrow()

    expect(row.processed_at).not.toBeNull()
    expect(row.error).toBeNull()
  })
})
