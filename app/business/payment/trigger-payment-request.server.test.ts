import { describe, it, expect, vi, beforeEach } from "vitest"

const mockKyselyDb = vi.hoisted(() => {
  const results: unknown[] = []
  let callIndex = 0

  function chainProxy(): unknown {
    return new Proxy(
      {},
      {
        get(_, prop) {
          if (typeof prop === "symbol") return undefined
          if (prop === "then") return undefined
          if (prop === "executeTakeFirstOrThrow") {
            return () => Promise.resolve(results[callIndex++])
          }
          if (prop === "executeTakeFirst") {
            return () => Promise.resolve(results[callIndex++])
          }
          if (prop === "execute") return () => Promise.resolve([])
          return () => chainProxy()
        },
      },
    )
  }

  return {
    selectFrom: () => chainProxy(),
    insertInto: () => chainProxy(),
    updateTable: () => chainProxy(),
    _setResults: (r: unknown[]) => {
      results.length = 0
      results.push(...r)
      callIndex = 0
    },
  }
})

const mockEnv = vi.hoisted(() => ({
  paymentSystemOnline: true,
  appUrl: "https://www.positivparty.com",
  asaasApiKey: "test",
  asaasApiUrl: "https://sandbox.asaas.com/api/v3",
}))

vi.mock("~/kysely-db", () => ({ kyselyDb: mockKyselyDb }))

vi.mock("~/env.server", () => ({
  env: () => mockEnv,
}))

vi.mock("./send-payment-link-email.server", () => ({
  sendPaymentLinkEmail: vi.fn().mockResolvedValue({ emailSent: true }),
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("./payment-request.server", () => ({
  createPaymentRequest: vi.fn(),
  cancelActivePaymentRequest: vi.fn(),
}))

vi.mock("./asaas-client.server", () => ({
  refundAsaasPayment: vi.fn(),
}))

vi.mock("./send-payment-refund-email.server", () => ({
  sendPaymentRefundEmail: vi.fn().mockResolvedValue({ emailSent: true }),
}))

import { resolvePaymentRequest, handlePaymentStatusChange, processRefund } from "./trigger-payment-request.server"
import { sendPaymentLinkEmail } from "./send-payment-link-email.server"
import {
  createPaymentRequest,
  cancelActivePaymentRequest,
} from "./payment-request.server"
import { refundAsaasPayment } from "./asaas-client.server"
import { sendPaymentRefundEmail } from "./send-payment-refund-email.server"
import { logger } from "~/lib/logger/logger.server"

const newPaymentRequest = {
  id: "pr-new",
  event_participant_id: "ep-1",
  amount: 220,
  status: "pending" as const,
  expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  asaas_customer_id: null,
  asaas_payment_id: null,
  installment_count: null,
  invoice_url: null,
  paid_at: null,
  payment_method: null as "PIX" | "CREDIT_CARD" | null,
  payment_mode: "manual" as const,
  refund_amount: null,
  refunded_at: null,
}

describe("handlePaymentStatusChange", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.paymentSystemOnline = true
    vi.mocked(createPaymentRequest).mockResolvedValue(newPaymentRequest)
    vi.mocked(cancelActivePaymentRequest).mockResolvedValue(undefined)
  })

  it("returns triggered: false when status is not sent_payment_data", async () => {
    const result = await handlePaymentStatusChange({
      applicationStatus: "pending",
      eventParticipantId: "ep-1",
      eventId: "ev-1",
      profileId: "pr-1",
    })

    expect(result.triggered).toBe(false)
    expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
  })

  it("returns triggered: false when status is undefined", async () => {
    const result = await handlePaymentStatusChange({
      applicationStatus: undefined,
      eventParticipantId: "ep-1",
      eventId: "ev-1",
      profileId: "pr-1",
    })

    expect(result.triggered).toBe(false)
  })

  it("returns triggered: true with success when status is sent_payment_data", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
      { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: "12345678900" },
    ])

    const result = await handlePaymentStatusChange({
      applicationStatus: "sent_payment_data",
      eventParticipantId: "ep-1",
      eventId: "ev-1",
      profileId: "pr-1",
    })

    expect(result.triggered).toBe(true)
    if (result.triggered) expect(result.success).toBe(true)
  })

  it("returns triggered: true with failure when resolvePaymentRequest fails", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Free Event", ticket_price: null },
    ])

    const result = await handlePaymentStatusChange({
      applicationStatus: "sent_payment_data",
      eventParticipantId: "ep-1",
      eventId: "ev-1",
      profileId: "pr-1",
    })

    expect(result.triggered).toBe(true)
    if (result.triggered) expect(result.success).toBe(false)
  })

  it("forwards customAmount to resolvePaymentRequest", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
      { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: "12345678900" },
    ])

    const result = await handlePaymentStatusChange({
      applicationStatus: "sent_payment_data",
      eventParticipantId: "ep-1",
      eventId: "ev-1",
      profileId: "pr-1",
      customAmount: 75,
    })

    expect(result.triggered).toBe(true)
    if (result.triggered) expect(result.success).toBe(true)
    expect(createPaymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({ ticketPrice: 75 }),
    )
  })
})

