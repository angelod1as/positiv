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
  refundAsaasInstallment,
  refundAsaasPayment,
  logger,
  onlinePayments,
} = vi.hoisted(() => ({
  refundAsaasInstallment: vi.fn(),
  refundAsaasPayment: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  onlinePayments: { enabled: true },
}))

vi.mock("./asaas-client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./asaas-client.server")>()
  return { ...original, refundAsaasInstallment, refundAsaasPayment }
})

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

vi.mock("~/business/settings/app-settings.server", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("~/business/settings/app-settings.server")
  >()),
  isOnlinePaymentsEnabled: async () => onlinePayments.enabled,
}))

import { AsaasError } from "./asaas-client.server"
import { requestRefund } from "./payment-refund.server"

describe("requestRefund", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string
  let counter = 0

  beforeEach(async () => {
    tracker.clear()
    counter += 1
    onlinePayments.enabled = true
    vi.clearAllMocks()
    refundAsaasInstallment.mockResolvedValue(undefined)
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
    // What the webhook needs to know which event completes the refund.
    expect(after.refund_requested_amount).toBe(21900)
    // The webhook, not this call, moves the status.
    expect(after.status).toBe("paid")
    expect(after.refund_amount).toBeNull()
  })

  it("clears the last denial once the refund is asked for again", async () => {
    const payment = await paidCharge({
      refund_denied_at: new Date().toISOString(),
      refund_denial_reason: "Falha ao processar a transferência.",
    })

    await requestRefund({ paymentId: payment.id, amount: null, reason: null })

    const after = await reload(payment.id)
    expect(after.refund_denied_at).toBeNull()
    expect(after.refund_denial_reason).toBeNull()
  })

  // Switching online payments off stops new charges. Money already taken
  // online can only go back through Asaas, so refunds must keep working.
  it("refunds a paid charge while online payments are switched off", async () => {
    onlinePayments.enabled = false
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
  })

  it("asks for a smaller amount when one is given", async () => {
    const payment = await paidCharge()

    await requestRefund({ paymentId: payment.id, amount: "50", reason: null })

    expect(refundAsaasPayment).toHaveBeenCalledWith(`pay_${counter}`, {
      amount: 5000,
      description: null,
    })
  })

  it("sends no description when the reason field is left blank", async () => {
    const payment = await paidCharge()

    await requestRefund({ paymentId: payment.id, amount: "", reason: "" })

    expect(refundAsaasPayment).toHaveBeenCalledWith(`pay_${counter}`, {
      amount: 21900,
      description: null,
    })
  })

  const cardPlan = () =>
    paidCharge({
      method: "credit_card",
      installment_count: 3,
      amount: 23631,
      asaas_net: 21900,
      asaas_installment_id: `inst_${counter}`,
    })

  // Asaas refuses a refund on one charge of a plan, so the plan is refunded
  // through the plan, with the total Positiv received.
  it("refunds a card plan through the plan, never charge by charge", async () => {
    const payment = await cardPlan()

    const result = await requestRefund({
      paymentId: payment.id,
      amount: null,
      reason: null,
    })

    expect(result.success).toBe(true)
    expect(refundAsaasInstallment).toHaveBeenCalledWith(`inst_${counter}`, {
      amount: 21900,
    })
    expect(refundAsaasPayment).not.toHaveBeenCalled()
    const after = await reload(payment.id)
    expect(after.refund_requested_at).not.toBeNull()
    expect(after.refund_requested_amount).toBe(21900)
  })

  it("asks a card plan for a smaller amount when one is given", async () => {
    const payment = await cardPlan()

    await requestRefund({ paymentId: payment.id, amount: "100", reason: null })

    expect(refundAsaasInstallment).toHaveBeenCalledWith(`inst_${counter}`, {
      amount: 10000,
    })
  })

  it("releases a card plan's claim when Asaas refuses the refund", async () => {
    refundAsaasInstallment.mockRejectedValueOnce(
      new AsaasError(
        400,
        [{ code: "invalid_action", description: "Saldo insuficiente" }],
        `/installments/inst_${counter}/refund`,
      ),
    )
    const payment = await cardPlan()

    const result = await requestRefund({
      paymentId: payment.id,
      amount: null,
      reason: null,
    })

    expect(result.success).toBe(false)
    expect((await reload(payment.id)).refund_requested_at).toBeNull()
  })

  it("keeps a card plan's claim when Asaas does not answer", async () => {
    refundAsaasInstallment.mockRejectedValueOnce(new TypeError("fetch failed"))
    const payment = await cardPlan()

    const result = await requestRefund({
      paymentId: payment.id,
      amount: null,
      reason: null,
    })

    expect(result.success).toBe(false)
    expect((await reload(payment.id)).refund_requested_at).not.toBeNull()
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
      new AsaasError(
        400,
        [{ code: "invalid_value", description: "Saldo insuficiente" }],
        "/payments/pay_1/refund",
      ),
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
    expect(after.refund_requested_amount).toBeNull()
    expect(after.status).toBe("paid")
    expect(logger.error).toHaveBeenCalled()
  })

  // A timeout, a dropped connection, a 5xx or an answer that does not parse all
  // leave it unknown whether Asaas refunded. Releasing the claim there would
  // bring the button back, and a second click would refund the same money again.
  it.each([
    ["Asaas does not answer in time", new DOMException("This operation was aborted", "AbortError")],
    ["the connection drops", new TypeError("fetch failed")],
    ["Asaas fails on its side", new AsaasError(503, [], "/payments/pay_1/refund")],
  ])("keeps the claim when %s", async (_, failure) => {
    refundAsaasPayment.mockRejectedValueOnce(failure)
    const payment = await paidCharge()

    const result = await requestRefund({
      paymentId: payment.id,
      amount: null,
      reason: null,
    })

    expect(result.success).toBe(false)
    expect(result.success ? null : result.errors[0].message).toBe(
      "Não deu para confirmar se o Asaas fez o reembolso. Confira no painel do Asaas antes de tentar de novo.",
    )
    const after = await reload(payment.id)
    expect(after.refund_requested_at).not.toBeNull()
    expect(after.refund_requested_amount).toBe(21900)
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
    // The limit is what Positiv received, not what was paid, and the admin
    // who typed the gross has to be told which one.
    expect(result.success ? null : result.errors[0].message).toBe(
      "O reembolso não pode ser maior que o que a Positiv recebeu, sem as taxas.",
    )
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
