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

const { deleteAsaasPayment, sendPaymentLinkEmail, logger, paymentsEnabled } =
  vi.hoisted(() => ({
    deleteAsaasPayment: vi.fn(),
    sendPaymentLinkEmail: vi.fn(),
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
    paymentsEnabled: { value: true },
  }))

vi.mock("./asaas-client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./asaas-client.server")>()
  return { ...original, deleteAsaasPayment }
})

vi.mock("./payment-emails.server", () => ({ sendPaymentLinkEmail }))
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

// This suite talks to a real Supabase, so ENV cannot be replaced with a blank
// object — that would strip the connection settings. Only the switch under
// test is pinned; everything else falls through to the resolved config.
vi.mock("varlock/env", async (importOriginal) => {
  const original = await importOriginal<{ ENV: Record<string, unknown> }>()
  return {
    ENV: new Proxy(original.ENV, {
      get: (target, key: string) =>
        key === "PAYMENTS_ENABLED"
          ? paymentsEnabled.value
          : Reflect.get(target, key),
    }),
  }
})

import { paymentsCopy } from "~/copy/payments"
import { registerManualPayment } from "./manual-payment.server"
import { createPaymentOffer, resendPaymentOffer } from "./payment-offer.server"

describe("createPaymentOffer", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let eventId: string
  let participantId: string
  let adminId: string
  let counter = 0

  const makeParticipant = async (
    overrides: Record<string, unknown> = {},
    profileOverrides: Record<string, unknown> = {},
  ) => {
    counter += 1
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${Date.now()}-${counter}-offer@example.com`,
      full_name: "Offer Tester",
      ...profileOverrides,
    })
    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: eventId,
      profile_id: profile.id,
      spot_type: "regular",
      application_status: "talking",
      ...overrides,
    })
    return participant.id
  }

  beforeEach(async () => {
    tracker.clear()
    counter += 1
    paymentsEnabled.value = true
    deleteAsaasPayment.mockReset()
    deleteAsaasPayment.mockResolvedValue(true)
    sendPaymentLinkEmail.mockReset()
    sendPaymentLinkEmail.mockResolvedValue({ success: true })
    logger.error.mockClear()

    const event = await createTestEvent(tracker, kysely, {
      title: "Offer Event",
      ticket_price: 22000,
    })
    eventId = event.id

    const admin = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${Date.now()}-${counter}-admin@example.com`,
      full_name: "Offer Admin",
    })
    adminId = admin.id

    participantId = await makeParticipant()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  async function paymentsFor(id: string) {
    const rows = await kysely
      .selectFrom("payments")
      .selectAll()
      .where("event_participant_id", "=", id)
      .orderBy("created_at", "asc")
      .execute()
    rows.forEach((row) => tracker.track("payments", row.id))
    return rows
  }

  const statusOf = async (id: string) =>
    (
      await kysely
        .selectFrom("event_participants")
        .select("application_status")
        .where("id", "=", id)
        .executeTakeFirstOrThrow()
    ).application_status

  it("opens a charge for the ticket price and emails the link", async () => {
    const result = await createPaymentOffer({
      eventParticipantId: participantId,
      createdBy: adminId,
    })

    expect(result.success).toBe(true)

    const [payment] = await paymentsFor(participantId)
    expect(payment).toMatchObject({
      kind: "asaas",
      status: "pending",
      base_amount: 22000,
      amount: null,
      method: null,
      created_by: adminId,
    })
    expect(new Date(payment.due_at).getTime()).toBeGreaterThan(Date.now())
    expect(sendPaymentLinkEmail).toHaveBeenCalledTimes(1)
  })

  it("uses a custom amount when the admin gives one", async () => {
    await createPaymentOffer({
      eventParticipantId: participantId,
      baseAmount: "110",
    })

    const [payment] = await paymentsFor(participantId)
    expect(payment.base_amount).toBe(11000)
  })

  it.each(["pending", "talking", "think_better", "no_response"])(
    "moves the funnel forward from %s",
    async (from) => {
      const participant = await makeParticipant({ application_status: from })

      await createPaymentOffer({ eventParticipantId: participant })

      expect(await statusOf(participant)).toBe("sent_payment_data")
    },
  )

  // sent_rules and finalised are the two steps that come after the money.
  // Everything else -- including the stalls, "Pensar melhor" and "Nao
  // Respondeu" -- happens during the conversation, before it.
  it.each(["sent_rules", "finalised"])(
    "leaves %s alone, since it comes after the payment",
    async (from) => {
      const participant = await makeParticipant({ application_status: from })

      await createPaymentOffer({ eventParticipantId: participant })

      expect(await statusOf(participant)).toBe(from)
      expect(await paymentsFor(participant)).toHaveLength(1)
    },
  )

  it("opens nothing for a social or staff spot", async () => {
    const social = await makeParticipant({ spot_type: "social" })

    const result = await createPaymentOffer({ eventParticipantId: social })

    expect(result.success).toBe(false)
    expect(await paymentsFor(social)).toHaveLength(0)
    expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
  })

  it("refuses when there is no price and no custom amount", async () => {
    const free = await createTestEvent(tracker, kysely, {
      title: "Free Event",
      ticket_price: null,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${Date.now()}-free@example.com`,
      full_name: "Free",
    })
    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: free.id,
      profile_id: profile.id,
      spot_type: "regular",
    })

    const result = await createPaymentOffer({
      eventParticipantId: participant.id,
    })

    expect(result.success).toBe(false)
    expect(await paymentsFor(participant.id)).toHaveLength(0)
    if (!result.success) {
      expect(result.errors[0]?.message).toBe(paymentsCopy.errors.noAmount)
    }
  })

  // What the modal actually posts for an event with no price: a blank field,
  // not an absent one.
  it("reads a blank amount as no amount at all", async () => {
    const free = await createTestEvent(tracker, kysely, {
      title: "Free Event",
      ticket_price: null,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${Date.now()}-blank@example.com`,
      full_name: "Blank",
    })
    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: free.id,
      profile_id: profile.id,
      spot_type: "regular",
    })

    const result = await createPaymentOffer({
      eventParticipantId: participant.id,
      baseAmount: "",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0]?.message).toBe(paymentsCopy.errors.noAmount)
    }
  })

  it("refuses a base amount of zero, and says why", async () => {
    const result = await createPaymentOffer({
      eventParticipantId: participantId,
      baseAmount: "0",
    })

    expect(result.success).toBe(false)
    expect(await paymentsFor(participantId)).toHaveLength(0)
    // The event has a price; telling the admin it does not would be a lie,
    // and the modal shows this sentence to her verbatim.
    if (!result.success) {
      expect(result.errors[0]?.message).toBe(paymentsCopy.errors.amountTooLow)
    }
  })

  it("says so when the amount cannot be read at all", async () => {
    const result = await createPaymentOffer({
      eventParticipantId: participantId,
      baseAmount: "cento e cinquenta",
    })

    expect(result.success).toBe(false)
    expect(await paymentsFor(participantId)).toHaveLength(0)
    // Not "it must be greater than zero": nothing was read, so nothing was
    // compared to zero.
    if (!result.success) {
      expect(result.errors[0]?.message).toBe(
        paymentsCopy.errors.amountUnreadable,
      )
    }
  })

  it("replaces the open charge instead of adding a second one", async () => {
    await createPaymentOffer({ eventParticipantId: participantId })
    await createPaymentOffer({
      eventParticipantId: participantId,
      baseAmount: "150",
    })

    const rows = await paymentsFor(participantId)
    expect(rows).toHaveLength(2)
    expect(rows[0].status).toBe("cancelled")
    expect(rows[1]).toMatchObject({ status: "pending", base_amount: 15000 })
  })

  it("deletes the Asaas charge of the one it replaced", async () => {
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      amount: 23000,
      method: "pix",
      paid_at: null,
      asaas_payment_id: `pay_old_${Date.now()}`,
    })

    await createPaymentOffer({ eventParticipantId: participantId })

    expect(deleteAsaasPayment).toHaveBeenCalledTimes(1)
  })

  it("survives Asaas refusing the delete", async () => {
    deleteAsaasPayment.mockRejectedValue(new Error("asaas is down"))
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      amount: 23000,
      method: "pix",
      paid_at: null,
      asaas_payment_id: `pay_old_${Date.now()}`,
    })

    const result = await createPaymentOffer({
      eventParticipantId: participantId,
    })

    expect(result.success).toBe(true)
    const rows = await paymentsFor(participantId)
    expect(rows[0].status).toBe("cancelled")
    expect(rows[1].status).toBe("pending")
    expect(logger.error).toHaveBeenCalled()
  })

  it("leaves a paid charge alone and refuses", async () => {
    await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 22000,
    })

    const result = await createPaymentOffer({
      eventParticipantId: participantId,
    })

    expect(result.success).toBe(false)
    expect(deleteAsaasPayment).not.toHaveBeenCalled()
    expect(await paymentsFor(participantId)).toHaveLength(1)
  })

  it("does nothing but succeed when payments are switched off", async () => {
    paymentsEnabled.value = false

    const result = await createPaymentOffer({
      eventParticipantId: participantId,
    })

    expect(result.success).toBe(true)
    expect(await paymentsFor(participantId)).toHaveLength(0)
    expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
    expect(await statusOf(participantId)).toBe("talking")
  })

  it("keeps the charge when the email fails", async () => {
    sendPaymentLinkEmail.mockResolvedValue({ success: false })

    const result = await createPaymentOffer({
      eventParticipantId: participantId,
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.emailSent).toBe(false)
    expect(await paymentsFor(participantId)).toHaveLength(1)
  })

  // They queue on the participant's row lock rather than racing, so the second
  // one replaces the first exactly as a deliberate re-price would -- two
  // charges opened, one of them cancelled, one left live. What must never
  // happen is two live at once, which is what the partial unique index would
  // refuse if the lock ever stopped holding them apart.
  it("serialises two concurrent offers into one live charge", async () => {
    const results = await Promise.allSettled([
      createPaymentOffer({ eventParticipantId: participantId }),
      createPaymentOffer({ eventParticipantId: participantId }),
    ])

    const rows = await paymentsFor(participantId)
    const active = rows.filter((row) =>
      ["pending", "awaiting_payment"].includes(row.status),
    )
    expect(active).toHaveLength(1)
    expect(
      results.every((result) => result.status === "fulfilled"),
    ).toBe(true)
  })

  // Not a reproduction -- a race does not reproduce on demand -- but the
  // invariant it protects: whoever gets the participant's row lock first
  // wins, and the loser sees what the winner wrote.
  it("never leaves a participant both paid and holding an open charge", async () => {
    await Promise.allSettled([
      createPaymentOffer({ eventParticipantId: participantId }),
      registerManualPayment({
        eventParticipantId: participantId,
        amount: "220",
        method: "pix",
        paidAt: "2026-09-01",
      }),
    ])

    const rows = await paymentsFor(participantId)
    const paid = rows.some((row) =>
      ["paid", "partially_refunded"].includes(row.status),
    )
    const active = rows.some((row) =>
      ["pending", "awaiting_payment"].includes(row.status),
    )

    expect(paid && active).toBe(false)
  })
})

