import { afterEach, beforeEach, describe, expect, it } from "vitest"
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

import {
  loadPaymentPage,
  loadPaymentPageByToken,
  loadPaymentThanks,
  loadPaymentThanksByToken,
} from "./payment-page.server"

describe("loadPaymentPage", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let profileId: string
  let otherProfileId: string
  let participantId: string
  let eventId: string

  beforeEach(async () => {
    tracker.clear()
    const testId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const event = await createTestEvent(tracker, kysely, {
      title: "Payment Page Event",
      ticket_price: 22000,
    })
    eventId = event.id
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
      kind: "online",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
      base_amount: 22000,
    })

  it("offers the options to the person the charge belongs to", async () => {
    const payment = await openCharge()

    const result = await loadPaymentPage({
      paymentId: payment.id,
      profileId,
      onlinePaymentsEnabled: true,
      cardPaymentsEnabled: true,
    })

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
    expect(result.options[0]?.total).toBe(19800)
    expect(result.options[1]?.total).toBe(22000)
    // The event price, so the page can name the Pix discount against it.
    expect(result.baseAmount).toBe(22000)
    expect(result.eventTitle).toBe("Payment Page Event")
    expect(result.chosen).toBeNull()
  })

  // Truncated to the cent, the remainder on the last installment: what the card
  // is actually charged.
  it("quotes each installment the way the card will be charged", async () => {
    const payment = await openCharge()

    const result = await loadPaymentPage({
      paymentId: payment.id,
      profileId,
      onlinePaymentsEnabled: true,
      cardPaymentsEnabled: true,
    })

    expect(result.state).toBe("ready")
    if (result.state !== "ready") return
    expect(result.options.map((option) => option.perInstallment)).toEqual([
      19800, 22000, 11000, 7333, 5500, 4400, 3666,
    ])
  })

  it("refuses someone else's charge", async () => {
    const payment = await openCharge()

    await expect(
      loadPaymentPage({
        paymentId: payment.id,
        profileId: otherProfileId,
        onlinePaymentsEnabled: true,
        cardPaymentsEnabled: true,
      }),
    ).rejects.toBeDefined()
  })

  it("refuses a charge that does not exist", async () => {
    await expect(
      loadPaymentPage({
        paymentId: "00000000-0000-4000-8000-000000000000",
        profileId,
        onlinePaymentsEnabled: true,
        cardPaymentsEnabled: true,
      }),
    ).rejects.toBeDefined()
  })

  // payments.id is a uuid column, so a route param that is not one makes
  // Postgres throw rather than return nothing. Answered like any other charge
  // that is not yours, not with an error page.
  it("refuses an id that is not a UUID at all", async () => {
    await expect(
      loadPaymentPage({
        paymentId: "foo",
        profileId,
        onlinePaymentsEnabled: true,
        cardPaymentsEnabled: true,
      }),
    ).rejects.toBeInstanceOf(Response)
  })

  it("asks for the CPF when the profile has none that checks out", async () => {
    await kysely
      .updateTable("profiles")
      .set({ cpf: "111.111.111-11" })
      .where("id", "=", profileId)
      .execute()
    const payment = await openCharge()

    const result = await loadPaymentPage({
      paymentId: payment.id,
      profileId,
      onlinePaymentsEnabled: true,
      cardPaymentsEnabled: true,
    })

    expect(result).toMatchObject({ state: "needs_cpf", providerName: "Asaas" })
  })

  it("says it is already paid", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      amount: 22199,
    })

    const result = await loadPaymentPage({
      paymentId: payment.id,
      profileId,
      onlinePaymentsEnabled: true,
      cardPaymentsEnabled: true,
    })

    expect(result.state).toBe("paid")
    if (result.state !== "paid") return
    expect(result.amount).toBe(22199)
  })

  it("says the link is closed for an expired charge", async () => {
    const expired = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      status: "expired",
      amount: null,
      method: null,
      paid_at: null,
    })

    const result = await loadPaymentPage({
      paymentId: expired.id,
      profileId,
      onlinePaymentsEnabled: true,
      cardPaymentsEnabled: true,
    })

    expect(result.state).toBe("closed")
  })

  it("keeps offering the options after the participant already picked one", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      status: "awaiting_payment",
      amount: 22199,
      method: "pix",
      paid_at: null,
      provider_checkout_url: "https://sandbox.asaas.com/i/pay_1",
    })

    const result = await loadPaymentPage({
      paymentId: payment.id,
      profileId,
      onlinePaymentsEnabled: true,
      cardPaymentsEnabled: true,
    })

    expect(result.state).toBe("ready")
    if (result.state !== "ready") return
    expect(result.chosen?.id).toBe("pix")
    expect(result.invoiceUrl).toBe("https://sandbox.asaas.com/i/pay_1")
  })

  it("remembers a card plan the participant picked", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "online",
      status: "awaiting_payment",
      amount: 23730,
      method: "credit_card",
      installment_count: 3,
      paid_at: null,
      provider_checkout_url: "https://sandbox.asaas.com/i/pay_2",
    })

    const result = await loadPaymentPage({
      paymentId: payment.id,
      profileId,
      onlinePaymentsEnabled: true,
      cardPaymentsEnabled: true,
    })

    expect(result.state).toBe("ready")
    if (result.state !== "ready") return
    expect(result.chosen?.id).toBe("card_3")
  })

  it("offers Pix alone, at the full price, while card payments are off", async () => {
    const payment = await openCharge()

    const result = await loadPaymentPage({
      paymentId: payment.id,
      profileId,
      onlinePaymentsEnabled: true,
      cardPaymentsEnabled: false,
    })

    expect(result.state).toBe("ready")
    if (result.state !== "ready") return
    expect(result.options).toEqual([
      expect.objectContaining({ id: "pix", total: 22000 }),
    ])
  })

  // With the switch off no charge can be created, so the page offers nothing
  // rather than a price nobody could pay.
  it("offers nothing while payments are switched off", async () => {
    const payment = await openCharge()

    const result = await loadPaymentPage({
      paymentId: payment.id,
      profileId,
      onlinePaymentsEnabled: false,
      cardPaymentsEnabled: true,
    })

    expect(result.state).toBe("closed")
  })

  describe("loadPaymentThanks", () => {
    // Asaas sends the participant here after they paid a charge that was
    // open. The page only says whether the money landed.
    it("says an open charge is on its way", async () => {
      const payment = await openCharge()

      const result = await loadPaymentThanks({
        paymentId: payment.id,
        profileId,
      })

      expect(result).toEqual({ state: "waiting", eventTitle: expect.any(String) })
    })

    it("says it is already paid", async () => {
      const payment = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        amount: 22199,
      })

      const result = await loadPaymentThanks({
        paymentId: payment.id,
        profileId,
      })

      expect(result).toMatchObject({ state: "paid", amount: 22199 })
    })

    it("says the link is closed for an expired charge", async () => {
      const expired = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "online",
        status: "expired",
        amount: null,
        method: null,
        paid_at: null,
      })

      const result = await loadPaymentThanks({
        paymentId: expired.id,
        profileId,
      })

      expect(result.state).toBe("closed")
    })

    it("refuses someone else's charge", async () => {
      const payment = await openCharge()

      await expect(
        loadPaymentThanks({ paymentId: payment.id, profileId: otherProfileId }),
      ).rejects.toBeDefined()
    })
  })

  describe("by access token", () => {
    const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString()
    const yesterday = () => new Date(Date.now() - 86_400_000).toISOString()

    const startEventAt = (time: string | null) =>
      kysely
        .updateTable("events")
        .set({ time_event_start: time })
        .where("id", "=", eventId)
        .execute()

    const byToken = (token: string) =>
      loadPaymentPageByToken({
        token,
        onlinePaymentsEnabled: true,
        cardPaymentsEnabled: true,
      })

    beforeEach(async () => {
      await startEventAt(tomorrow())
    })

    it("offers the options without knowing who is asking", async () => {
      const payment = await openCharge()

      const result = await byToken(payment.access_token)

      expect(result).toMatchObject({ state: "ready", paymentId: payment.id })
    })

    it("stays open for an event with no start date", async () => {
      await startEventAt(null)
      const payment = await openCharge()

      expect((await byToken(payment.access_token)).state).toBe("ready")
    })

    it("closes once the event has started", async () => {
      await startEventAt(yesterday())
      const payment = await openCharge()

      expect(await byToken(payment.access_token)).toEqual({
        state: "closed",
        eventTitle: "Payment Page Event",
      })
    })

    it("closes a charge already paid rather than showing the receipt", async () => {
      const payment = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
      })

      expect((await byToken(payment.access_token)).state).toBe("closed")
    })

    it("closes an expired charge", async () => {
      const expired = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "online",
        status: "expired",
        amount: null,
        method: null,
        paid_at: null,
      })

      expect((await byToken(expired.access_token)).state).toBe("closed")
    })

    // The token path never writes a CPF without a session: the id route asks
    // for one once the owner has logged in.
    it("sends a profile without a valid CPF to the logged-in payment page", async () => {
      await kysely
        .updateTable("profiles")
        .set({ cpf: "111.111.111-11" })
        .where("id", "=", profileId)
        .execute()
      const payment = await openCharge()

      const refusal = await byToken(payment.access_token).catch(
        (error: unknown) => error,
      )

      expect(refusal).toBeInstanceOf(Response)
      expect((refusal as Response).headers.get("Location")).toBe(
        `/pagamento/${payment.id}`,
      )
    })

    it("refuses a token that names no payment", async () => {
      await expect(byToken("0".repeat(48))).rejects.toBeInstanceOf(Response)
    })

    it("refuses a token that is not one at all", async () => {
      await expect(byToken("not-a-token")).rejects.toBeInstanceOf(Response)
    })

    it("thanks the payer of an open charge without knowing who is asking", async () => {
      const payment = await openCharge()

      expect(
        await loadPaymentThanksByToken({ token: payment.access_token }),
      ).toEqual({ state: "waiting", eventTitle: "Payment Page Event" })
    })

    it("says on the thanks page that a charge is paid", async () => {
      const payment = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        amount: 22199,
      })

      expect(
        await loadPaymentThanksByToken({ token: payment.access_token }),
      ).toMatchObject({ state: "paid", amount: 22199 })
    })

    it("refuses a thanks page for a token that names no payment", async () => {
      await expect(
        loadPaymentThanksByToken({ token: "0".repeat(48) }),
      ).rejects.toBeInstanceOf(Response)
    })
  })
})
