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
  getAsaasPaymentRefunds,
  getAsaasInstallmentRefunds,
  listAsaasAnticipations,
  sendPaymentRefundEmail,
  logger,
} = vi.hoisted(() => ({
  getAsaasPaymentRefunds: vi.fn(),
  getAsaasInstallmentRefunds: vi.fn(),
  listAsaasAnticipations: vi.fn(),
  sendPaymentRefundEmail: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("./asaas-client.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./asaas-client.server")>()),
  getAsaasPaymentRefunds,
  getAsaasInstallmentRefunds,
  listAsaasAnticipations,
}))

vi.mock("./payment-emails.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./payment-emails.server")>()),
  sendPaymentRefundEmail,
}))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

import { paymentsCopy } from "~/copy/payments"
import { syncPaymentFromAsaas } from "./payment-sync.server"

describe("syncPaymentFromAsaas", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let participantId: string
  let counter = 0

  beforeEach(async () => {
    tracker.clear()
    counter += 1
    vi.clearAllMocks()
    getAsaasPaymentRefunds.mockResolvedValue([])
    getAsaasInstallmentRefunds.mockResolvedValue([])
    listAsaasAnticipations.mockResolvedValue([])
    sendPaymentRefundEmail.mockResolvedValue({ success: true })

    const testId = `${Date.now()}-${counter}`
    const event = await createTestEvent(tracker, kysely, {
      title: "Sync Event",
      ticket_price: 22000,
    })
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: `test${testId}-sync@example.com`,
      full_name: "Sync Tester",
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

  const cardPlan = (overrides: Record<string, unknown> = {}) =>
    createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      method: "credit_card",
      installment_count: 2,
      base_amount: 22000,
      amount: 23430,
      asaas_net: 22566,
      asaas_payment_id: `pay_${counter}`,
      asaas_installment_id: `inst_${counter}`,
      refund_requested_at: new Date().toISOString(),
      refund_requested_amount: 22566,
      ...overrides,
    })

  const reload = (id: string) =>
    kysely
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow()

  it("reads a plan's refunds and anticipation from Asaas onto the row", async () => {
    getAsaasInstallmentRefunds.mockResolvedValue([
      { value: 117.15, status: "DONE" },
      { value: 108.51, status: "PENDING" },
    ])
    listAsaasAnticipations.mockResolvedValue([
      { status: "PENDING", fee: 625 },
      { status: "PENDING", fee: 817 },
    ])
    const payment = await cardPlan()

    const result = await syncPaymentFromAsaas({ paymentId: payment.id })

    expect(result.success).toBe(true)
    expect(getAsaasInstallmentRefunds).toHaveBeenCalledWith(`inst_${counter}`)
    expect(listAsaasAnticipations).toHaveBeenCalledWith({
      installment: `inst_${counter}`,
    })
    const after = await reload(payment.id)
    expect(after.status).toBe("partially_refunded")
    expect(after.refund_amount).toBe(11715)
    expect(after.refund_pending_amount).toBe(10851)
    expect(after.anticipation_fee).toBe(1442)
    expect(after.anticipation_status).toBe("PENDING")
    expect(after.refunds_synced_at).not.toBeNull()
    expect(sendPaymentRefundEmail).not.toHaveBeenCalled()
  })

  it("closes the refund and tells the participant once, however often it is read", async () => {
    getAsaasInstallmentRefunds.mockResolvedValue([
      { value: 117.15, status: "DONE" },
      { value: 108.51, status: "DONE" },
    ])
    const payment = await cardPlan({
      status: "partially_refunded",
      refund_amount: 11715,
      refunded_at: new Date().toISOString(),
    })

    await syncPaymentFromAsaas({ paymentId: payment.id })
    await syncPaymentFromAsaas({ paymentId: payment.id })

    const after = await reload(payment.id)
    expect(after.refund_amount).toBe(22566)
    expect(after.refund_pending_amount).toBe(0)
    expect(sendPaymentRefundEmail).toHaveBeenCalledTimes(1)
  })

  it("reads a single charge from the charge", async () => {
    getAsaasPaymentRefunds.mockResolvedValue([{ value: 220, status: "DONE" }])
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "asaas",
      method: "pix",
      amount: 22199,
      asaas_net: 22000,
      asaas_payment_id: `pay_${counter}`,
    })

    await syncPaymentFromAsaas({ paymentId: payment.id })

    expect(getAsaasPaymentRefunds).toHaveBeenCalledWith(`pay_${counter}`)
    // A Pix is never anticipated, so there is nothing to ask about.
    expect(listAsaasAnticipations).not.toHaveBeenCalled()
    expect((await reload(payment.id)).refund_amount).toBe(22000)
  })

  it("still records the anticipation of a payment already refunded in full", async () => {
    listAsaasAnticipations.mockResolvedValue([{ status: "CANCELLED", fee: 625 }])
    const payment = await cardPlan({
      status: "refunded",
      refund_amount: 23430,
      refunded_at: new Date().toISOString(),
    })

    await syncPaymentFromAsaas({ paymentId: payment.id })

    const after = await reload(payment.id)
    expect(after.status).toBe("refunded")
    expect(after.anticipation_status).toBe("CANCELLED")
    expect(after.refunds_synced_at).not.toBeNull()
  })

  it("refuses a payment that did not go through Asaas", async () => {
    const payment = await createTestPayment(tracker, kysely, {
      event_participant_id: participantId,
      kind: "manual",
      method: "pix",
      amount: 22000,
    })

    const result = await syncPaymentFromAsaas({ paymentId: payment.id })

    expect(result.success === false && result.errors[0]?.message).toBe(
      paymentsCopy.errors.notSyncable,
    )
  })

  it("says Asaas did not answer rather than 'fetch failed'", async () => {
    getAsaasInstallmentRefunds.mockRejectedValue(new TypeError("fetch failed"))
    const payment = await cardPlan()

    const result = await syncPaymentFromAsaas({ paymentId: payment.id })

    expect(result.success === false && result.errors[0]?.message).toBe(
      paymentsCopy.asaasErrors.unavailable,
    )
    expect((await reload(payment.id)).refunds_synced_at).toBeNull()
  })
})
