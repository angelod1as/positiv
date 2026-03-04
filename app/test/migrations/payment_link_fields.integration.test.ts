import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import {
  createTestProfile,
  createTestEvent,
  createTestEventParticipant,
  createTestPaymentTransaction,
} from "~/test/db-test-utils"

describe("event_participants payment link fields - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  async function createTestData(emailSuffix: string) {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `payment-link-${emailSuffix}@example.com`,
    })

    const event = await createTestEvent(tracker, kysely, {
      title: `Payment Link Test ${emailSuffix}`,
    })

    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: profile.id,
    })

    return { profile, event, participant }
  }

  it("should have payment_link_token column that is nullable", async () => {
    const { participant } = await createTestData("token-null")

    const result = await kysely
      .selectFrom("event_participants")
      .select("payment_link_token")
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(result.payment_link_token).toBeNull()
  })

  it("should store and retrieve payment_link_token", async () => {
    const { participant } = await createTestData("token-set")

    const updated = await kysely
      .updateTable("event_participants")
      .set({ payment_link_token: "test-token-abc123" })
      .where("id", "=", participant.id)
      .returningAll()
      .executeTakeFirstOrThrow()

    expect(updated.payment_link_token).toBe("test-token-abc123")
  })

  it("should enforce unique constraint on payment_link_token", async () => {
    const { participant: p1 } = await createTestData("unique1")
    const { participant: p2 } = await createTestData("unique2")

    await kysely
      .updateTable("event_participants")
      .set({ payment_link_token: "duplicate-token" })
      .where("id", "=", p1.id)
      .execute()

    await expect(
      kysely
        .updateTable("event_participants")
        .set({ payment_link_token: "duplicate-token" })
        .where("id", "=", p2.id)
        .execute()
    ).rejects.toThrow()
  })

  it("should have payment_link_generated_at column that is nullable", async () => {
    const { participant } = await createTestData("generated-null")

    const result = await kysely
      .selectFrom("event_participants")
      .select("payment_link_generated_at")
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(result.payment_link_generated_at).toBeNull()
  })

  it("should store and retrieve payment_link_generated_at", async () => {
    const { participant } = await createTestData("generated-set")
    const now = new Date()

    const updated = await kysely
      .updateTable("event_participants")
      .set({ payment_link_generated_at: now.toISOString() })
      .where("id", "=", participant.id)
      .returningAll()
      .executeTakeFirstOrThrow()

    expect(updated.payment_link_generated_at).not.toBeNull()
    const storedTime = new Date(String(updated.payment_link_generated_at)).getTime()
    expect(Math.abs(storedTime - now.getTime())).toBeLessThan(1000)
  })

  it("should have payment_link_expires_at column that is nullable", async () => {
    const { participant } = await createTestData("expires-null")

    const result = await kysely
      .selectFrom("event_participants")
      .select("payment_link_expires_at")
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(result.payment_link_expires_at).toBeNull()
  })

  it("should store and retrieve payment_link_expires_at", async () => {
    const { participant } = await createTestData("expires-set")
    const future = new Date(Date.now() + 86400000)

    const updated = await kysely
      .updateTable("event_participants")
      .set({ payment_link_expires_at: future.toISOString() })
      .where("id", "=", participant.id)
      .returningAll()
      .executeTakeFirstOrThrow()

    expect(updated.payment_link_expires_at).not.toBeNull()
    const storedTime = new Date(String(updated.payment_link_expires_at)).getTime()
    expect(Math.abs(storedTime - future.getTime())).toBeLessThan(1000)
  })

  it("should have payment_transaction_id column that is nullable", async () => {
    const { participant } = await createTestData("txid-null")

    const result = await kysely
      .selectFrom("event_participants")
      .select("payment_transaction_id")
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(result.payment_transaction_id).toBeNull()
  })

  it("should link payment_transaction_id to a valid payment_transactions record", async () => {
    const { profile, event, participant } = await createTestData("txid-link")

    const transaction = await createTestPaymentTransaction(tracker, kysely, {
      event_participant_id: participant.id,
      profile_id: profile.id,
      event_id: event.id,
      asaas_payment_id: "pay_link_test",
    })

    const updated = await kysely
      .updateTable("event_participants")
      .set({ payment_transaction_id: transaction.id })
      .where("id", "=", participant.id)
      .returningAll()
      .executeTakeFirstOrThrow()

    expect(updated.payment_transaction_id).toBe(transaction.id)
  })

  it("should SET NULL on payment_transaction_id when referenced transaction is deleted", async () => {
    const { profile, event, participant } = await createTestData("txid-setnull")

    const transaction = await createTestPaymentTransaction(tracker, kysely, {
      event_participant_id: participant.id,
      profile_id: profile.id,
      event_id: event.id,
      asaas_payment_id: "pay_setnull_test",
    })

    await kysely
      .updateTable("event_participants")
      .set({ payment_transaction_id: transaction.id })
      .where("id", "=", participant.id)
      .execute()

    await kysely
      .deleteFrom("payment_transactions")
      .where("id", "=", transaction.id)
      .execute()

    const result = await kysely
      .selectFrom("event_participants")
      .select("payment_transaction_id")
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(result.payment_transaction_id).toBeNull()
  })

  it("should not affect existing event_participants columns", async () => {
    const { participant } = await createTestData("backward-compat")

    const result = await kysely
      .selectFrom("event_participants")
      .select(["id", "payment", "application_status", "application_date"])
      .where("id", "=", participant.id)
      .executeTakeFirstOrThrow()

    expect(result.id).toBe(participant.id)
    expect(result.payment).toBeDefined()
    expect(result.application_status).toBeDefined()
    expect(result.application_date).toBeDefined()
  })
})
