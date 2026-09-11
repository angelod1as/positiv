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
import { FALLBACK_FEES } from "./asaas-fees.server"

// Hoisted: vi.mock factories run before the module body, so a plain const
// declared here would not exist yet when the factory reads it.
const { sendEmail, logger, appUrl } = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  appUrl: { override: undefined as string | undefined },
}))

vi.mock("~/business/email/send-email", () => ({ sendEmail }))
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

// A real Supabase is on the other end, so ENV cannot be replaced wholesale --
// that would strip the connection settings. Only APP_URL is pinned, and only
// when a test asks for it.
vi.mock("varlock/env", async (importOriginal) => {
  const original = await importOriginal<{ ENV: Record<string, unknown> }>()
  return {
    ENV: new Proxy(original.ENV, {
      get: (target, key: string) =>
        key === "APP_URL" && appUrl.override !== undefined
          ? appUrl.override
          : Reflect.get(target, key),
    }),
  }
})

// getAsaasFees is left real: with no ASAAS_API_KEY configured the lookup fails
// and it answers with FALLBACK_FEES, which is what the assertions price
// against.
import { sendPaymentLinkEmail } from "./payment-emails.server"

describe("sendPaymentLinkEmail", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let eventId: string
  let participantId: string
  let counter = 0

  beforeEach(async () => {
    tracker.clear()
    counter += 1
    sendEmail.mockReset()
    sendEmail.mockResolvedValue({ success: true })
    logger.error.mockClear()

    const testId = `${Date.now()}-${counter}`
    const event = await createTestEvent(tracker, kysely, {
      title: "Link Event",
      emoji: "🎉",
      ticket_price: 22000,
    })
    eventId = event.id

    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-link@example.com`,
      full_name: "Link Tester",
    })
    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: eventId,
        profile_id: profile.id,
        spot_type: "regular",
      })
    ).id
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  const openCharge = () =>
    createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "pending",
      base_amount: 22000,
      amount: null,
      method: null,
      paid_at: null,
      due_at: "2026-09-01T12:00:00Z",
    })

  it("sends the link to the participant, priced from the base amount", async () => {
    const payment = await openCharge()

    const result = await sendPaymentLinkEmail({ paymentId: payment.id })

    expect(result.success).toBe(true)
    expect(sendEmail).toHaveBeenCalledTimes(1)

    const [options] = sendEmail.mock.calls[0]
    expect(options.to).toContain("-link@example.com")
    expect(options.subject).toContain("Link Event")
    expect(options.html).toContain(`/pagamento/${payment.id}`)
    expect(options.html).toContain("Pix —")
    expect(options.text).toContain("Pix —")
  })

  it("prices every option the participant may choose", async () => {
    const payment = await openCharge()

    await sendPaymentLinkEmail({ paymentId: payment.id })

    const [options] = sendEmail.mock.calls[0]
    // PIX plus one line per installment count, 1x through 6x.
    expect(options.html).toContain("Cartão à vista")
    expect(options.html).toContain("Cartão 6x")
    // The participant pays the fees, so every option is above the base.
    expect(options.html).not.toContain("R$ 220,00")
  })

  // profiles.email is NOT NULL, so the reachable version of "no mailbox" is a
  // blank one -- a profile an admin typed in without an address.
  // PR 10 sends a returning payer back to the invoice it already created, at
  // the price it was created with. Re-pricing the seven options on a resend
  // would quote a figure the checkout will not honour.
  it("restates what was chosen instead of re-offering the menu", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      base_amount: 22000,
      amount: 22199,
      method: "pix",
      paid_at: null,
      due_at: "2026-09-01T12:00:00Z",
    })

    await sendPaymentLinkEmail({ paymentId: payment.id })

    const [options] = sendEmail.mock.calls[0]
    expect(options.html).toContain("Pix — R$ 221,99")
    expect(options.html).not.toContain("Cartão")
  })

  it("answers { success: false } when the profile has no email", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "",
      full_name: "No Mailbox",
    })
    const participant = await createTestEventParticipant(tracker, kysely, {
      event_id: eventId,
      profile_id: profile.id,
      spot_type: "regular",
    })
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participant.id,
      kind: "asaas",
      status: "pending",
      base_amount: 22000,
      amount: null,
      method: null,
      paid_at: null,
    })

    const result = await sendPaymentLinkEmail({ paymentId: payment.id })

    expect(result.success).toBe(false)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  // APP_URL is not a required variable, and without one appOrigin answers
  // nothing -- the url reaches the template schemeless and it refuses to
  // vouch for it. The charge is already committed by then, so this has to
  // read as an email that did not go out.
  it("answers { success: false } when the link cannot be built", async () => {
    const payment = await openCharge()
    appUrl.override = ""

    try {
      const result = await sendPaymentLinkEmail({ paymentId: payment.id })

      expect(result.success).toBe(false)
      expect(sendEmail).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalled()
    } finally {
      appUrl.override = undefined
    }
  })

  it("answers { success: false } and logs when the transport refuses", async () => {
    sendEmail.mockResolvedValue({ success: false, errors: [] })
    const payment = await openCharge()

    const result = await sendPaymentLinkEmail({ paymentId: payment.id })

    expect(result.success).toBe(false)
    expect(logger.error).toHaveBeenCalled()
  })

  it("answers { success: false } for a payment that is not there", async () => {
    const result = await sendPaymentLinkEmail({
      paymentId: "00000000-0000-0000-0000-000000000000",
    })

    expect(result.success).toBe(false)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("uses the fee snapshot to gross the base up", async () => {
    const payment = await openCharge()

    await sendPaymentLinkEmail({ paymentId: payment.id })

    // A PIX charge nets the base after a percentage and a fixed fee, so the
    // participant sees strictly more than 220.
    const [options] = sendEmail.mock.calls[0]
    const expectedPix = Math.ceil(
      (22000 + FALLBACK_FEES.pix.fixed) / (1 - FALLBACK_FEES.pix.percent),
    )
    expect(options.html).toContain(
      `R$ ${(expectedPix / 100).toFixed(2).replace(".", ",")}`,
    )
  })
})
