import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("~/env.server", () => ({
  env: () => ({
    asaasApiKey: "test-api-key",
    asaasApiUrl: "https://sandbox.asaas.com/api/v3",
  }),
}))

import {
  cancelAsaasPayment,
  createAsaasCustomer,
  createAsaasPayment,
  refundAsaasPayment,
} from "./asaas-client.server"

describe("Asaas client", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function mockFetchResponse(body: unknown, status = 200) {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    )
  }

  function mockFetchError(errorBody: string, status: number) {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(errorBody, { status }),
    )
  }

  describe("createAsaasCustomer", () => {
    it("returns validated customer with id", async () => {
      mockFetchResponse({ id: "cus_123", name: "Test", cpfCnpj: "12345" })

      const result = await createAsaasCustomer({
        name: "Test",
        cpfCnpj: "12345",
      })

      expect(result).toEqual({ id: "cus_123" })
    })

    it("throws on malformed response (missing id)", async () => {
      mockFetchResponse({ name: "Test" })

      await expect(
        createAsaasCustomer({ name: "Test", cpfCnpj: "12345" }),
      ).rejects.toThrow()
    })

    it("throws on HTTP error with body", async () => {
      mockFetchError("Bad Request", 400)

      await expect(
        createAsaasCustomer({ name: "Test", cpfCnpj: "12345" }),
      ).rejects.toThrow("Asaas API error (400): Bad Request")
    })
  })

  describe("createAsaasPayment", () => {
    it("returns validated payment with id and invoiceUrl", async () => {
      mockFetchResponse({
        id: "pay_123",
        invoiceUrl: "https://sandbox.asaas.com/i/123",
        status: "PENDING",
      })

      const result = await createAsaasPayment({
        customerId: "cus_123",
        billingType: "PIX",
        value: 220,
        dueDate: "2026-03-17",
        description: "Test",
      })

      expect(result).toEqual({
        id: "pay_123",
        invoiceUrl: "https://sandbox.asaas.com/i/123",
      })
    })

    it("throws on malformed response (missing invoiceUrl)", async () => {
      mockFetchResponse({ id: "pay_123" })

      await expect(
        createAsaasPayment({
          customerId: "cus_123",
          billingType: "PIX",
          value: 220,
          dueDate: "2026-03-17",
        }),
      ).rejects.toThrow()
    })

    it("throws on HTTP error with body", async () => {
      mockFetchError("Unauthorized", 401)

      await expect(
        createAsaasPayment({
          customerId: "cus_123",
          billingType: "PIX",
          value: 220,
          dueDate: "2026-03-17",
        }),
      ).rejects.toThrow("Asaas API error (401): Unauthorized")
    })
  })

  describe("refundAsaasPayment", () => {
    it("calls POST /payments/{id}/refund", async () => {
      mockFetchResponse({ id: "pay_123", status: "REFUNDED" })

      await refundAsaasPayment("pay_123")

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://sandbox.asaas.com/api/v3/payments/pay_123/refund",
        expect.objectContaining({ method: "POST" }),
      )
    })

    it("passes value when provided", async () => {
      mockFetchResponse({ id: "pay_123", status: "REFUND_REQUESTED" })

      await refundAsaasPayment("pay_123", 50)

      const callBody = JSON.parse(
        vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string,
      )
      expect(callBody.value).toBe(50)
    })

    it("throws on HTTP error", async () => {
      mockFetchError("Not Found", 404)

      await expect(refundAsaasPayment("pay_123")).rejects.toThrow(
        "Asaas API error (404): Not Found",
      )
    })
  })

  describe("cancelAsaasPayment", () => {
    it("calls DELETE /payments/{id}", async () => {
      mockFetchResponse({ deleted: true, id: "pay_123" })

      await cancelAsaasPayment("pay_123")

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://sandbox.asaas.com/api/v3/payments/pay_123",
        expect.objectContaining({ method: "DELETE" }),
      )
    })

    it("throws on HTTP error", async () => {
      mockFetchError("Not Found", 404)

      await expect(cancelAsaasPayment("pay_123")).rejects.toThrow(
        "Asaas API error (404): Not Found",
      )
    })
  })
})
