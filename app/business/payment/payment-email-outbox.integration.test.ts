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

const {
  sendPaymentLinkEmail,
  sendPaymentConfirmedEmail,
  sendPaymentRefundEmail,
  logger,
} = vi.hoisted(() => ({
  sendPaymentLinkEmail: vi.fn(),
  sendPaymentConfirmedEmail: vi.fn(),
  sendPaymentRefundEmail: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("./payment-emails.server", () => ({
  sendPaymentLinkEmail,
  sendPaymentConfirmedEmail,
  sendPaymentRefundEmail,
}))
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

import { kyselyDb } from "~/kysely-db"
import {
  deliverPaymentEmail,
  queuePaymentEmail,
  sweepPaymentEmails,
} from "./payment-email-outbox.server"

describe("payment email outbox", () => {
  const { tracker, kysely } = setupIntegrationTest()

  let participantId: string

  beforeEach(async () => {
    sendPaymentLinkEmail.mockClear().mockResolvedValue({ success: true })
    sendPaymentConfirmedEmail.mockClear().mockResolvedValue({ success: true })
    sendPaymentRefundEmail.mockClear().mockResolvedValue({ success: true })
    logger.error.mockClear()

    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `outbox-${Date.now()}@example.com`,
    })
    const event = await createTestEvent(tracker, kysely, {
      title: "Outbox Event",
    })
    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: event.id,
      profile_id: profile.id,
    })
    participantId = participant.id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  async function paidPayment() {
    return createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
    })
  }

  async function openPayment() {
    return createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      amount: null,
      method: null,
      paid_at: null,
    })
  }

  function readRow(id: string) {
    return kysely
      .selectFrom("payment_emails")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow()
  }

  /** Backdates a row so the sweep considers it overdue. */
  async function age(id: string, minutes: number) {
    await kysely
      .updateTable("payment_emails")
      .set({
        created_at: new Date(Date.now() - minutes * 60 * 1000).toISOString(),
      })
      .where("id", "=", id)
      .execute()
  }

  describe("queuePaymentEmail", () => {
    it("writes a row that still owes its send", async () => {
      const payment = await paidPayment()

      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })

      const row = await readRow(id)
      expect(row.payment_id).toBe(payment.id)
      expect(row.kind).toBe("confirmation")
      expect(row.sent_at).toBeNull()
      expect(row.attempts).toBe(0)
    })
  })

  describe("deliverPaymentEmail", () => {
    it("sends the email its kind names and stamps the row", async () => {
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })

      const result = await deliverPaymentEmail(id)

      expect(result.sent).toBe(true)
      expect(sendPaymentConfirmedEmail).toHaveBeenCalledWith({
        paymentId: payment.id,
      })
      const row = await readRow(id)
      expect(row.sent_at).not.toBeNull()
      expect(row.attempts).toBe(1)
      expect(row.last_error).toBeNull()
    })

    it("routes a refund row to the refund email", async () => {
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "refund",
      })

      await deliverPaymentEmail(id)

      expect(sendPaymentRefundEmail).toHaveBeenCalledWith({
        paymentId: payment.id,
      })
      expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
    })

    it("leaves the row owed when the send does not succeed", async () => {
      sendPaymentConfirmedEmail.mockResolvedValue({ success: false })
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })

      const result = await deliverPaymentEmail(id)

      expect(result.sent).toBe(false)
      expect(result.claimed).toBe(true)
      const row = await readRow(id)
      expect(row.sent_at).toBeNull()
      expect(row.attempts).toBe(1)
      expect(row.last_error).not.toBeNull()
    })

    it("records the reason when the sender throws", async () => {
      sendPaymentConfirmedEmail.mockRejectedValue(new Error("smtp is down"))
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })

      const result = await deliverPaymentEmail(id)

      expect(result.sent).toBe(false)
      const row = await readRow(id)
      expect(row.sent_at).toBeNull()
      expect(row.last_error).toContain("smtp is down")
    })

    it("sends once when two deliveries race for the same row", async () => {
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })

      const results = await Promise.all([
        deliverPaymentEmail(id),
        deliverPaymentEmail(id),
      ])

      expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1)
      expect(results.filter((result) => result.sent)).toHaveLength(1)
      expect((await readRow(id)).attempts).toBe(1)
    })

    it("takes a row back once the claim on it has expired", async () => {
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      // What a sender killed mid-flight leaves behind: claimed, never sent.
      await kysely
        .updateTable("payment_emails")
        .set({ claimed_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() })
        .where("id", "=", id)
        .execute()

      const result = await deliverPaymentEmail(id)

      expect(result.sent).toBe(true)
      expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1)
    })

    it("leaves a row a live claim still covers", async () => {
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      await kysely
        .updateTable("payment_emails")
        .set({ claimed_at: new Date().toISOString() })
        .where("id", "=", id)
        .execute()

      const result = await deliverPaymentEmail(id)

      expect(result.sent).toBe(false)
      // Not the same as a send that failed: nobody tried, because somebody
      // else is already trying.
      expect(result.claimed).toBe(false)
      expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
    })

    it("does not send a row that already went out", async () => {
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      await deliverPaymentEmail(id)
      sendPaymentConfirmedEmail.mockClear()

      const result = await deliverPaymentEmail(id)

      expect(result.sent).toBe(false)
      expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
    })
  })

  describe("sweepPaymentEmails", () => {
    it("delivers a row whose send never happened", async () => {
      sendPaymentConfirmedEmail.mockResolvedValueOnce({ success: false })
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      await deliverPaymentEmail(id)
      expect((await readRow(id)).sent_at).toBeNull()

      await age(id, 15)
      const stats = await sweepPaymentEmails()

      expect(stats).toEqual({ processed: 1, sent: 1, failed: 0, skipped: 0 })
      expect((await readRow(id)).sent_at).not.toBeNull()
      expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(2)
    })

    it("counts a row somebody else is sending as skipped, not failed", async () => {
      sendPaymentConfirmedEmail.mockResolvedValueOnce({ success: false })
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      await deliverPaymentEmail(id)
      await age(id, 15)
      // The window the sweep cannot see: selected as a candidate, then claimed
      // by an admin hitting resend before the sweep reaches it.
      await kysely
        .updateTable("payment_emails")
        .set({ claimed_at: new Date().toISOString() })
        .where("id", "=", id)
        .execute()

      const stats = await sweepPaymentEmails()

      expect(stats.failed).toBe(0)
      expect((await readRow(id)).sent_at).toBeNull()
    })

    it("leaves a row that already went out alone", async () => {
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      await deliverPaymentEmail(id)
      const sentAt = (await readRow(id)).sent_at
      sendPaymentConfirmedEmail.mockClear()

      await age(id, 15)
      await sweepPaymentEmails()

      expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
      expect((await readRow(id)).sent_at).toStrictEqual(sentAt)
    })

    it("gives a fresh row time to be sent the normal way", async () => {
      const payment = await paidPayment()
      await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })

      const stats = await sweepPaymentEmails()

      expect(stats.processed).toBe(0)
      expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
    })

    it("does not send a link for a charge that is no longer open", async () => {
      const payment = await openPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "link",
      })
      await kysely
        .updateTable("payments")
        .set({ status: "cancelled" })
        .where("id", "=", payment.id)
        .execute()

      await age(id, 15)
      const stats = await sweepPaymentEmails()

      expect(stats.processed).toBe(0)
      expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
      const row = await readRow(id)
      expect(row.sent_at).toBeNull()
      expect(row.attempts).toBe(0)
    })

    it("still sends a link for a charge that is open", async () => {
      const payment = await openPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "link",
      })

      await age(id, 15)
      const stats = await sweepPaymentEmails()

      expect(stats.sent).toBe(1)
      expect(sendPaymentLinkEmail).toHaveBeenCalledWith({
        paymentId: payment.id,
      })
    })
  })
})
