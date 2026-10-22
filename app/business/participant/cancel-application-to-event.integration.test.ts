import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { z } from "zod"
import type { userContextSchema } from "../common"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
  getTestSupabaseClient,
} from "~/test/db-test-utils"

const { deleteAsaasPayment, logger } = vi.hoisted(() => ({
  deleteAsaasPayment: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("~/business/payment/provider/asaas/asaas-client.server", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("~/business/payment/provider/asaas/asaas-client.server")
    >()
  return { ...original, deleteAsaasPayment }
})

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { ...logger, child: () => logger },
}))

const { notifyParticipantCancellation } = vi.hoisted(() => ({
  notifyParticipantCancellation: vi.fn(),
}))

// The lookup stays real, so these cases read what the database holds; only the
// call to Telegram is replaced.
vi.mock("./notify-participant-cancellation.server", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("./notify-participant-cancellation.server")
    >()
  return { ...original, notifyParticipantCancellation }
})

vi.mock("./send-application-mail.server", () => ({
  sendApplicationMail: vi.fn().mockResolvedValue({ emailSent: false }),
}))

import { updateEventParticipantById } from "~/business/admin/admin.server"
import { applyToEvent } from "./apply-to-event.server"
import { cancelApplicationToEvent } from "./cancel-application-to-event.server"

