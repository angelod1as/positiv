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

const { paymentsEnabled } = vi.hoisted(() => ({
  paymentsEnabled: { value: true },
}))

// The fee table is pinned so the prices below are the ones the fallback list
// produces, whatever an account the suite cannot reach would have answered.
vi.mock("~/business/payment/asaas-fees.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/business/payment/asaas-fees.server")>()
  return { ...original, getAsaasFees: async () => original.FALLBACK_FEES }
})

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

import { loadPaymentPage } from "./payment-page.server"

describe("loadPaymentPage", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let profileId: string
  let otherProfileId: string
  let participantId: string

  beforeEach(async () => {
    paymentsEnabled.value = true
    tracker.clear()
    const testId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const event = await createTestEvent(tracker, kysely, {
      title: "Payment Page Event",
      ticket_price: 22000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-payer@example.com`,
      full_name: "Ana Souza",
      cpf: "529.982.247-25",
    })
    const other = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-other@example.com`,
      full_name: "Someone Else",
    })
    profileId = profile.id
    otherProfileId = other.id
    participantId = (
      await createTestEventParticipant(tracker, kysely, {
        event_id: event.id,
        profile_id: profile.id,
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
      amount: null,
      method: null,
      paid_at: null,
      base_amount: 22000,
    })

  it("offers the options to the person the charge belongs to", async () => {
    const payment = await openCharge()

    const result = await loadPaymentPage({ paymentId: payment.id, profileId })

    expect(result.state).toBe("ready")
    if (result.state !== "ready") return
    expect(result.options.map((option) => option.id)).toEqual([
      "pix",
      "card_1",
      "card_2",
      "card_3",
      "card_4",
      "card_5",
      "card_6",
    ])
    expect(result.options[0]?.total).toBe(22199)
    expect(result.eventTitle).toBe("Payment Page Event")
    expect(result.chosen).toBeNull()
  })

  it("refuses someone else's charge", async () => {
    const payment = await openCharge()

    await expect(
      loadPaymentPage({ paymentId: payment.id, profileId: otherProfileId }),
    ).rejects.toBeDefined()
  })

  it("refuses a charge that does not exist", async () => {
    await expect(
      loadPaymentPage({
        paymentId: "00000000-0000-4000-8000-000000000000",
        profileId,
      }),
    ).rejects.toBeDefined()
  })

  it("asks for the CPF when the profile has none that checks out", async () => {
    await kysely
      .updateTable("profiles")
      .set({ cpf: "111.111.111-11" })
      .where("id", "=", profileId)
      .execute()
    const payment = await openCharge()

    const result = await loadPaymentPage({ paymentId: payment.id, profileId })

    expect(result.state).toBe("needs_cpf")
  })

  it("says it is already paid", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 22199,
    })

    const result = await loadPaymentPage({ paymentId: payment.id, profileId })

    expect(result.state).toBe("paid")
    if (result.state !== "paid") return
    expect(result.amount).toBe(22199)
  })

  it("says the link is closed for an expired charge", async () => {
    const expired = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "expired",
      amount: null,
      method: null,
      paid_at: null,
    })

    const result = await loadPaymentPage({ paymentId: expired.id, profileId })

    expect(result.state).toBe("closed")
  })

  it("keeps offering the options after the participant already picked one", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      amount: 22199,
      method: "pix",
      paid_at: null,
      asaas_invoice_url: "https://sandbox.asaas.com/i/pay_1",
    })

    const result = await loadPaymentPage({ paymentId: payment.id, profileId })

    expect(result.state).toBe("ready")
    if (result.state !== "ready") return
    expect(result.chosen?.id).toBe("pix")
    expect(result.invoiceUrl).toBe("https://sandbox.asaas.com/i/pay_1")
  })

  it("remembers a card plan the participant picked", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      status: "awaiting_payment",
      amount: 23730,
      method: "credit_card",
      installment_count: 3,
      paid_at: null,
      asaas_invoice_url: "https://sandbox.asaas.com/i/pay_2",
    })

    const result = await loadPaymentPage({ paymentId: payment.id, profileId })

    expect(result.state).toBe("ready")
    if (result.state !== "ready") return
    expect(result.chosen?.id).toBe("card_3")
  })

  // Pricing an option means reading the Asaas fee table. With the switch off
  // nothing may talk to Asaas, so the page offers nothing rather than quoting
  // a price from the fallback list that no charge could be created against.
  it("offers nothing while payments are switched off", async () => {
    paymentsEnabled.value = false
    const payment = await openCharge()

    const result = await loadPaymentPage({ paymentId: payment.id, profileId })

    expect(result.state).toBe("closed")
  })
})
