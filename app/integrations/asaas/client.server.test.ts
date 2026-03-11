import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~/env.server", () => ({
  env: vi.fn(),
}))

import { env } from "~/env.server"
import { getAsaasConfig, createPaymentCharge, getPaymentStatus } from "./client.server"
import type { AsaasPayment, CreatePaymentChargeParams } from "./types"

const mockEnv = vi.mocked(env)

describe("getAsaasConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns sandbox baseUrl when environment is sandbox", () => {
    mockEnv.mockReturnValue({
      asaasApiKey: "test-api-key",
      asaasEnvironment: "sandbox",
    } as ReturnType<typeof env>)

    const config = getAsaasConfig()

    expect(config.baseUrl).toBe("https://api-sandbox.asaas.com/v3")
  })

  it("returns production baseUrl when environment is production", () => {
    mockEnv.mockReturnValue({
      asaasApiKey: "test-api-key",
      asaasEnvironment: "production",
    } as ReturnType<typeof env>)

    const config = getAsaasConfig()

    expect(config.baseUrl).toBe("https://api.asaas.com/v3")
  })

  it("includes access_token header with API key", () => {
    mockEnv.mockReturnValue({
      asaasApiKey: "my-secret-key",
      asaasEnvironment: "sandbox",
    } as ReturnType<typeof env>)

    const config = getAsaasConfig()

    expect(config.headers).toHaveProperty("access_token", "my-secret-key")
  })

  it("includes Content-Type application/json header", () => {
    mockEnv.mockReturnValue({
      asaasApiKey: "test-api-key",
      asaasEnvironment: "sandbox",
    } as ReturnType<typeof env>)

    const config = getAsaasConfig()

    expect(config.headers).toHaveProperty("Content-Type", "application/json")
  })

  it("throws when ASAAS_API_KEY is not configured", () => {
    mockEnv.mockReturnValue({
      asaasApiKey: undefined,
      asaasEnvironment: "sandbox",
    } as unknown as ReturnType<typeof env>)

    expect(() => getAsaasConfig()).toThrow("Asaas API key not configured")
  })
})

const MOCK_ASAAS_PAYMENT: AsaasPayment = {
  object: "payment",
  id: "pay_abc123",
  dateCreated: "2026-03-10",
  customer: "cus_xyz789",
  subscription: null,
  installment: null,
  paymentLink: null,
  value: 220,
  netValue: 210,
  originalValue: null,
  interestValue: null,
  billingType: "PIX",
  status: "PENDING",
  dueDate: "2026-03-15",
  originalDueDate: "2026-03-15",
  paymentDate: null,
  clientPaymentDate: null,
  creditDate: null,
  estimatedCreditDate: null,
  description: "Test payment",
  externalReference: null,
  installmentNumber: null,
  invoiceUrl: "https://sandbox.asaas.com/i/abc123",
  transactionReceiptUrl: null,
  deleted: false,
  anticipated: false,
  anticipable: false,
  bankSlipUrl: null,
  nossoNumero: null,
}

function getLastFetchBody(): Record<string, unknown> {
  const calls = vi.mocked(global.fetch).mock.calls
  const init = calls[calls.length - 1][1] as RequestInit
  return JSON.parse(init.body as string) as Record<string, unknown>
}

