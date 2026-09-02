import { afterEach, beforeEach, describe, expect, it } from "vitest"
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
})
