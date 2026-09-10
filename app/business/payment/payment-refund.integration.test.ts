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
const { deleteAsaasPayment, logger } = vi.hoisted(() => ({
  deleteAsaasPayment: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("./asaas-client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./asaas-client.server")>()
  return { ...original, deleteAsaasPayment }
})

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

import { cancelPayment } from "./payment-cancel.server"
import { markManualRefunded } from "./payment-refund.server"

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
      base_amount: 20000,
    })

    const result = await markManualRefunded({
      paymentId: payment.id,
      amount: null,
    })
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

  it("marks a full refund when the amount arrives blank", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 20000,
      base_amount: 20000,
    })

    // What the modal posts when the admin takes up the offer to leave the
    // field empty: an empty string, not a missing key.
    const result = await markManualRefunded({
      paymentId: payment.id,
      amount: "",
    })
    expect(result.success).toBe(true)

    const after = await kysely
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow()

    expect(after.status).toBe("refunded")
    expect(after.refund_amount).toBe(20000)
  })

  it("refuses to mark an Asaas payment refunded by hand", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      amount: 20000,
      base_amount: 20000,
      method: "pix",
    })

    const result = await markManualRefunded({
      paymentId: payment.id,
      amount: null,
    })
    expect(result.success).toBe(false)

    const after = await kysely
      .selectFrom("payments")
      .select("status")
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow()
    expect(after.status).toBe("paid")
  })

  it("marks a partial refund", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 20000,
      base_amount: 20000,
    })

    await markManualRefunded({ paymentId: payment.id, amount: "50" })

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

  it("treats a refund of the whole amount as a full one", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 20000,
      base_amount: 20000,
    })

    const result = await markManualRefunded({
      paymentId: payment.id,
      amount: "200",
    })
    expect(result.success).toBe(true)

    const after = await kysely
      .selectFrom("payments")
      .select("status")
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow()
    expect(after.status).toBe("refunded")
  })

  it("refuses a refund larger than the payment", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 20000,
      base_amount: 20000,
    })

    const result = await markManualRefunded({
      paymentId: payment.id,
      amount: "300",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0].message).toMatch(/maior que o valor pago/i)
    }

    const after = await kysely
      .selectFrom("payments")
      .select("status")
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow()
    expect(after.status).toBe("paid")
  })

  it("refuses to give back money that never arrived", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 0,
      base_amount: 0,
    })

    const result = await markManualRefunded({
      paymentId: payment.id,
      amount: null,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      // Not "bigger than the amount paid": nothing was paid to be bigger than.
      expect(result.errors[0].message).toMatch(/maior que zero/i)
    }
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

    const result = await markManualRefunded({
      paymentId: payment.id,
      amount: null,
    })
    expect(result.success).toBe(false)
  })

  it("refuses to refund twice", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 20000,
      base_amount: 20000,
    })

    await markManualRefunded({ paymentId: payment.id, amount: null })
    const second = await markManualRefunded({
      paymentId: payment.id,
      amount: null,
    })

    expect(second.success).toBe(false)
  })
})

describe("cancelPayment", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string

  beforeEach(async () => {
    tracker.clear()
    deleteAsaasPayment.mockReset()
    deleteAsaasPayment.mockResolvedValue(true)
    logger.error.mockClear()
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Cancel Event",
      ticket_price: 20000,
    })
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
      base_amount: 20000,
    })

    const result = await cancelPayment({ paymentId: payment.id })
    expect(result.success).toBe(false)

    const after = await kysely
      .selectFrom("payments")
      .select("status")
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow()
    expect(after.status).toBe("paid")
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

  it("deletes the charge on Asaas as well", async () => {
    const asaasPaymentId = `pay_cancel_${Date.now()}`
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      amount: 20000,
      method: "pix",
      paid_at: null,
      asaas_payment_id: asaasPaymentId,
    })

    await cancelPayment({ paymentId: payment.id })

    expect(deleteAsaasPayment).toHaveBeenCalledWith(asaasPaymentId)
  })

  it("calls Asaas for nothing when the charge never reached it", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
    })

    await cancelPayment({ paymentId: payment.id })

    expect(deleteAsaasPayment).not.toHaveBeenCalled()
  })

  it("stays cancelled when Asaas refuses the delete", async () => {
    deleteAsaasPayment.mockRejectedValue(new Error("asaas is down"))
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      amount: 20000,
      method: "pix",
      paid_at: null,
      asaas_payment_id: `pay_cancel_fail_${Date.now()}`,
    })

    const result = await cancelPayment({ paymentId: payment.id })

    expect(result.success).toBe(true)
    const after = await kysely
      .selectFrom("payments")
      .select("status")
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow()
    expect(after.status).toBe("cancelled")
    expect(logger.error).toHaveBeenCalled()
  })

  it("does not reach Asaas for a charge it refused to cancel", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 20000,
      base_amount: 20000,
      asaas_payment_id: null,
    })

    await cancelPayment({ paymentId: payment.id })

    expect(deleteAsaasPayment).not.toHaveBeenCalled()
  })
})
