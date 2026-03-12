import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~/env.server", () => ({
  env: vi.fn(),
}))

import { env } from "~/env.server"
import { getAsaasConfig, createPaymentCharge, getPaymentStatus, refundPayment, verifyWebhookSignature, getOrCreateAsaasCustomer, deletePayment } from "./client.server"
import type { AsaasCustomer, AsaasListResponse, AsaasPayment, CreateAsaasCustomerParams, CreatePaymentChargeParams, RefundAsaasPaymentParams } from "./types"

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

  it("throws when API key is empty string", () => {
    mockEnv.mockReturnValue({
      asaasApiKey: "",
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

const MOCK_ASAAS_CUSTOMER: AsaasCustomer = {
  object: "customer",
  id: "cus_abc123",
  dateCreated: "2026-03-10",
  name: "Test User",
  email: "test@example.com",
  phone: null,
  mobilePhone: null,
  cpfCnpj: "12345678901",
  personType: "FISICA",
  deleted: false,
  externalReference: null,
  notificationDisabled: false,
}

function mockCustomerListResponse(
  customers: AsaasCustomer[]
): AsaasListResponse<AsaasCustomer> {
  return {
    object: "list",
    hasMore: false,
    totalCount: customers.length,
    limit: 10,
    offset: 0,
    data: customers,
  }
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

  it("creates PIX charge with value in reais (centavos / 100) and billingType PIX", async () => {
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

  it("creates CREDIT_CARD charge with value in reais and 6 installments", async () => {
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

  it("uses fallback message when response body cannot be read", async () => {
    const badResponse = new Response(null, {
      status: 500,
      statusText: "Internal Server Error",
    })
    vi.spyOn(badResponse, "text").mockRejectedValueOnce(new Error("stream error"))
    vi.mocked(global.fetch).mockResolvedValueOnce(badResponse)

    const params: CreatePaymentChargeParams = {
      paymentMethod: "pix",
      customer: "cus_xyz789",
      dueDate: "2026-03-15",
    }

    await expect(createPaymentCharge(params)).rejects.toThrow(
      "Failed to create pix charge: 500 Internal Server Error. Response: Unable to read error body"
    )
  })

  it("does not include installmentCount or totalValue for PIX charges", async () => {
    const params: CreatePaymentChargeParams = {
      paymentMethod: "pix",
      customer: "cus_xyz789",
      dueDate: "2026-03-15",
    }

    await createPaymentCharge(params)

    const body = getLastFetchBody()
    expect(body).not.toHaveProperty("installmentCount")
    expect(body).not.toHaveProperty("totalValue")
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

describe("refundPayment", () => {
  beforeEach(() => {
    mockEnv.mockReturnValue({
      asaasApiKey: "test-api-key",
      asaasEnvironment: "sandbox",
    } as ReturnType<typeof env>)

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ...MOCK_ASAAS_PAYMENT, status: "REFUNDED" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("POSTs to the correct refund endpoint", async () => {
    await refundPayment("pay_abc123", {})

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api-sandbox.asaas.com/v3/payments/pay_abc123/refund",
      expect.objectContaining({
        method: "POST",
        signal: expect.any(AbortSignal),
      })
    )
  })

  it("sends value and description in body when provided", async () => {
    const params: RefundAsaasPaymentParams = {
      value: 100,
      description: "Partial refund",
    }

    await refundPayment("pay_abc123", params)

    const body = getLastFetchBody()
    expect(body.value).toBe(100)
    expect(body.description).toBe("Partial refund")
  })

  it("sends empty object when no optional params provided", async () => {
    await refundPayment("pay_abc123", {})

    const body = getLastFetchBody()
    expect(body).toEqual({})
  })

  it("returns AsaasPayment response", async () => {
    const result = await refundPayment("pay_abc123", {})

    expect(result.status).toBe("REFUNDED")
  })

  it("throws on non-ok response", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response("Refund not allowed", {
        status: 400,
        statusText: "Bad Request",
      })
    )

    await expect(refundPayment("pay_abc123", {})).rejects.toThrow(
      "Failed to refund payment: 400 Bad Request. Response: Refund not allowed"
    )
  })

  it("sends only value when description is not provided", async () => {
    await refundPayment("pay_abc123", { value: 50 })

    const body = getLastFetchBody()
    expect(body.value).toBe(50)
    expect(body).not.toHaveProperty("description")
  })

  it("sends only description when value is not provided", async () => {
    await refundPayment("pay_abc123", { description: "Full refund" })

    const body = getLastFetchBody()
    expect(body.description).toBe("Full refund")
    expect(body).not.toHaveProperty("value")
  })

  it("throws on network error", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"))

    await expect(refundPayment("pay_abc123", {})).rejects.toThrow("Network error")
  })
})

describe("verifyWebhookSignature", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns true when token matches asaasWebhookToken", () => {
    mockEnv.mockReturnValue({
      asaasWebhookToken: "my-webhook-secret",
    } as ReturnType<typeof env>)

    expect(verifyWebhookSignature("my-webhook-secret")).toBe(true)
  })

  it("returns false when token does not match", () => {
    mockEnv.mockReturnValue({
      asaasWebhookToken: "my-webhook-secret",
    } as ReturnType<typeof env>)

    expect(verifyWebhookSignature("wrong-token")).toBe(false)
  })

  it("returns false when asaasWebhookToken is not configured", () => {
    mockEnv.mockReturnValue({
      asaasWebhookToken: undefined,
    } as ReturnType<typeof env>)

    expect(verifyWebhookSignature("any-token")).toBe(false)
  })

  it("returns false for empty string token", () => {
    mockEnv.mockReturnValue({
      asaasWebhookToken: "my-webhook-secret",
    } as ReturnType<typeof env>)

    expect(verifyWebhookSignature("")).toBe(false)
  })
})

describe("getOrCreateAsaasCustomer", () => {
  beforeEach(() => {
    mockEnv.mockReturnValue({
      asaasApiKey: "test-api-key",
      asaasEnvironment: "sandbox",
    } as ReturnType<typeof env>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns existing customer when found by email", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockCustomerListResponse([MOCK_ASAAS_CUSTOMER])), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const params: CreateAsaasCustomerParams = {
      name: "Test User",
      cpfCnpj: "12345678901",
      email: "test@example.com",
    }

    const result = await getOrCreateAsaasCustomer(params)

    expect(result).toEqual(MOCK_ASAAS_CUSTOMER)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api-sandbox.asaas.com/v3/customers?email=test%40example.com",
      expect.objectContaining({ method: "GET" })
    )
  })

  it("skips deleted customers and creates a new one", async () => {
    const deletedCustomer: AsaasCustomer = { ...MOCK_ASAAS_CUSTOMER, id: "cus_deleted", deleted: true }

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockCustomerListResponse([deletedCustomer])), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ASAAS_CUSTOMER), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    const params: CreateAsaasCustomerParams = {
      name: "Test User",
      cpfCnpj: "12345678901",
      email: "test@example.com",
    }

    const result = await getOrCreateAsaasCustomer(params)

    expect(result).toEqual(MOCK_ASAAS_CUSTOMER)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch).toHaveBeenLastCalledWith(
      "https://api-sandbox.asaas.com/v3/customers",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("creates new customer when none found by email", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockCustomerListResponse([])), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ASAAS_CUSTOMER), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    const params: CreateAsaasCustomerParams = {
      name: "Test User",
      cpfCnpj: "12345678901",
      email: "test@example.com",
    }

    const result = await getOrCreateAsaasCustomer(params)

    expect(result).toEqual(MOCK_ASAAS_CUSTOMER)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch).toHaveBeenLastCalledWith(
      "https://api-sandbox.asaas.com/v3/customers",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("sends all CreateAsaasCustomerParams fields in POST body", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockCustomerListResponse([])), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ASAAS_CUSTOMER), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    const params: CreateAsaasCustomerParams = {
      name: "Test User",
      cpfCnpj: "12345678901",
      email: "test@example.com",
      phone: "11999999999",
      mobilePhone: "11988888888",
      externalReference: "ref-456",
      notificationDisabled: true,
    }

    await getOrCreateAsaasCustomer(params)

    const body = getLastFetchBody()
    expect(body.name).toBe("Test User")
    expect(body.cpfCnpj).toBe("12345678901")
    expect(body.email).toBe("test@example.com")
    expect(body.phone).toBe("11999999999")
    expect(body.mobilePhone).toBe("11988888888")
    expect(body.externalReference).toBe("ref-456")
    expect(body.notificationDisabled).toBe(true)
  })

  it("skips email search when email is undefined and goes straight to POST", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_ASAAS_CUSTOMER), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const params: CreateAsaasCustomerParams = {
      name: "Test User",
      cpfCnpj: "12345678901",
    }

    const result = await getOrCreateAsaasCustomer(params)

    expect(result).toEqual(MOCK_ASAAS_CUSTOMER)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api-sandbox.asaas.com/v3/customers",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("throws on search failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Internal error", {
        status: 500,
        statusText: "Internal Server Error",
      })
    )

    const params: CreateAsaasCustomerParams = {
      name: "Test User",
      cpfCnpj: "12345678901",
      email: "test@example.com",
    }

    await expect(getOrCreateAsaasCustomer(params)).rejects.toThrow(
      "Failed to search for customer: 500 Internal Server Error. Response: Internal error"
    )
  })

  it("throws on create failure", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockCustomerListResponse([])), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response("Invalid CPF", {
          status: 400,
          statusText: "Bad Request",
        })
      )

    const params: CreateAsaasCustomerParams = {
      name: "Test User",
      cpfCnpj: "invalid",
      email: "test@example.com",
    }

    await expect(getOrCreateAsaasCustomer(params)).rejects.toThrow(
      "Failed to create customer: 400 Bad Request. Response: Invalid CPF"
    )
  })

  it("returns first active customer when multiple exist", async () => {
    const firstActive: AsaasCustomer = { ...MOCK_ASAAS_CUSTOMER, id: "cus_first" }
    const secondActive: AsaasCustomer = { ...MOCK_ASAAS_CUSTOMER, id: "cus_second" }
    const thirdActive: AsaasCustomer = { ...MOCK_ASAAS_CUSTOMER, id: "cus_third" }

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify(mockCustomerListResponse([firstActive, secondActive, thirdActive])),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )

    const params: CreateAsaasCustomerParams = {
      name: "Test User",
      cpfCnpj: "12345678901",
      email: "test@example.com",
    }

    const result = await getOrCreateAsaasCustomer(params)

    expect(result.id).toBe("cus_first")
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it("creates new customer when all existing customers are deleted", async () => {
    const deleted1: AsaasCustomer = { ...MOCK_ASAAS_CUSTOMER, id: "cus_del1", deleted: true }
    const deleted2: AsaasCustomer = { ...MOCK_ASAAS_CUSTOMER, id: "cus_del2", deleted: true }
    const deleted3: AsaasCustomer = { ...MOCK_ASAAS_CUSTOMER, id: "cus_del3", deleted: true }

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(mockCustomerListResponse([deleted1, deleted2, deleted3])),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(MOCK_ASAAS_CUSTOMER), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    const params: CreateAsaasCustomerParams = {
      name: "Test User",
      cpfCnpj: "12345678901",
      email: "test@example.com",
    }

    const result = await getOrCreateAsaasCustomer(params)

    expect(result).toEqual(MOCK_ASAAS_CUSTOMER)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(global.fetch).toHaveBeenLastCalledWith(
      "https://api-sandbox.asaas.com/v3/customers",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("includes timeout signal in customer search fetch request", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockCustomerListResponse([MOCK_ASAAS_CUSTOMER])), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const params: CreateAsaasCustomerParams = {
      name: "Test User",
      cpfCnpj: "12345678901",
      email: "test@example.com",
    }

    await getOrCreateAsaasCustomer(params)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it("includes timeout signal in customer create fetch request", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_ASAAS_CUSTOMER), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    const params: CreateAsaasCustomerParams = {
      name: "Test User",
      cpfCnpj: "12345678901",
    }

    await getOrCreateAsaasCustomer(params)

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api-sandbox.asaas.com/v3/customers",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it("throws on network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"))

    const params: CreateAsaasCustomerParams = {
      name: "Test User",
      cpfCnpj: "12345678901",
      email: "test@example.com",
    }

    await expect(getOrCreateAsaasCustomer(params)).rejects.toThrow("Network error")
  })
})

describe("deletePayment", () => {
  beforeEach(() => {
    mockEnv.mockReturnValue({
      asaasApiKey: "test-api-key",
      asaasEnvironment: "sandbox",
    } as ReturnType<typeof env>)

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ deleted: true, id: "pay_abc123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("DELETEs the correct payment endpoint", async () => {
    await deletePayment("pay_abc123")

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api-sandbox.asaas.com/v3/payments/pay_abc123",
      expect.objectContaining({
        method: "DELETE",
        signal: expect.any(AbortSignal),
      })
    )
  })

  it("throws on non-ok response", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response("Payment not found", {
        status: 404,
        statusText: "Not Found",
      })
    )

    await expect(deletePayment("pay_invalid")).rejects.toThrow(
      "Failed to delete payment: 404 Not Found. Response: Payment not found"
    )
  })

  it("throws on network error", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"))

    await expect(deletePayment("pay_abc123")).rejects.toThrow("Network error")
  })
})
