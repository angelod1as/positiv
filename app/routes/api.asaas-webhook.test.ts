import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("~/lib/features.server", () => ({
  isPaymentSystemEnabled: vi.fn(),
}))

vi.mock("~/integrations/asaas/client.server", () => ({
  verifyWebhookSignature: vi.fn(),
}))

vi.mock("~/business/admin/handle-webhook-payment.server", () => ({
  handleWebhookPayment: vi.fn(),
}))

import { action } from "./api.asaas-webhook"
import { isPaymentSystemEnabled } from "~/lib/features.server"
import { verifyWebhookSignature } from "~/integrations/asaas/client.server"
import { handleWebhookPayment } from "~/business/admin/handle-webhook-payment.server"

function makeRequest(
  body: unknown = {},
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api/webhooks/asaas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe("api.asaas-webhook action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 200 with empty body for any POST", async () => {
    vi.mocked(isPaymentSystemEnabled).mockReturnValue(false)

    const response = await action({
      request: makeRequest(),
      params: {},
      context: {},
    })

    expect(response.status).toBe(200)
  })

  it("should return 200 with ignored:true when payment system is disabled", async () => {
    vi.mocked(isPaymentSystemEnabled).mockReturnValue(false)

    const response = await action({
      request: makeRequest(),
      params: {},
      context: {},
    })

    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.ignored).toBe(true)
  })

  it("should return 200 with ignored:true when webhook token is invalid", async () => {
    vi.mocked(isPaymentSystemEnabled).mockReturnValue(true)
    vi.mocked(verifyWebhookSignature).mockReturnValue(false)

    const response = await action({
      request: makeRequest({}, { "asaas-access-token": "bad-token" }),
      params: {},
      context: {},
    })

    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.ignored).toBe(true)
  })

  it("should return 200 with ignored:true when webhook token is missing", async () => {
    vi.mocked(isPaymentSystemEnabled).mockReturnValue(true)
    vi.mocked(verifyWebhookSignature).mockReturnValue(false)

    const response = await action({
      request: makeRequest(),
      params: {},
      context: {},
    })

    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.ignored).toBe(true)
  })

  it("should return 200 with ignored:true for unhandled event types", async () => {
    vi.mocked(isPaymentSystemEnabled).mockReturnValue(true)
    vi.mocked(verifyWebhookSignature).mockReturnValue(true)

    const response = await action({
      request: makeRequest(
        { event: "PAYMENT_CREATED", payment: { id: "pay_123" } },
        { "asaas-access-token": "valid-token" },
      ),
      params: {},
      context: {},
    })

    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.ignored).toBe(true)
  })

  it("should call handleWebhookPayment for handled events", async () => {
    vi.mocked(isPaymentSystemEnabled).mockReturnValue(true)
    vi.mocked(verifyWebhookSignature).mockReturnValue(true)
    vi.mocked(handleWebhookPayment).mockResolvedValue()

    const payload = {
      event: "PAYMENT_CONFIRMED",
      payment: { id: "pay_123", billingType: "PIX" },
    }

    const response = await action({
      request: makeRequest(payload, { "asaas-access-token": "valid-token" }),
      params: {},
      context: {},
    })

    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(handleWebhookPayment).toHaveBeenCalledWith(payload)
  })

  it("should return 200 even when handleWebhookPayment throws", async () => {
    vi.mocked(isPaymentSystemEnabled).mockReturnValue(true)
    vi.mocked(verifyWebhookSignature).mockReturnValue(true)
    vi.mocked(handleWebhookPayment).mockRejectedValue(
      new Error("DB connection failed"),
    )

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const payload = {
      event: "PAYMENT_CONFIRMED",
      payment: { id: "pay_123", billingType: "PIX" },
    }

    const response = await action({
      request: makeRequest(payload, { "asaas-access-token": "valid-token" }),
      params: {},
      context: {},
    })

    expect(response.status).toBe(200)
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
