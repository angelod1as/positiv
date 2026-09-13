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
  createAsaasCustomer,
  findAsaasCustomerByCpf,
  createAsaasPayment,
  deleteAsaasPayment,
  logger,
  paymentsEnabled,
  prod,
} = vi.hoisted(() => ({
  createAsaasCustomer: vi.fn(),
  findAsaasCustomerByCpf: vi.fn(),
  createAsaasPayment: vi.fn(),
  deleteAsaasPayment: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  paymentsEnabled: { value: true },
  prod: { value: false },
}))

vi.mock("~/lib/helpers/is-prod.server", () => ({
  isProd: () => prod.value,
  isCI: () => false,
}))

vi.mock("./asaas-client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./asaas-client.server")>()
  return {
    ...original,
    createAsaasCustomer,
    findAsaasCustomerByCpf,
    createAsaasPayment,
    deleteAsaasPayment,
  }
})

vi.mock("./asaas-fees.server", async (importOriginal) => {
  const original = await importOriginal<typeof import("./asaas-fees.server")>()
  return { ...original, getAsaasFees: async () => original.FALLBACK_FEES }
})

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

import { FALLBACK_FEES } from "./asaas-fees.server"
import { pickOption } from "./payment-checkout.server"

describe("pickOption", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let profileId: string
  let otherProfileId: string
  let participantId: string
  let otherParticipantId: string

  beforeEach(async () => {
    vi.clearAllMocks()
    paymentsEnabled.value = true
    prod.value = false
    createAsaasCustomer.mockResolvedValue("cus_new")
    findAsaasCustomerByCpf.mockResolvedValue(null)
    createAsaasPayment.mockResolvedValue({
      id: "pay_1",
      status: "PENDING",
      invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
      installmentId: null,
    })
    deleteAsaasPayment.mockResolvedValue(true)

    tracker.clear()
    const testId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const event = await createTestEvent(tracker, kysely, {
      title: "Checkout Event",
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
      cpf: "111.444.777-35",
    })
    profileId = profile.id
    otherProfileId = other.id
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

  const openCharge = (forParticipant = participantId) =>
    createTestPayment(tracker, kysely, {
      event_participant_id: forParticipant,
      kind: "asaas",
      status: "pending",
      amount: null,
      method: null,
      paid_at: null,
      base_amount: 22000,
    })

  const rowOf = (paymentId: string) =>
    kysely
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", paymentId)
      .executeTakeFirstOrThrow()

  it("creates the Asaas customer once and reuses it afterwards", async () => {
    const payment = await openCharge()

    await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })

    expect(createAsaasCustomer).toHaveBeenCalledTimes(1)
    const profile = await kysely
      .selectFrom("profiles")
      .select("asaas_customer_id")
      .where("id", "=", profileId)
      .executeTakeFirstOrThrow()
    expect(profile.asaas_customer_id).toBe("cus_new")

    // A second event, same person: the customer is already on the profile.
    await kysely
      .updateTable("payments")
      .set({ status: "cancelled" })
      .where("id", "=", payment.id)
      .execute()
    const second = await openCharge()
    await pickOption({ paymentId: second.id, profileId, optionId: "pix" })

    expect(createAsaasCustomer).toHaveBeenCalledTimes(1)
  })

  it("adopts a customer Asaas already has for that CPF", async () => {
    findAsaasCustomerByCpf.mockResolvedValueOnce("cus_existing")
    const payment = await openCharge()

    await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })

    expect(createAsaasCustomer).not.toHaveBeenCalled()
    const profile = await kysely
      .selectFrom("profiles")
      .select("asaas_customer_id")
      .where("id", "=", profileId)
      .executeTakeFirstOrThrow()
    expect(profile.asaas_customer_id).toBe("cus_existing")
  })

  it("charges the gross of the chosen option and records what came back", async () => {
    const payment = await openCharge()

    const result = await pickOption({
      paymentId: payment.id,
      profileId,
      optionId: "card_3",
    })

    expect(createAsaasPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "credit_card",
        installmentCount: 3,
        externalReference: payment.id,
        customerId: "cus_new",
      }),
    )

    const after = await rowOf(payment.id)
    expect(after).toMatchObject({
      status: "awaiting_payment",
      method: "credit_card",
      installment_count: 3,
      asaas_customer_id: "cus_new",
      asaas_payment_id: "pay_1",
      asaas_invoice_url: "https://sandbox.asaas.com/i/pay_1",
    })
    expect(after.amount).toBeGreaterThan(after.base_amount)
    expect(result.success && result.data.invoiceUrl).toBe(
      "https://sandbox.asaas.com/i/pay_1",
    )
  })

  it("writes down the fee table the price was built from", async () => {
    const payment = await openCharge()

    await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })

    const after = await rowOf(payment.id)
    expect(after.fee_snapshot).toEqual(FALLBACK_FEES)
    expect(after.amount).toBe(22199)
  })

  it("returns the same invoice when the same option is picked twice", async () => {
    const payment = await openCharge()
    await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })
    createAsaasPayment.mockClear()

    const again = await pickOption({
      paymentId: payment.id,
      profileId,
      optionId: "pix",
    })

    expect(createAsaasPayment).not.toHaveBeenCalled()
    expect(again.success && again.data.invoiceUrl).toBe(
      "https://sandbox.asaas.com/i/pay_1",
    )
  })

  it("deletes the previous charge when the participant changes their mind", async () => {
    const payment = await openCharge()
    await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })
    createAsaasPayment.mockResolvedValue({
      id: "pay_2",
      status: "PENDING",
      invoiceUrl: "https://sandbox.asaas.com/i/pay_2",
      installmentId: null,
    })

    await pickOption({ paymentId: payment.id, profileId, optionId: "card_1" })

    expect(deleteAsaasPayment).toHaveBeenCalledWith("pay_1")
    const after = await rowOf(payment.id)
    expect(after.asaas_payment_id).toBe("pay_2")
  })

  it("deletes the charge it just created when the row is no longer open", async () => {
    const payment = await openCharge()
    // The row closes between the read and the guarded update: an admin
    // cancelled it, or the expiry cron reached it.
    createAsaasPayment.mockImplementationOnce(async () => {
      await kysely
        .updateTable("payments")
        .set({ status: "cancelled" })
        .where("id", "=", payment.id)
        .execute()
      return {
        id: "pay_1",
        status: "PENDING",
        invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
        installmentId: null,
      }
    })

    const result = await pickOption({
      paymentId: payment.id,
      profileId,
      optionId: "pix",
    })

    expect(result.success).toBe(false)
    expect(deleteAsaasPayment).toHaveBeenCalledWith("pay_1")
    const after = await rowOf(payment.id)
    expect(after.status).toBe("cancelled")
    expect(after.asaas_payment_id).toBeNull()
  })

  // Asaas refuses a callback whose domain does not match the commercial data on
  // the account, and fails the whole charge with invalid_callback. A developer
  // machine's APP_URL never matches, so outside production none is sent.
  it("sends no callback outside production", async () => {
    const payment = await openCharge()

    await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })

    expect(createAsaasPayment).toHaveBeenCalledWith(
      expect.objectContaining({ successUrl: null }),
    )
  })

  it("sends the thank-you page as the callback in production", async () => {
    prod.value = true
    const payment = await openCharge()

    await pickOption({ paymentId: payment.id, profileId, optionId: "pix" })

    const [call] = createAsaasPayment.mock.calls.at(-1) ?? []
    expect(call.successUrl).toMatch(
      new RegExp(`/pagamento/${payment.id}/obrigado$`),
    )
  })

  // A charge with no invoice is a charge the participant cannot reach. Leaving
  // it at Asaas and the row at awaiting_payment would mean money that could
  // still arrive against a link nobody has.
  it("deletes a charge Asaas gave no invoice for, and leaves the row open", async () => {
    const payment = await openCharge()
    createAsaasPayment.mockResolvedValueOnce({
      id: "pay_no_url",
      status: "PENDING",
      invoiceUrl: null,
      installmentId: null,
    })

    const result = await pickOption({
      paymentId: payment.id,
      profileId,
      optionId: "pix",
    })

    expect(result.success).toBe(false)
    expect(deleteAsaasPayment).toHaveBeenCalledWith("pay_no_url")

    const after = await rowOf(payment.id)
    expect(after.status).toBe("pending")
    expect(after.asaas_payment_id).toBeNull()
    expect(after.asaas_invoice_url).toBeNull()
  })

  // Two picks racing: both read the row before either writes, so both reach
  // Asaas. Only one may end up recorded, and the charge the loser opened must
  // not survive — the participant could still pay it, against a row that has
  // stopped naming it.
  it("leaves no live charge behind when two picks race", async () => {
    const payment = await openCharge()
    let created = 0
    // Both calls are held inside createAsaasPayment until the second arrives,
    // so neither can write before the other has read. Without the barrier the
    // two serialise and the second simply finds the first's invoice.
    let release = () => {}
    const bothArrived = new Promise<void>((resolve) => {
      release = resolve
    })
    createAsaasPayment.mockImplementation(async () => {
      created += 1
      const mine = created
      if (created === 2) release()
      await bothArrived
      return {
        id: `pay_race_${mine}`,
        status: "PENDING",
        invoiceUrl: `https://sandbox.asaas.com/i/pay_race_${mine}`,
        installmentId: null,
      }
    })

    const [first, second] = await Promise.all([
      pickOption({ paymentId: payment.id, profileId, optionId: "pix" }),
      pickOption({ paymentId: payment.id, profileId, optionId: "pix" }),
    ])

    const after = await rowOf(payment.id)
    const survivor = after.asaas_payment_id

    expect(created).toBe(2)
    expect(survivor).not.toBeNull()

    // Whichever lost had its charge deleted, and nothing else was.
    const deleted = deleteAsaasPayment.mock.calls.map(([id]) => id)
    expect(deleted).toHaveLength(1)
    expect(deleted[0]).not.toBe(survivor)

    // Both callers still get the invoice the row actually names, so a
    // double-click does not land anyone on a charge nobody is tracking.
    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    const urls = [first, second].map((r) => r.success && r.data.invoiceUrl)
    expect(urls).toEqual([
      after.asaas_invoice_url,
      after.asaas_invoice_url,
    ])
  })

  // The page gates on the CPF before it offers the options, but the action is
  // reachable on its own. Refused here with the sentence the gate uses, rather
  // than by Asaas rejecting the customer.
  it("refuses to charge a profile whose CPF does not check out", async () => {
    await kysely
      .updateTable("profiles")
      .set({ cpf: "111.111.111-11" })
      .where("id", "=", profileId)
      .execute()
    const payment = await openCharge()

    const result = await pickOption({
      paymentId: payment.id,
      profileId,
      optionId: "pix",
    })

    expect(result.success).toBe(false)
    expect(createAsaasCustomer).not.toHaveBeenCalled()
    expect(createAsaasPayment).not.toHaveBeenCalled()
  })

  it("refuses an unknown option", async () => {
    const payment = await openCharge()

    const result = await pickOption({
      paymentId: payment.id,
      profileId,
      optionId: "card_9",
    })

    expect(result.success).toBe(false)
    expect(createAsaasPayment).not.toHaveBeenCalled()
  })

  it("refuses someone else's charge", async () => {
    const payment = await openCharge()

    const result = await pickOption({
      paymentId: payment.id,
      profileId: otherProfileId,
      optionId: "pix",
    })

    expect(result.success).toBe(false)
    expect(createAsaasPayment).not.toHaveBeenCalled()
  })

  it("refuses a charge that is not open", async () => {
    const cancelled = await createTestPayment(tracker, kysely, {
      event_participant_id: otherParticipantId,
      kind: "asaas",
      status: "cancelled",
      amount: null,
      method: null,
      paid_at: null,
    })

    const result = await pickOption({
      paymentId: cancelled.id,
      profileId: otherProfileId,
      optionId: "pix",
    })

    expect(result.success).toBe(false)
    expect(createAsaasPayment).not.toHaveBeenCalled()
  })

  it("creates nothing while payments are switched off", async () => {
    paymentsEnabled.value = false
    const payment = await openCharge()

    const result = await pickOption({
      paymentId: payment.id,
      profileId,
      optionId: "pix",
    })

    expect(result.success).toBe(false)
    expect(createAsaasPayment).not.toHaveBeenCalled()
    expect(createAsaasCustomer).not.toHaveBeenCalled()
  })
})
