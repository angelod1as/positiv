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
  sendPaymentRefundEmail,
  logger,
} = vi.hoisted(() => ({
  getAsaasPaymentRefunds: vi.fn(),
  getAsaasInstallmentRefunds: vi.fn(),
  sendPaymentRefundEmail: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("./asaas-client.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./asaas-client.server")>()),
  getAsaasPaymentRefunds,
  getAsaasInstallmentRefunds,
}))

vi.mock("./payment-emails.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./payment-emails.server")>()),
  sendPaymentRefundEmail,
}))

vi.mock("~/lib/logger/logger.server", () => ({ logger }))

import { paymentsCopy } from "~/copy/payments"
import { syncOpenPayments, syncPaymentFromAsaas } from "./payment-sync.server"

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

  it("reads a plan's refunds from Asaas onto the row", async () => {
    getAsaasInstallmentRefunds.mockResolvedValue([
      { value: 117.15, status: "DONE" },
      { value: 108.51, status: "PENDING" },
    ])
    const payment = await cardPlan()

    const result = await syncPaymentFromAsaas({ paymentId: payment.id })

    expect(result.success).toBe(true)
    expect(getAsaasInstallmentRefunds).toHaveBeenCalledWith(`inst_${counter}`)
    const after = await reload(payment.id)
    expect(after.status).toBe("partially_refunded")
    expect(after.refund_amount).toBe(11715)
    expect(after.refund_pending_amount).toBe(10851)
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
    expect((await reload(payment.id)).refund_amount).toBe(22000)
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

  describe("syncOpenPayments", () => {
    it("reads only the payments Asaas still has news about", async () => {
      const refunding = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        method: "pix",
        amount: 22199,
        asaas_net: 22000,
        asaas_payment_id: `pay_refunding_${counter}`,
        refund_requested_at: new Date().toISOString(),
        refund_requested_amount: 22000,
      })
      const onItsWay = await cardPlan({
        asaas_payment_id: `pay_on_its_way_${counter}`,
        asaas_installment_id: `inst_on_its_way_${counter}`,
        refund_requested_at: null,
        refund_requested_amount: null,
        refund_pending_amount: 10851,
      })
      const settled = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        method: "pix",
        amount: 22199,
        asaas_net: 22000,
        asaas_payment_id: `pay_settled_${counter}`,
      })
      const justRead = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        method: "pix",
        amount: 22199,
        asaas_net: 22000,
        asaas_payment_id: `pay_read_${counter}`,
        refund_requested_at: new Date().toISOString(),
        refund_requested_amount: 22000,
        refunds_synced_at: new Date().toISOString(),
        refunds_sync_attempted_at: new Date().toISOString(),
      })

      const stats = await syncOpenPayments()

      const read = [
        ...getAsaasPaymentRefunds.mock.calls.map(([id]) => id),
        ...getAsaasInstallmentRefunds.mock.calls.map(([id]) => id),
      ]
      expect(read).toContain(refunding.asaas_payment_id)
      expect(read).toContain(onItsWay.asaas_installment_id)
      expect(read).not.toContain(settled.asaas_payment_id)
      // Read a moment ago: the next run gets it.
      expect(read).not.toContain(justRead.asaas_payment_id)
      expect(stats.failed).toBe(0)
      expect(stats.synced).toBeGreaterThanOrEqual(2)
    })

    it("keeps going when one payment cannot be read", async () => {
      getAsaasPaymentRefunds.mockRejectedValueOnce(new TypeError("fetch failed"))
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        method: "pix",
        amount: 22199,
        asaas_net: 22000,
        asaas_payment_id: `pay_first_${counter}`,
        refund_requested_at: new Date().toISOString(),
        refund_requested_amount: 22000,
      })
      await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        method: "pix",
        amount: 22199,
        asaas_net: 22000,
        asaas_payment_id: `pay_second_${counter}`,
        refund_requested_at: new Date().toISOString(),
        refund_requested_amount: 22000,
      })

      const stats = await syncOpenPayments()

      expect(stats.failed).toBe(1)
      expect(stats.synced).toBeGreaterThanOrEqual(1)
    })

    // A payment Asaas never answers about would otherwise stay first in line,
    // unread since forever, and twenty of them would fill every run.
    it("does not put a payment Asaas failed to answer about first in line again", async () => {
      getAsaasPaymentRefunds.mockRejectedValue(new TypeError("fetch failed"))
      const failing = await createTestPayment(tracker, kysely, {
        event_participant_id: participantId,
        kind: "asaas",
        method: "pix",
        amount: 22199,
        asaas_net: 22000,
        asaas_payment_id: `pay_failing_${counter}`,
        refund_requested_at: new Date().toISOString(),
        refund_requested_amount: 22000,
      })

      await syncOpenPayments()
      getAsaasPaymentRefunds.mockClear()
      await syncOpenPayments()

      expect(getAsaasPaymentRefunds).not.toHaveBeenCalledWith(
        failing.asaas_payment_id,
      )
      const after = await reload(failing.id)
      expect(after.refunds_sync_attempted_at).not.toBeNull()
      // Never read successfully, and the modal must not say otherwise.
      expect(after.refunds_synced_at).toBeNull()
    })

    // Anticipation is Asaas's business now, like every other money figure: a
    // card with no refund on its way has nothing left to tell the site.
    it("leaves alone a card payment with no refund on its way", async () => {
      const quiet = await cardPlan({
        asaas_payment_id: `pay_quiet_${counter}`,
        asaas_installment_id: `inst_quiet_${counter}`,
        refund_requested_at: null,
        refund_requested_amount: null,
        paid_at: new Date().toISOString(),
      })

      await syncOpenPayments()

      const read = getAsaasInstallmentRefunds.mock.calls.map(([id]) => id)
      expect(read).not.toContain(quiet.asaas_installment_id)
    })
  })
})