describe("cancelApplicationToEvent", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let eventId: string
  let profileId: string
  let profileEmail: string
  let participantId: string
  let counter = 0

  beforeEach(async () => {
    tracker.clear()
    counter += 1
    deleteAsaasPayment.mockReset()
    deleteAsaasPayment.mockResolvedValue(true)
    logger.error.mockClear()
    notifyParticipantCancellation.mockReset()
    notifyParticipantCancellation.mockResolvedValue(undefined)

    const event = await createTestEvent(tracker, kysely, {
      title: "Withdraw Event",
      ticket_price: 22000,
    })
    eventId = event.id

    profileEmail = `test${Date.now()}-${counter}-withdraw@example.com`
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: profileEmail,
      full_name: "Withdraw Tester",
      social_name: "Withdrawn",
      phone: 11987654321,
    })
    profileId = profile.id

    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: eventId,
        profile_id: profileId,
        spot_type: "regular",
        is_user_applied: true,
        application_status: "talking",
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
      kind: "online",
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
      kind: "online",
      status: "awaiting_payment",
      amount: 22199,
      method: "pix",
      paid_at: null,
      provider_charge_id: asaasPaymentId,
    })

    await cancelApplicationToEvent({ eventId, profileId })

    expect(deleteAsaasPayment).toHaveBeenCalledWith(asaasPaymentId)
  })

  it("refuses to withdraw a paid application and leaves it untouched", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 22000,
      base_amount: 22000,
    })

    const result = await cancelApplicationToEvent({
      eventId,
      profileId,
      reason: "Fiquei doente",
    })

    expect(result.success).toBe(false)
    expect(
      await kysely
        .selectFrom("event_participants")
        .select(["is_user_applied", "cancellation_date", "cancellation_reason"])
        .where("id", "=", participantId)
        .executeTakeFirstOrThrow(),
    ).toEqual({
      is_user_applied: true,
      cancellation_date: null,
      cancellation_reason: null,
    })
    expect(await statusOf(payment.id)).toBe("paid")
  })

  it("withdraws an application whose payment was fully refunded", async () => {
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      status: "refunded",
      amount: 22000,
      base_amount: 22000,
      refund_amount: 22000,
      refunded_at: new Date().toISOString(),
    })

    const result = await cancelApplicationToEvent({ eventId, profileId })

    expect(result.success).toBe(true)
  })

  it("withdraws the application even when Asaas refuses the delete", async () => {
    deleteAsaasPayment.mockRejectedValue(new Error("asaas is down"))
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      status: "awaiting_payment",
      amount: 22199,
      method: "pix",
      paid_at: null,
      provider_charge_id: `pay_withdraw_fail_${Date.now()}`,
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

  describe("the cancellation reason", () => {
    const registration = async () =>
      kysely
        .selectFrom("event_participants")
        .select(["is_user_applied", "cancellation_reason"])
        .where("id", "=", participantId)
        .executeTakeFirstOrThrow()

    it("saves the reason the participant gave", async () => {
      const result = await cancelApplicationToEvent({
        eventId,
        profileId,
        reason: "Vou viajar nesse fim de semana",
      })

      expect(result.success).toBe(true)
      expect(await registration()).toEqual({
        is_user_applied: false,
        cancellation_reason: "Vou viajar nesse fim de semana",
      })
    })

    it("saves no reason when none was given", async () => {
      await cancelApplicationToEvent({ eventId, profileId })

      expect((await registration()).cancellation_reason).toBeNull()
    })

    it("saves no reason when only blanks were typed", async () => {
      await cancelApplicationToEvent({ eventId, profileId, reason: "   " })

      expect((await registration()).cancellation_reason).toBeNull()
    })

    it("accepts a reason of exactly 500 characters", async () => {
      const reason = "a".repeat(500)

      await cancelApplicationToEvent({ eventId, profileId, reason })

      expect((await registration()).cancellation_reason).toBe(reason)
    })

    it("refuses a reason longer than 500 characters and keeps the application", async () => {
      const result = await cancelApplicationToEvent({
        eventId,
        profileId,
        reason: "a".repeat(501),
      })

      expect(result.success).toBe(false)
      expect(await registration()).toEqual({
        is_user_applied: true,
        cancellation_reason: null,
      })
    })

    it("is cleared when the participant applies again", async () => {
      await cancelApplicationToEvent({
        eventId,
        profileId,
        reason: "Mudei de ideia",
      })

      const result = await applyToEvent(
        {
          eventId,
          applicationDate: new Date(),
          referred: "Administração",
          bond: "Posso ir sozinhe.",
        },
        {
          supabase: getTestSupabaseClient(),
          supabaseHeaders: new Headers(),
          currentUser: { id: profileId, email: profileEmail },
          currentProfile: {
            id: profileId,
            email: profileEmail,
            full_name: "Withdraw Tester",
            basic_data_filled: true,
            created_at: new Date().toISOString(),
            is_admin: false,
          },
          isProdInDev: false,
          host: "localhost",
        } as unknown as z.infer<typeof userContextSchema>,
      )

      expect(result.success).toBe(true)
      expect(await registration()).toEqual({
        is_user_applied: true,
        cancellation_reason: null,
      })
    })
  })

  describe("the editors' Telegram notice", () => {
    it("is sent once, with what the database holds about the cancellation", async () => {
      await cancelApplicationToEvent({
        eventId,
        profileId,
        reason: "Fiquei doente",
      })

      expect(notifyParticipantCancellation).toHaveBeenCalledTimes(1)
      const [cancellation] = notifyParticipantCancellation.mock.calls[0]
      expect(cancellation).toMatchObject({
        eventId,
        eventTitle: "Withdraw Event",
        fullName: "Withdraw Tester",
        socialName: "Withdrawn",
        email: expect.stringContaining("-withdraw@example.com"),
        phone: "11987654321",
        applicationStatus: "talking",
        reason: "Fiquei doente",
        hasPaid: false,
      })
      expect(Number.isNaN(Date.parse(cancellation.cancelledAt))).toBe(false)
    })

    it("is not sent when a paid application is refused", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        amount: 22000,
        base_amount: 22000,
      })

      await cancelApplicationToEvent({ eventId, profileId })

      expect(notifyParticipantCancellation).not.toHaveBeenCalled()
    })

    it("does not flag a charge that was never paid", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "online",
        status: "pending",
        amount: null,
        method: null,
        paid_at: null,
      })

      await cancelApplicationToEvent({ eventId, profileId })

      expect(notifyParticipantCancellation).toHaveBeenCalledWith(
        expect.objectContaining({ hasPaid: false }),
      )
    })

    it("never fails the cancellation when the notice fails", async () => {
      notifyParticipantCancellation.mockRejectedValue(new Error("telegram down"))

      const result = await cancelApplicationToEvent({ eventId, profileId })

      expect(result.success).toBe(true)
      const after = await kysely
        .selectFrom("event_participants")
        .select("is_user_applied")
        .where("id", "=", participantId)
        .executeTakeFirstOrThrow()
      expect(after.is_user_applied).toBe(false)
      expect(logger.error).toHaveBeenCalled()
    })

    it("is not sent when there was no application to cancel", async () => {
      await cancelApplicationToEvent({ eventId, profileId })
      notifyParticipantCancellation.mockClear()

      await cancelApplicationToEvent({ eventId, profileId })

      expect(notifyParticipantCancellation).not.toHaveBeenCalled()
    })

    it("is not sent when an admin marks the participant as withdrawn", async () => {
      const result = await updateEventParticipantById({
        id: participantId,
        profile_id: profileId,
        intent: "update-event-participant",
        attendance_status: "withdrew",
      })

      expect(result.success).toBe(true)
      expect(notifyParticipantCancellation).not.toHaveBeenCalled()
    })
  })

  describe("once registrations have closed", () => {
    beforeEach(async () => {
      await kysely
        .updateTable("events")
        .set({ event_status: "Registration Closed" })
        .where("id", "=", eventId)
        .execute()
    })

    const appliedAndEventStatus = async () => ({
      is_user_applied: (
        await kysely
          .selectFrom("event_participants")
          .select("is_user_applied")
          .where("id", "=", participantId)
          .executeTakeFirstOrThrow()
      ).is_user_applied,
      event_status: (
        await kysely
          .selectFrom("events")
          .select("event_status")
          .where("id", "=", eventId)
          .executeTakeFirstOrThrow()
      ).event_status,
    })

    it("withdraws the application and calls off the open charge", async () => {
      const payment = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "online",
        status: "pending",
        amount: null,
        method: null,
        paid_at: null,
      })

      const result = await cancelApplicationToEvent({ eventId, profileId })

      expect(result.success).toBe(true)
      expect(await appliedAndEventStatus()).toEqual({
        is_user_applied: false,
        event_status: "Registration Closed",
      })
      expect(await statusOf(payment.id)).toBe("cancelled")
    })

    it("refuses to withdraw a paid application", async () => {
      const payment = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        amount: 22000,
        base_amount: 22000,
      })

      const result = await cancelApplicationToEvent({ eventId, profileId })

      expect(result.success).toBe(false)
      expect(await appliedAndEventStatus()).toEqual({
        is_user_applied: true,
        event_status: "Registration Closed",
      })
      expect(await statusOf(payment.id)).toBe("paid")
    })
  })
})