describe("resolvePaymentRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.paymentSystemOnline = true
    vi.mocked(createPaymentRequest).mockResolvedValue(newPaymentRequest)
    vi.mocked(cancelActivePaymentRequest).mockResolvedValue(undefined)
  })

  it("cancels any existing active request before creating a new one", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
      { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: "12345678900" },
    ])

    const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1")

    expect(result.success).toBe(true)
    expect(cancelActivePaymentRequest).toHaveBeenCalledWith("ep-1")
    expect(createPaymentRequest).toHaveBeenCalledWith({
      eventParticipantId: "ep-1",
      ticketPrice: 220,
      paymentMode: "automatic",
    })
  })

  it("creates payment request and sends email when online", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
      { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: "12345678900" },
    ])

    const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1")

    expect(result.success).toBe(true)
    expect(sendPaymentLinkEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        participantEmail: "joao@test.com",
        participantName: "João",
        eventName: "Positiv Regular",
        ticketPrice: 220,
      }),
    )
  })

  it("creates manual payment request without email when offline", async () => {
    mockEnv.paymentSystemOnline = false

    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
    ])

    const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1")

    expect(result.success).toBe(true)
    expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
  })

  it("returns failure when event has no ticket_price", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Free Event", ticket_price: null },
    ])

    const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1")

    expect(result.success).toBe(false)
  })

  it("returns failure when profile has no CPF (online only)", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
      { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: null },
    ])

    const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1")

    expect(result.success).toBe(false)
    // CPF must be validated BEFORE any DB mutation so we don't orphan
    // a pending payment_request when the profile is incomplete.
    expect(cancelActivePaymentRequest).not.toHaveBeenCalled()
    expect(createPaymentRequest).not.toHaveBeenCalled()
  })

  it("does not require CPF when offline", async () => {
    mockEnv.paymentSystemOnline = false

    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
    ])

    const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1")

    expect(result.success).toBe(true)
  })

  it("uses paymentMode=automatic to override feature flag when provided", async () => {
    mockEnv.paymentSystemOnline = false

    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
      { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: "12345678900" },
    ])

    const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1", undefined, "automatic")

    expect(result.success).toBe(true)
    expect(sendPaymentLinkEmail).toHaveBeenCalled()
  })

  it("uses paymentMode=manual to override feature flag when provided", async () => {
    mockEnv.paymentSystemOnline = true

    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
    ])

    const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1", undefined, "manual")

    expect(result.success).toBe(true)
    expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
  })

  it("uses customAmount to override event.ticket_price", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
      { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: "12345678900" },
    ])

    await resolvePaymentRequest("ep-1", "ev-1", "pr-1", 150)

    expect(createPaymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({ ticketPrice: 150 }),
    )
    expect(sendPaymentLinkEmail).toHaveBeenCalledWith(
      expect.objectContaining({ ticketPrice: Number(newPaymentRequest.amount) }),
    )
  })

  it("falls back to event.ticket_price when customAmount is not provided", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
      { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: "12345678900" },
    ])

    await resolvePaymentRequest("ep-1", "ev-1", "pr-1")

    expect(createPaymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({ ticketPrice: 220 }),
    )
  })

  it("accepts customAmount even when event has no ticket_price (staff discount)", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Staff Event", ticket_price: null },
      { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: "12345678900" },
    ])

    const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1", 50)

    expect(result.success).toBe(true)
    expect(createPaymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({ ticketPrice: 50 }),
    )
  })

  it("customAmount works in offline (manual) mode", async () => {
    mockEnv.paymentSystemOnline = false

    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
    ])

    await resolvePaymentRequest("ep-1", "ev-1", "pr-1", 100)

    expect(createPaymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketPrice: 100,
        paymentMode: "manual",
      }),
    )
    expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
  })

  it("passes paymentMode from handlePaymentStatusChange to resolvePaymentRequest", async () => {
    mockEnv.paymentSystemOnline = true

    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
    ])

    const result = await handlePaymentStatusChange({
      applicationStatus: "sent_payment_data",
      eventParticipantId: "ep-1",
      eventId: "ev-1",
      profileId: "pr-1",
      paymentMode: "manual",
    })

    expect(result.triggered).toBe(true)
    if (result.triggered) expect(result.success).toBe(true)
    expect(createPaymentRequest).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMode: "manual" }),
    )
    expect(sendPaymentLinkEmail).not.toHaveBeenCalled()
  })
})