describe("resendPaymentOffer", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string
  let counter = 0

  beforeEach(async () => {
    tracker.clear()
    counter += 1
    sendPaymentLinkEmail.mockReset()
    sendPaymentLinkEmail.mockResolvedValue({ success: true })

    const event = await createTestEvent(tracker, kysely, {
      title: "Resend Event",
      ticket_price: 22000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${Date.now()}-${counter}-resend@example.com`,
      full_name: "Resend Tester",
    })
    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profile.id,
        spot_type: "regular",
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const chargeWith = (status: string) =>
    createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status,
      base_amount: 22000,
      amount: status === "paid" ? 22000 : null,
      method: status === "paid" ? "pix" : null,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })

  it("sends the same link again without opening a second charge", async () => {
    const payment = await chargeWith("pending")

    const result = await resendPaymentOffer({ paymentId: payment.id })

    expect(result.success).toBe(true)
    expect(sendPaymentLinkEmail).toHaveBeenCalledWith({ paymentId: payment.id })

    const rows = await kysely
      .selectFrom("payments")
      .selectAll()
      .where("event_participant_id", "=", participantId)
      .execute()
    expect(rows).toHaveLength(1)
    expect(rows[0].due_at).toEqual(payment.due_at)
  })

  it("resends for a charge the participant already picked an option on", async () => {
    const payment = await chargeWith("awaiting_payment")

    const result = await resendPaymentOffer({ paymentId: payment.id })

    expect(result.success).toBe(true)
  })

  it("refuses a charge that is no longer open", async () => {
    const payment = await chargeWith("cancelled")

    const result = await resendPaymentOffer({ paymentId: payment.id })

    expect(result.success).toBe(false)
    expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
  })

  it("sends nothing while payments are switched off", async () => {
    const payment = await chargeWith("pending")
    paymentsEnabled.value = false

    const result = await resendPaymentOffer({ paymentId: payment.id })

    expect(result.success).toBe(true)
    expect(sendPaymentLinkEmail).not.toHaveBeenCalled()

    paymentsEnabled.value = true
  })

  it("refuses a payment that is not there", async () => {
    const result = await resendPaymentOffer({
      paymentId: "00000000-0000-0000-0000-000000000000",
    })

    expect(result.success).toBe(false)
  })
})
