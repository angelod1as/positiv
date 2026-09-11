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

vi.mock("~/business/payment/asaas-client.server", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("~/business/payment/asaas-client.server")
    >()
  return { ...original, deleteAsaasPayment }
})

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

import { cancelApplicationToEvent } from "./cancel-application-to-event.server"

describe("cancelApplicationToEvent", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let eventId: string
  let profileId: string
  let participantId: string
  let counter = 0

  beforeEach(async () => {
    tracker.clear()
    counter += 1
    deleteAsaasPayment.mockReset()
    deleteAsaasPayment.mockResolvedValue(true)
    logger.error.mockClear()

    const event = await createTestEvent(tracker, kysely, {
      title: "Withdraw Event",
      ticket_price: 22000,
    })
    eventId = event.id

    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${Date.now()}-${counter}-withdraw@example.com`,
      full_name: "Withdraw Tester",
    })
    profileId = profile.id

    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: eventId,
        profile_id: profileId,
        spot_type: "regular",
        is_user_applied: true,
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const statusOf = async (paymentId: string) =>
    (
      await kysely
        .selectFrom("payments")
        .select("status")
        .where("id", "=", paymentId)
        .executeTakeFirstOrThrow()
    ).status

  it("cancels the open charge when the participant withdraws", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
    })

    const result = await cancelApplicationToEvent({ eventId, profileId })

    expect(result.success).toBe(true)
    expect(await statusOf(payment.id)).toBe("cancelled")
  })

  it("deletes the Asaas charge along with it", async () => {
    const asaasPaymentId = `pay_withdraw_${Date.now()}`
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      amount: 22199,
      method: "pix",
      paid_at: null,
      asaas_payment_id: asaasPaymentId,
    })

    await cancelApplicationToEvent({ eventId, profileId })

    expect(deleteAsaasPayment).toHaveBeenCalledWith(asaasPaymentId)
  })

  it("leaves a paid charge alone -- a refund is a separate decision", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 22000,
      base_amount: 22000,
    })

    await cancelApplicationToEvent({ eventId, profileId })

    expect(await statusOf(payment.id)).toBe("paid")
  })

  it("withdraws the application even when Asaas refuses the delete", async () => {
    deleteAsaasPayment.mockRejectedValue(new Error("asaas is down"))
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      amount: 22199,
      method: "pix",
      paid_at: null,
      asaas_payment_id: `pay_withdraw_fail_${Date.now()}`,
    })

    const result = await cancelApplicationToEvent({ eventId, profileId })

    expect(result.success).toBe(true)

    const after = await kysely
      .selectFrom("event_participants")
      .select("is_user_applied")
      .where("id", "=", participantId)
      .executeTakeFirstOrThrow()
    expect(after.is_user_applied).toBe(false)
  })

  it("withdraws the application when there is no charge at all", async () => {
    const result = await cancelApplicationToEvent({ eventId, profileId })

    expect(result.success).toBe(true)
    expect(deleteAsaasPayment).not.toHaveBeenCalled()
  })
})