describe("processRefund", () => {
  beforeEach(() => vi.clearAllMocks())

  it("marks as refunded in DB then calls Asaas refund", async () => {
    const paidRequest = {
      id: "pr-paid",
      event_participant_id: "ep-1",
      asaas_payment_id: "pay_123",
      amount: 220,
      status: "paid",
    }

    const updatedRow = { ...paidRequest, status: "refunded" }
    mockKyselyDb._setResults([paidRequest, updatedRow])
    vi.mocked(refundAsaasPayment).mockResolvedValueOnce(undefined)

    const result = await processRefund("ep-1")

    expect(result.success).toBe(true)
    expect(refundAsaasPayment).toHaveBeenCalledWith("pay_123")
  })

  it("fails when payment is no longer in paid status (race condition)", async () => {
    const paidRequest = {
      id: "pr-paid",
      event_participant_id: "ep-1",
      asaas_payment_id: "pay_123",
      amount: 220,
      status: "paid",
    }

    mockKyselyDb._setResults([paidRequest, undefined])

    const result = await processRefund("ep-1")

    expect(result.success).toBe(false)
    expect(refundAsaasPayment).not.toHaveBeenCalled()
  })

  it("rolls back DB to paid if Asaas refund fails", async () => {
    const paidRequest = {
      id: "pr-paid",
      event_participant_id: "ep-1",
      asaas_payment_id: "pay_123",
      amount: 220,
      status: "paid",
    }

    const updatedRow = { ...paidRequest, status: "refunded" }
    const rolledBackRow = { ...paidRequest, status: "paid" }
    mockKyselyDb._setResults([paidRequest, updatedRow, rolledBackRow])
    vi.mocked(refundAsaasPayment).mockRejectedValueOnce(
      new Error("Asaas API error (500): Internal Server Error"),
    )

    const result = await processRefund("ep-1")

    expect(result.success).toBe(false)
    expect(refundAsaasPayment).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledWith(
      "Asaas refund failed, rolled back DB status to paid",
      expect.objectContaining({
        paymentRequestId: "pr-paid",
      }),
    )
  })

  it("fails when payment request has no asaas_payment_id", async () => {
    const paidRequest = {
      id: "pr-paid",
      event_participant_id: "ep-1",
      asaas_payment_id: null,
      amount: 220,
      status: "paid",
    }

    mockKyselyDb._setResults([paidRequest])

    const result = await processRefund("ep-1")

    expect(result.success).toBe(false)
  })

  it("fails when no paid payment request found", async () => {
    mockKyselyDb._setResults([undefined])

    const result = await processRefund("ep-1")

    expect(result.success).toBe(false)
  })

  it("still succeeds when refund email fails", async () => {
    const paidRequest = {
      id: "pr-paid",
      event_participant_id: "ep-1",
      asaas_payment_id: "pay_123",
      amount: 220,
      status: "paid",
    }

    mockKyselyDb._setResults([
      paidRequest,
      { ...paidRequest, status: "refunded" },
      { email: "joao@test.com", full_name: "João", title: "Positiv Regular" },
    ])
    vi.mocked(refundAsaasPayment).mockResolvedValueOnce(undefined)
    vi.mocked(sendPaymentRefundEmail).mockRejectedValueOnce(new Error("Email failed"))

    const result = await processRefund("ep-1")

    expect(result.success).toBe(true)
  })

  it("sends refund notification email after successful refund", async () => {
    const paidRequest = {
      id: "pr-paid",
      event_participant_id: "ep-1",
      asaas_payment_id: "pay_123",
      amount: 220,
      status: "paid",
    }

    mockKyselyDb._setResults([
      paidRequest,
      { ...paidRequest, status: "refunded" },
      { email: "joao@test.com", full_name: "João", title: "Positiv Regular" },
    ])
    vi.mocked(refundAsaasPayment).mockResolvedValueOnce(undefined)

    const result = await processRefund("ep-1")

    expect(result.success).toBe(true)
    expect(sendPaymentRefundEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        participantEmail: "joao@test.com",
        participantName: "João",
        eventName: "Positiv Regular",
        refundAmount: 220,
      }),
    )
  })
})