describe("createPaymentCharge", () => {
  beforeEach(() => {
    mockEnv.mockReturnValue({
      asaasApiKey: "test-api-key",
      asaasEnvironment: "sandbox",
    } as ReturnType<typeof env>)

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(MOCK_ASAAS_PAYMENT), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates PIX charge with amount 220 and billingType PIX", async () => {
    const params: CreatePaymentChargeParams = {
      paymentMethod: "pix",
      customer: "cus_xyz789",
      dueDate: "2026-03-15",
    }

    await createPaymentCharge(params)

    const body = getLastFetchBody()
    expect(body.billingType).toBe("PIX")
    expect(body.value).toBe(220)
    expect(body.installmentCount).toBeUndefined()
  })

  it("creates CREDIT_CARD charge with amount 227 and 6 installments", async () => {
    const params: CreatePaymentChargeParams = {
      paymentMethod: "credit_card",
      customer: "cus_xyz789",
      dueDate: "2026-03-15",
    }

    await createPaymentCharge(params)

    const body = getLastFetchBody()
    expect(body.billingType).toBe("CREDIT_CARD")
    expect(body.value).toBe(227)
    expect(body.installmentCount).toBe(6)
    expect(body.totalValue).toBe(227)
  })

  it("POSTs to the correct payments endpoint", async () => {
    const params: CreatePaymentChargeParams = {
      paymentMethod: "pix",
      customer: "cus_xyz789",
      dueDate: "2026-03-15",
    }

    await createPaymentCharge(params)

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api-sandbox.asaas.com/v3/payments",
      expect.objectContaining({
        method: "POST",
        signal: expect.any(AbortSignal),
      })
    )
  })

  it("passes customer, dueDate, description, externalReference, and callback", async () => {
    const params: CreatePaymentChargeParams = {
      paymentMethod: "pix",
      customer: "cus_xyz789",
      dueDate: "2026-03-15",
      description: "Event registration",
      externalReference: "ref-123",
      callback: { successUrl: "https://example.com/success", autoRedirect: true },
    }

    await createPaymentCharge(params)

    const body = getLastFetchBody()
    expect(body.customer).toBe("cus_xyz789")
    expect(body.dueDate).toBe("2026-03-15")
    expect(body.description).toBe("Event registration")
    expect(body.externalReference).toBe("ref-123")
    expect(body.callback).toEqual({
      successUrl: "https://example.com/success",
      autoRedirect: true,
    })
  })

  it("returns the AsaasPayment response from API", async () => {
    const params: CreatePaymentChargeParams = {
      paymentMethod: "pix",
      customer: "cus_xyz789",
      dueDate: "2026-03-15",
    }

    const result = await createPaymentCharge(params)

    expect(result).toEqual(MOCK_ASAAS_PAYMENT)
  })

  it("throws with descriptive error when API returns non-ok response", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response("Invalid customer", {
        status: 400,
        statusText: "Bad Request",
      })
    )

    const params: CreatePaymentChargeParams = {
      paymentMethod: "pix",
      customer: "invalid",
      dueDate: "2026-03-15",
    }

    await expect(createPaymentCharge(params)).rejects.toThrow(
      "Failed to create pix charge: 400 Bad Request. Response: Invalid customer"
    )
  })

  it("throws when fetch rejects with network error", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"))

    const params: CreatePaymentChargeParams = {
      paymentMethod: "credit_card",
      customer: "cus_xyz789",
      dueDate: "2026-03-15",
    }

    await expect(createPaymentCharge(params)).rejects.toThrow("Network error")
  })
})

describe("getPaymentStatus", () => {
  beforeEach(() => {
    mockEnv.mockReturnValue({
      asaasApiKey: "test-api-key",
      asaasEnvironment: "sandbox",
    } as ReturnType<typeof env>)

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(MOCK_ASAAS_PAYMENT), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("GETs the correct payment endpoint with paymentId", async () => {
    await getPaymentStatus("pay_abc123")

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api-sandbox.asaas.com/v3/payments/pay_abc123",
      expect.objectContaining({
        method: "GET",
        signal: expect.any(AbortSignal),
      })
    )
  })

  it("returns AsaasPayment response", async () => {
    const result = await getPaymentStatus("pay_abc123")

    expect(result).toEqual(MOCK_ASAAS_PAYMENT)
  })

  it("throws descriptive error on non-ok response", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response("Payment not found", {
        status: 404,
        statusText: "Not Found",
      })
    )

    await expect(getPaymentStatus("pay_invalid")).rejects.toThrow(
      "Failed to get payment status: 404 Not Found. Response: Payment not found"
    )
  })

  it("throws on network error", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"))

    await expect(getPaymentStatus("pay_abc123")).rejects.toThrow("Network error")
  })
})
