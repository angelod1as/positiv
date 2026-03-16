import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import {
  createTestProfile,
  createTestEvent,
  createTestEventParticipant,
  createTestPaymentRequest,
} from "~/test/db-test-utils"
import {
  getActivePaymentRequest,
  markPaymentAsExpired,
} from "./payment-request.server"

describe("payment-request - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  async function setupParticipant(overrides?: { ticketPrice?: number }) {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `payment-test-${Date.now()}@test.com`,
      full_name: "Test Participant",
      cpf: "12345678900",
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Payment Event",
      ticket_price: overrides?.ticketPrice ?? 220,
    })

    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
    })

    return { profile, event, participant }
  }

  describe("createPaymentRequest", () => {
    it("creates a payment request row with correct fields", async () => {
      const { participant } = await setupParticipant()

      const request = await createTestPaymentRequest(tracker, kysely, {
        event_participant_id: participant.id,
        amount: 220,
        expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      })

      expect(request.id).toBeDefined()
      expect(request.event_participant_id).toBe(participant.id)
      expect(Number(request.amount)).toBe(220)
      expect(request.status).toBe("pending")
      expect(request.asaas_payment_id).toBeNull()
      expect(request.asaas_customer_id).toBeNull()
    })
  })

  describe("getActivePaymentRequest", () => {
    it("returns active (non-expired, non-cancelled) request", async () => {
      const { participant } = await setupParticipant()

      const request = await createTestPaymentRequest(tracker, kysely, {
        event_participant_id: participant.id,
        amount: 220,
        expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
      })

      const active = await getActivePaymentRequest(participant.id)

      expect(active).not.toBeNull()
      expect(active?.id).toBe(request.id)
    })

    it("returns null for expired requests", async () => {
      const { participant } = await setupParticipant()

      await createTestPaymentRequest(tracker, kysely, {
        event_participant_id: participant.id,
        amount: 220,
        expires_at: new Date(Date.now() - 1000).toISOString(),
        status: "pending",
      })

      const active = await getActivePaymentRequest(participant.id)

      expect(active).toBeNull()
    })

    it("returns null for cancelled requests", async () => {
      const { participant } = await setupParticipant()

      await createTestPaymentRequest(tracker, kysely, {
        event_participant_id: participant.id,
        amount: 220,
        expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "cancelled",
      })

      const active = await getActivePaymentRequest(participant.id)

      expect(active).toBeNull()
    })
  })

  describe("markPaymentAsExpired", () => {
    it("updates status to expired", async () => {
      const { participant } = await setupParticipant()

      const request = await createTestPaymentRequest(tracker, kysely, {
        event_participant_id: participant.id,
        amount: 220,
        expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
      })

      await markPaymentAsExpired(request.id)

      const updated = await kysely
        .selectFrom("payment_requests")
        .selectAll()
        .where("id", "=", request.id)
        .executeTakeFirstOrThrow()

      expect(updated.status).toBe("expired")
    })
  })

  describe("payment request with profile join", () => {
    it("can join payment_requests with event_participants and profiles", async () => {
      const { participant } = await setupParticipant()

      await createTestPaymentRequest(tracker, kysely, {
        event_participant_id: participant.id,
        amount: 220,
        expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      })

      const result = await kysely
        .selectFrom("payment_requests")
        .innerJoin(
          "event_participants",
          "event_participants.id",
          "payment_requests.event_participant_id",
        )
        .innerJoin("profiles", "profiles.id", "event_participants.profile_id")
        .innerJoin("events", "events.id", "event_participants.event_id")
        .select([
          "payment_requests.id",
          "payment_requests.amount",
          "payment_requests.status",
          "profiles.full_name",
          "profiles.cpf",
          "profiles.email",
          "events.title",
          "events.ticket_price",
        ])
        .where("payment_requests.event_participant_id", "=", participant.id)
        .executeTakeFirstOrThrow()

      expect(result.full_name).toBe("Test Participant")
      expect(result.cpf).toBe("12345678900")
      expect(result.email).toContain("payment-test-")
      expect(result.title).toBe("Test Payment Event")
      expect(Number(result.ticket_price)).toBe(220)
      expect(Number(result.amount)).toBe(220)
    })
  })
})
