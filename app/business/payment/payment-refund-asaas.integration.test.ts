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

const { listAsaasInstallmentPayments, refundAsaasPayment, logger } = vi.hoisted(
  () => ({
    listAsaasInstallmentPayments: vi.fn(),
    refundAsaasPayment: vi.fn(),
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  }),
)

vi.mock("./asaas-client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./asaas-client.server")>()
  return { ...original, listAsaasInstallmentPayments, refundAsaasPayment }
})

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

import { requestRefund } from "./payment-refund.server"

describe("requestRefund", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string
  let counter = 0

  beforeEach(async () => {
    tracker.clear()
    counter += 1
    vi.clearAllMocks()
    listAsaasInstallmentPayments.mockResolvedValue([])
    refundAsaasPayment.mockResolvedValue(undefined)

    const testId = `${Date.now()}-${counter}`
    const event = await createTestEvent(tracker, kysely, {
      title: "Refund Event",
      ticket_price: 20000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-asaas-refund@example.com`,
      full_name: "Refund Tester",
    })
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

  const paidCharge = (overrides: Record<string, unknown> = {}) =>
    createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      method: "pix",
      base_amount: 20000,
      amount: 22199,
      asaas_net: 21900,
      asaas_payment_id: `pay_${counter}`,
      ...overrides,
    })

  const reload = (id: string) =>
    kysely
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow()

  it("claims the request and asks Asaas for what Positiv received", async () => {
    const payment = await paidCharge()

    const result = await requestRefund({
      paymentId: payment.id,
      amount: null,
      reason: "Cancelou",
    })

    expect(result.success).toBe(true)
    expect(refundAsaasPayment).toHaveBeenCalledWith(`pay_${counter}`, {
      amount: 21900,
      description: "Cancelou",
    })

    const after = await reload(payment.id)
    expect(after.refund_requested_at).not.toBeNull()
    // The webhook, not this call, moves the status.
    expect(after.status).toBe("paid")
    expect(after.refund_amount).toBeNull()
  })

  it("asks for a smaller amount when one is given", async () => {
    const payment = await paidCharge()

    await requestRefund({ paymentId: payment.id, amount: "50", reason: null })

    expect(refundAsaasPayment).toHaveBeenCalledWith(`pay_${counter}`, {
      amount: 5000,
      description: null,
    })
  })

  it("refunds a card plan one charge at a time", async () => {
    listAsaasInstallmentPayments.mockResolvedValue([
      { id: "pay_a", value: 7877 },
      { id: "pay_b", value: 7877 },
      { id: "pay_c", value: 7877 },
    ])
    const payment = await paidCharge({
      method: "credit_card",
      installment_count: 3,
      amount: 23631,
      asaas_net: 21900,
      asaas_installment_id: `inst_${counter}`,
    })

    const result = await requestRefund({
      paymentId: payment.id,
      amount: null,
      reason: null,
    })

    expect(result.success).toBe(true)
    expect(listAsaasInstallmentPayments).toHaveBeenCalledWith(`inst_${counter}`)
    expect(refundAsaasPayment.mock.calls).toEqual([
      ["pay_a", { amount: 7300, description: null }],
      ["pay_b", { amount: 7300, description: null }],
      ["pay_c", { amount: 7300, description: null }],
    ])
  })

  it("asks Asaas once however many times it is clicked", async () => {
    const payment = await paidCharge()

    const [first, second] = await Promise.all([
      requestRefund({ paymentId: payment.id, amount: null, reason: null }),
      requestRefund({ paymentId: payment.id, amount: null, reason: null }),
    ])

    expect([first.success, second.success].filter(Boolean)).toHaveLength(1)
    expect(refundAsaasPayment).toHaveBeenCalledTimes(1)
  })

  it("releases the claim when Asaas refuses and nothing moved", async () => {
    refundAsaasPayment.mockRejectedValueOnce(
      new Error("Asaas 400 on /payments/pay_1/refund: invalid_value"),
    )
    const payment = await paidCharge()

    const result = await requestRefund({
      paymentId: payment.id,
      amount: null,
      reason: null,
    })

    expect(result.success).toBe(false)
    const after = await reload(payment.id)
    expect(after.refund_requested_at).toBeNull()
    expect(after.status).toBe("paid")
    expect(logger.error).toHaveBeenCalled()
  })

  it("keeps the claim when part of a plan was already given back", async () => {
    listAsaasInstallmentPayments.mockResolvedValue([
      { id: "pay_a", value: 7877 },
      { id: "pay_b", value: 7877 },
      { id: "pay_c", value: 7877 },
    ])
    refundAsaasPayment
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Asaas 400 on /payments/pay_b/refund"))
    const payment = await paidCharge({
      method: "credit_card",
      installment_count: 3,
      amount: 23631,
      asaas_net: 21900,
      asaas_installment_id: `inst_${counter}`,
    })

    const result = await requestRefund({
      paymentId: payment.id,
      amount: null,
      reason: null,
    })

    expect(result.success).toBe(false)
    // Releasing it would let a second attempt refund pay_a twice.
    const after = await reload(payment.id)
    expect(after.refund_requested_at).not.toBeNull()
    expect(after.status).toBe("paid")
    expect(refundAsaasPayment).toHaveBeenCalledTimes(2)
    expect(logger.error).toHaveBeenCalled()
  })

  it("refuses to give back more than Positiv received", async () => {
    const payment = await paidCharge()

    const result = await requestRefund({
      paymentId: payment.id,
      // The gross the participant paid, which is more than the net.
      amount: "221,99",
      reason: null,
    })

    expect(result.success).toBe(false)
    expect(refundAsaasPayment).not.toHaveBeenCalled()
    expect((await reload(payment.id)).refund_requested_at).toBeNull()
  })

  it("refuses a charge whose net Asaas has not reported yet", async () => {
    const payment = await paidCharge({ asaas_net: null })

    const result = await requestRefund({
      paymentId: payment.id,
      amount: null,
      reason: null,
    })

    // Giving back the gross would be a full refund, and Asaas keeps the
    // anticipation on one. Waiting costs nothing; refunding blind costs the
    // anticipation on every charge refunded in that window.
    expect(result.success).toBe(false)
    expect(refundAsaasPayment).not.toHaveBeenCalled()
    expect((await reload(payment.id)).refund_requested_at).toBeNull()
  })

  it("refuses a charge that was never paid", async () => {
    const payment = await paidCharge({
      status: "awaiting_payment",
      paid_at: null,
      asaas_net: null,
    })

    const result = await requestRefund({
      paymentId: payment.id,
      amount: null,
      reason: null,
    })

    expect(result.success).toBe(false)
    expect(refundAsaasPayment).not.toHaveBeenCalled()
  })

  it("refuses a manual payment — that one is marked by hand", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "manual",
      method: "pix",
      amount: 22000,
    })

    const result = await requestRefund({
      paymentId: payment.id,
      amount: null,
      reason: null,
    })

    expect(result.success).toBe(false)
    expect(refundAsaasPayment).not.toHaveBeenCalled()
  })
})
