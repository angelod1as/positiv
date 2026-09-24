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
    logger.warn.mockClear()

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

  /** Lets the wait a failed send left on a row run out. */
  async function waitOut(id: string) {
    await kysely
      .updateTable("payment_emails")
      .set({ next_attempt_at: new Date(Date.now() - 1000).toISOString() })
      .where("id", "=", id)
      .execute()
  }

  function minutesUntil(timestamp: string | null) {
    if (!timestamp) return null
    return (new Date(timestamp).getTime() - Date.now()) / 60_000
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

    it("waits longer before each attempt after a failure", async () => {
      sendPaymentConfirmedEmail.mockResolvedValue({ success: false })
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })

      await deliverPaymentEmail(id)
      const afterFirst = minutesUntil((await readRow(id)).next_attempt_at)
      await deliverPaymentEmail(id)
      const afterSecond = minutesUntil((await readRow(id)).next_attempt_at)

      expect(afterFirst).toBeCloseTo(15, 0)
      expect(afterSecond).toBeCloseTo(30, 0)
    })

    it("gives a row up after its fifth failed attempt", async () => {
      sendPaymentConfirmedEmail.mockResolvedValue({ success: false })
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      await kysely
        .updateTable("payment_emails")
        .set({ attempts: 4 })
        .where("id", "=", id)
        .execute()

      await deliverPaymentEmail(id)

      const row = await readRow(id)
      expect(row.attempts).toBe(5)
      expect(row.given_up_at).not.toBeNull()
      expect(row.sent_at).toBeNull()
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("given up"),
        expect.objectContaining({ paymentEmailId: id }),
      )
    })

    // Telegram hears every error. A failure that will be tried again is not
    // yet something a person has to act on, and alerting on each one is the
    // every-five-minutes noise the cap exists to end.
    it("only warns about a failure it will try again", async () => {
      sendPaymentConfirmedEmail.mockResolvedValue({ success: false })
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })

      await deliverPaymentEmail(id)

      expect((await readRow(id)).given_up_at).toBeNull()
      expect(logger.error).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledTimes(1)
    })

    it("does not claim a row it has given up on", async () => {
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      await kysely
        .updateTable("payment_emails")
        .set({ given_up_at: new Date().toISOString() })
        .where("id", "=", id)
        .execute()

      const result = await deliverPaymentEmail(id)

      expect(result.claimed).toBe(false)
      expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
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
        .set({
          claimed_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        })
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

    // A send that hangs past the lease lets the sweep re-claim the row, and
    // the slow attempt then finishes on a claim that is no longer its own.
    // Whatever it writes must not land on the claim that replaced it.
    it("does not release a claim that replaced its own", async () => {
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      const stealClaim = async () => {
        await kysely
          .updateTable("payment_emails")
          .set({ claimed_at: new Date().toISOString() })
          .where("id", "=", id)
          .execute()
        throw new Error("smtp timed out")
      }
      sendPaymentConfirmedEmail.mockImplementation(stealClaim)

      await deliverPaymentEmail(id)

      // The claim the sweep took is still held, so nothing else may send.
      expect((await readRow(id)).claimed_at).not.toBeNull()
    })

    // Once the email has left, the row is no longer owed, whoever holds the
    // claim now. Leaving sent_at null would let the sweep send it yet again if
    // the claim that replaced this one then fails.
    it("records a send on a claim that was taken over, and says it may be a second one", async () => {
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      sendPaymentConfirmedEmail.mockImplementation(async () => {
        await kysely
          .updateTable("payment_emails")
          .set({ claimed_at: new Date().toISOString() })
          .where("id", "=", id)
          .execute()
        return { success: true }
      })

      await deliverPaymentEmail(id)

      expect((await readRow(id)).sent_at).not.toBeNull()
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("twice"),
        expect.objectContaining({ paymentEmailId: id }),
      )
    })

    it("does not send again an email that went out on a claim taken over", async () => {
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      sendPaymentConfirmedEmail.mockImplementationOnce(async () => {
        await kysely
          .updateTable("payment_emails")
          .set({ claimed_at: new Date().toISOString() })
          .where("id", "=", id)
          .execute()
        return { success: true }
      })
      await deliverPaymentEmail(id)
      // The claim that replaced it failed and gave the row back.
      await kysely
        .updateTable("payment_emails")
        .set({ claimed_at: null })
        .where("id", "=", id)
        .execute()
      await age(id, 15)

      await sweepPaymentEmails()

      expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1)
    })

    // The sweep's candidate query already filters these out, but a webhook
    // landing between that select and this claim would leave a link to a
    // charge that has just been paid or called off. The claim itself asks.
    it("does not send a link for a charge that closed since", async () => {
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

      const result = await deliverPaymentEmail(id)

      expect(result.sent).toBe(false)
      expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
      const row = await readRow(id)
      expect(row.attempts).toBe(0)
      expect(row.claimed_at).toBeNull()
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
      await waitOut(id)
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
      await waitOut(id)
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

    it("waits out the pause a failed send left before trying again", async () => {
      sendPaymentConfirmedEmail.mockResolvedValueOnce({ success: false })
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      await deliverPaymentEmail(id)
      await age(id, 15)

      const early = await sweepPaymentEmails()
      await waitOut(id)
      const late = await sweepPaymentEmails()

      expect(early.processed).toBe(0)
      expect(late.sent).toBe(1)
    })

    it("leaves a row it has given up on for a person", async () => {
      const payment = await paidPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "confirmation",
      })
      await kysely
        .updateTable("payment_emails")
        .set({ attempts: 5, given_up_at: new Date().toISOString() })
        .where("id", "=", id)
        .execute()
      await age(id, 15)

      const stats = await sweepPaymentEmails()

      expect(stats.processed).toBe(0)
      expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
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

    // The webhook's PAYABLE counts a lapsed charge as payable -- Asaas takes a
    // late Pix -- and the sweep deliberately does not. The two are not
    // interchangeable: this one decides whether a link is still worth sending.
    it("leaves the link of a charge that has lapsed", async () => {
      const payment = await openPayment()
      const id = await queuePaymentEmail(kyselyDb, {
        paymentId: payment.id,
        kind: "link",
      })
      await kysely
        .updateTable("payments")
        .set({ status: "expired" })
        .where("id", "=", payment.id)
        .execute()

      await age(id, 15)
      const stats = await sweepPaymentEmails()

      expect(stats.processed).toBe(0)
      expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
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
