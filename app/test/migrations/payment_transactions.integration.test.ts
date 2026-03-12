import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { sql } from "kysely"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import {
  createTestProfile,
  createTestEvent,
  createTestEventParticipant,
  createTestPaymentTransaction,
} from "~/test/db-test-utils"

describe("payment_transactions table - Integration Tests", () => {
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
      email: `payment-test-${emailSuffix}@example.com`,
    })

    const event = await createTestEvent(tracker, kysely, {
      title: `Payment Test Event ${emailSuffix}`,
    })

    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: profile.id,
    })

    return { profile, event, participant }
  }

  it("should have payment_transactions table", async () => {
    const result = await kysely
      .selectFrom("payment_transactions")
      .selectAll()
      .execute()

    expect(Array.isArray(result)).toBe(true)
  })

  it("should create transaction with complete Asaas data", async () => {
    const { profile, event, participant } = await createTestData("create")

    const asaasPaymentData = {
      id: "pay_test123",
      customer: "cus_test456",
      billingType: "CREDIT_CARD",
      value: 227,
      netValue: 219.45,
      status: "CONFIRMED",
      installmentCount: 3,
      installmentValue: 75.67,
      creditCard: {
        creditCardNumber: "8829",
        creditCardBrand: "MASTERCARD",
      },
      confirmedDate: "2026-02-12",
      invoiceUrl: "https://example.com/invoice",
    }

    const transaction = await createTestPaymentTransaction(tracker, kysely, {
      event_participant_id: participant.id,
      profile_id: profile.id,
      event_id: event.id,
      asaas_payment_id: "pay_test123",
      asaas_customer_id: "cus_test456",
      asaas_payment_data: asaasPaymentData,
      payment_method: "credit_card",
      amount: 22_700,
      installments: 3,
      status: "pending",
    })

    expect(transaction.id).toBeDefined()
    expect(transaction.asaas_payment_id).toBe("pay_test123")
    expect(transaction.asaas_customer_id).toBe("cus_test456")
    expect(transaction.payment_method).toBe("credit_card")
    expect(transaction.amount).toBe("22700.00")
    expect(transaction.installments).toBe(3)
    expect(transaction.status).toBe("pending")
    expect(transaction.event_id).toBe(event.id)
    expect(transaction.created_at).toBeDefined()
    expect(transaction.updated_at).toBeDefined()
  })

  it("should enforce unique constraint on asaas_payment_id", async () => {
    const { profile, event, participant } = await createTestData("unique")

    await createTestPaymentTransaction(tracker, kysely, {
      event_participant_id: participant.id,
      profile_id: profile.id,
      event_id: event.id,
      asaas_payment_id: "pay_unique123",
      asaas_customer_id: "cus_test789",
    })

    await expect(
      kysely
        .insertInto("payment_transactions")
        .values({
          event_participant_id: participant.id,
          profile_id: profile.id,
          event_id: event.id,
          asaas_payment_id: "pay_unique123",
          asaas_customer_id: "cus_test789",
          asaas_payment_data: { id: "pay_unique123" },
          payment_method: "pix",
          amount: 22_000,
          status: "pending",
        })
        .execute()
    ).rejects.toThrow()
  })

  it("should enforce payment_method check constraint", async () => {
    const { profile, event, participant } = await createTestData("method")

    await expect(
      kysely
        .insertInto("payment_transactions")
        .values({
          event_participant_id: participant.id,
          profile_id: profile.id,
          event_id: event.id,
          asaas_payment_id: "pay_method456",
          asaas_customer_id: "cus_test999",
          asaas_payment_data: { id: "pay_method456" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payment_method: "invalid_method" as any,
          amount: 22_000,
          status: "pending",
        })
        .execute()
    ).rejects.toThrow()
  })

  it("should enforce status check constraint", async () => {
    const { profile, event, participant } = await createTestData("status")

    await expect(
      kysely
        .insertInto("payment_transactions")
        .values({
          event_participant_id: participant.id,
          profile_id: profile.id,
          event_id: event.id,
          asaas_payment_id: "pay_status789",
          asaas_customer_id: "cus_test888",
          asaas_payment_data: { id: "pay_status789" },
          payment_method: "pix",
          amount: 22_000,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: "invalid_status" as any,
        })
        .execute()
    ).rejects.toThrow()
  })

  it("should RESTRICT deletion of participant with payment transactions", async () => {
    const { profile, event, participant } = await createTestData("restrict-participant")

    await createTestPaymentTransaction(tracker, kysely, {
      event_participant_id: participant.id,
      profile_id: profile.id,
      event_id: event.id,
      asaas_payment_id: "pay_restrict_participant_test",
    })

    await expect(
      kysely.deleteFrom("event_participants").where("id", "=", participant.id).execute()
    ).rejects.toThrow()
  })

  it("should RESTRICT deletion of profile with payment transactions", async () => {
    const { profile, event, participant } = await createTestData("restrict")

    await createTestPaymentTransaction(tracker, kysely, {
      event_participant_id: participant.id,
      profile_id: profile.id,
      event_id: event.id,
      asaas_payment_id: "pay_restrict_test",
    })

    // Should fail: profile has payment transactions (ON DELETE RESTRICT)
    await expect(
      kysely.deleteFrom("profiles").where("id", "=", profile.id).execute()
    ).rejects.toThrow()
  })

  it("should RESTRICT deletion of event with payment transactions", async () => {
    const { profile, event, participant } = await createTestData("restrict-event")

    await createTestPaymentTransaction(tracker, kysely, {
      event_participant_id: participant.id,
      profile_id: profile.id,
      event_id: event.id,
      asaas_payment_id: "pay_restrict_event_test",
    })

    await expect(
      kysely.deleteFrom("events").where("id", "=", event.id).execute()
    ).rejects.toThrow()
  })

  it("should store and query JSONB data", async () => {
    const { profile, event, participant } = await createTestData("jsonb")

    const asaasPaymentData = {
      id: "pay_jsonb123",
      customer: "cus_jsonb456",
      billingType: "CREDIT_CARD",
      creditCard: {
        creditCardBrand: "VISA",
        creditCardNumber: "1234",
      },
    }

    await createTestPaymentTransaction(tracker, kysely, {
      event_participant_id: participant.id,
      profile_id: profile.id,
      event_id: event.id,
      asaas_payment_id: "pay_jsonb123",
      asaas_customer_id: "cus_jsonb456",
      asaas_payment_data: asaasPaymentData,
      payment_method: "credit_card",
      amount: 22_700,
    })

    const result = await kysely
      .selectFrom("payment_transactions")
      .select([
        "asaas_payment_id",
        sql<string>`asaas_payment_data->'creditCard'->>'creditCardBrand'`.as("card_brand"),
      ])
      .where("asaas_payment_id", "=", "pay_jsonb123")
      .executeTakeFirstOrThrow()

    expect(result.card_brand).toBe("VISA")
  })

  it("should auto-update updated_at timestamp on modification", async () => {
    const { profile, event, participant } = await createTestData("timestamp")

    const transaction = await createTestPaymentTransaction(tracker, kysely, {
      event_participant_id: participant.id,
      profile_id: profile.id,
      event_id: event.id,
      asaas_payment_id: "pay_timestamp123",
      asaas_customer_id: "cus_timestamp456",
    })

    const originalUpdatedAt = transaction.updated_at

    await new Promise((resolve) => setTimeout(resolve, 100))

    const updated = await kysely
      .updateTable("payment_transactions")
      .set({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .where("id", "=", transaction.id)
      .returningAll()
      .executeTakeFirstOrThrow()

    expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(
      new Date(originalUpdatedAt).getTime()
    )
  })

  it("should allow all valid payment methods", async () => {
    const methods = ["pix", "credit_card", "boleto"] as const

    for (const method of methods) {
      const { profile, event, participant } = await createTestData(`pm-${method}`)

      const transaction = await createTestPaymentTransaction(tracker, kysely, {
        event_participant_id: participant.id,
        profile_id: profile.id,
        event_id: event.id,
        asaas_payment_id: `pay_${method}_test`,
        asaas_customer_id: `cus_${method}_test`,
        asaas_payment_data: { id: `pay_${method}_test`, billingType: method.toUpperCase() },
        payment_method: method,
      })

      expect(transaction.payment_method).toBe(method)
    }
  })

  it("should allow NULL installments for pix and boleto", async () => {
    const { profile, event, participant } = await createTestData("null-installments")

    for (const [method, payId] of [
      ["pix", "pay_null_inst_pix"],
      ["boleto", "pay_null_inst_boleto"],
    ] as const) {
      const tx = await createTestPaymentTransaction(tracker, kysely, {
        event_participant_id: participant.id,
        profile_id: profile.id,
        event_id: event.id,
        asaas_payment_id: payId,
        payment_method: method,
        installments: null,
      })

      expect(tx.installments).toBeNull()
    }
  })

  it("should accept created_by referencing a valid profile", async () => {
    const { profile, event, participant } = await createTestData("createdby")

    const adminProfile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "admin-createdby@example.com",
    })

    const transaction = await createTestPaymentTransaction(tracker, kysely, {
      event_participant_id: participant.id,
      profile_id: profile.id,
      event_id: event.id,
      asaas_payment_id: "pay_createdby_test",
      created_by: adminProfile.id,
    })

    expect(transaction.created_by).toBe(adminProfile.id)
  })

  it("should enforce refund_reason is required when status is refunded", async () => {
    const { profile, event, participant } = await createTestData("refund-check")

    // Insert a pending transaction
    const transaction = await createTestPaymentTransaction(tracker, kysely, {
      event_participant_id: participant.id,
      profile_id: profile.id,
      event_id: event.id,
      asaas_payment_id: "pay_refund_check",
    })

    // Should fail: setting status to 'refunded' without refund_reason
    await expect(
      kysely
        .updateTable("payment_transactions")
        .set({ status: "refunded" })
        .where("id", "=", transaction.id)
        .execute()
    ).rejects.toThrow()

    // Should succeed: setting status to 'refunded' with refund_reason
    const refunded = await kysely
      .updateTable("payment_transactions")
      .set({
        status: "refunded",
        refund_reason: "Customer requested cancellation",
        refunded_at: new Date().toISOString(),
      })
      .where("id", "=", transaction.id)
      .returningAll()
      .executeTakeFirstOrThrow()

    expect(refunded.status).toBe("refunded")
    expect(refunded.refund_reason).toBe("Customer requested cancellation")
    expect(refunded.refunded_at).toBeDefined()
  })

  it("should allow all valid statuses", async () => {
    const { profile, event, participant } = await createTestData("statuses")

    const transaction = await createTestPaymentTransaction(tracker, kysely, {
      event_participant_id: participant.id,
      profile_id: profile.id,
      event_id: event.id,
      asaas_payment_id: "pay_status_lifecycle",
      asaas_customer_id: "cus_status_test",
    })

    for (const status of ["confirmed", "failed", "refunded"] as const) {
      const updated = await kysely
        .updateTable("payment_transactions")
        .set(
          status === "refunded"
            ? { status, refund_reason: "Test refund reason" }
            : { status },
        )
        .where("id", "=", transaction.id)
        .returningAll()
        .executeTakeFirstOrThrow()

      expect(updated.status).toBe(status)
    }
  })
})
