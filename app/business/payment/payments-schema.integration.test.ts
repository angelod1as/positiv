import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { sql } from "kysely"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestPayment,
  createTestProfile,
} from "~/test/db-test-utils"

describe("payments schema", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string
  let otherParticipantId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Payments Schema Event",
      ticket_price: 22000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-payments@example.com`,
      full_name: "Payments Tester",
    })
    const other = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-payments-2@example.com`,
      full_name: "Payments Tester Two",
    })
    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profile.id,
      })
    ).id
    otherParticipantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: other.id,
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  describe("constraints", () => {
    it("refuses a paid row without an amount", async () => {
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          status: "paid",
          amount: null,
        }),
      ).rejects.toThrow(/payments_paid_shape/)
    })

    it("refuses a pending row that carries a paid timestamp", async () => {
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          status: "pending",
          amount: null,
          paid_at: new Date().toISOString(),
        }),
      ).rejects.toThrow(/payments_paid_shape/)
    })

    it("refuses a partial refund that is not smaller than the amount", async () => {
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          status: "partially_refunded",
          amount: 22000,
          refund_amount: 22000,
          refunded_at: new Date().toISOString(),
        }),
      ).rejects.toThrow(/payments_partial_is_partial/)
    })

    it("refuses a refund larger than the amount", async () => {
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          status: "refunded",
          amount: 22000,
          refund_amount: 30000,
          refunded_at: new Date().toISOString(),
        }),
      ).rejects.toThrow(/payments_refund_bounded/)
    })

    it("refuses a manual row carrying an Asaas payment id", async () => {
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          kind: "manual",
          asaas_payment_id: "pay_1",
        }),
      ).rejects.toThrow(/payments_manual_shape/)
    })

    it("refuses installments on anything but a card", async () => {
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          kind: "asaas",
          method: "pix",
          installment_count: 3,
        }),
      ).rejects.toThrow(/payments_installments_only_on_card/)
    })

    it("refuses a second open charge for the same participant", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        status: "pending",
        amount: null,
        method: null,
        paid_at: null,
      })

      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          kind: "asaas",
          status: "awaiting_payment",
          amount: null,
          method: null,
          paid_at: null,
        }),
      ).rejects.toThrow(/payments_one_active_per_participant/)
    })

    it("allows a new charge once the previous one is cancelled", async () => {
      const first = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        status: "pending",
        amount: null,
        method: null,
        paid_at: null,
      })

      await kysely
        .updateTable("payments")
        .set({ status: "cancelled" })
        .where("id", "=", first.id)
        .execute()

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

    it("allows several paid rows for the same participant", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        amount: 11000,
      })
      await expect(
        createTestPayment(tracker, kysely, {
          event_participant_id: participantId,
          amount: 11000,
        }),
      ).resolves.toBeDefined()
    })

    it("refuses deleting a participant that has a payment", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
      })

      await expect(
        kysely.deleteFrom("event_participants").where("id", "=", participantId).execute(),
      ).rejects.toThrow()
    })
  })

  describe("updated_at trigger", () => {
    it("moves updated_at on every update", async () => {
      const payment = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
      })

      const after = await kysely
        .updateTable("payments")
        .set({ note: "touched" })
        .where("id", "=", payment.id)
        .returning(["updated_at"])
        .executeTakeFirstOrThrow()

      expect(new Date(after.updated_at).getTime()).toBeGreaterThan(
        new Date(payment.updated_at).getTime(),
      )
    })
  })

  describe("event_participant_payments view", () => {
    it("reports zeros for a participant with no payments", async () => {
      const row = await kysely
        .selectFrom("event_participant_payments")
        .selectAll()
        .where("event_participant_id", "=", otherParticipantId)
        .executeTakeFirstOrThrow()

      expect(row).toMatchObject({
        paid_gross: 0,
        refunded: 0,
        fee: 0,
        net: 0,
        has_paid: false,
        current_status: null,
        active_payment_id: null,
      })
    })

    it("splits gross, fee and net for an Asaas payment", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        method: "credit_card",
        installment_count: 3,
        base_amount: 22000,
        amount: 23454,
        asaas_net: 22010,
      })

      const row = await kysely
        .selectFrom("event_participant_payments")
        .selectAll()
        .where("event_participant_id", "=", participantId)
        .executeTakeFirstOrThrow()

      expect(row.paid_gross).toBe(23454)
      expect(row.fee).toBe(1444)
      expect(row.net).toBe(22010)
      expect(row.has_paid).toBe(true)
      expect(row.current_status).toBe("paid")
    })

    it("treats a manual payment as fee-free", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "manual",
        method: "pix",
        amount: 22000,
      })

      const row = await kysely
        .selectFrom("event_participant_payments")
        .selectAll()
        .where("event_participant_id", "=", participantId)
        .executeTakeFirstOrThrow()

      expect(row.fee).toBe(0)
      expect(row.net).toBe(22000)
    })

    it("deducts a refund from net and keeps it in gross", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "manual",
        method: "pix",
        amount: 22000,
        status: "partially_refunded",
        refund_amount: 5000,
        refunded_at: new Date().toISOString(),
      })

      const row = await kysely
        .selectFrom("event_participant_payments")
        .selectAll()
        .where("event_participant_id", "=", participantId)
        .executeTakeFirstOrThrow()

      expect(row.paid_gross).toBe(22000)
      expect(row.refunded).toBe(5000)
      expect(row.net).toBe(17000)
      expect(row.has_paid).toBe(true)
    })

    it("sums several payments", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        amount: 11000,
      })
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        amount: 11000,
      })

      const row = await kysely
        .selectFrom("event_participant_payments")
        .selectAll()
        .where("event_participant_id", "=", participantId)
        .executeTakeFirstOrThrow()

      expect(row.paid_gross).toBe(22000)
      expect(row.net).toBe(22000)
    })

    it("prefers the open charge when reporting the current status", async () => {
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        status: "expired",
        amount: null,
        paid_at: null,
        method: null,
        kind: "asaas",
      })
      const active = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        status: "pending",
        amount: null,
        paid_at: null,
        method: null,
        kind: "asaas",
      })

      const row = await kysely
        .selectFrom("event_participant_payments")
        .selectAll()
        .where("event_participant_id", "=", participantId)
        .executeTakeFirstOrThrow()

      expect(row.current_status).toBe("pending")
      expect(row.active_payment_id).toBe(active.id)
    })
  })

  describe("expiry statement", () => {
    it("expires an overdue open charge and leaves everything else alone", async () => {
      const overdue = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        status: "pending",
        amount: null,
        method: null,
        paid_at: null,
        due_at: new Date(Date.now() - 60_000).toISOString(),
      })
      const paid = await createTestPayment(tracker, kysely, {
        event_participant_id: otherParticipantId,
        due_at: new Date(Date.now() - 60_000).toISOString(),
      })

      await sql`
        UPDATE public.payments
           SET status = 'expired'
         WHERE status IN ('pending', 'awaiting_payment')
           AND due_at < now()
      `.execute(kysely)

      const after = await kysely
        .selectFrom("payments")
        .select(["id", "status"])
        .where("id", "in", [overdue.id, paid.id])
        .execute()

      expect(after.find((r) => r.id === overdue.id)?.status).toBe("expired")
      expect(after.find((r) => r.id === paid.id)?.status).toBe("paid")
    })
  })
})
