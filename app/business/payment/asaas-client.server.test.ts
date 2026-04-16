import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mockEnv = vi.hoisted(() => ({
  asaasApiKey: "test-key" as string | undefined,
  asaasApiUrl: "https://sandbox.asaas.com/api/v3" as string | undefined,
}))

vi.mock("~/env.server", () => ({
  env: () => mockEnv,
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  cancelAsaasPayment,
  createAsaasCustomer,
  createAsaasPayment,
  refundAsaasPayment,
} from "./asaas-client.server"
import { logger } from "~/lib/logger/logger.server"

const okResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 })

describe("Asaas client", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockEnv.asaasApiKey = "test-key"
    mockEnv.asaasApiUrl = "https://sandbox.asaas.com/api/v3"
  })

  describe("getAsaasConfig (via public callers)", () => {
    it("throws when ASAAS_API_KEY is missing", async () => {
      mockEnv.asaasApiKey = undefined
      await expect(
        createAsaasCustomer({ name: "x", cpfCnpj: "123" }),
      ).rejects.toThrow("Missing ASAAS_API_KEY or ASAAS_API_URL")
    })

    it("throws when ASAAS_API_URL is missing", async () => {
      mockEnv.asaasApiUrl = undefined
      await expect(
        createAsaasCustomer({ name: "x", cpfCnpj: "123" }),
      ).rejects.toThrow("Missing ASAAS_API_KEY or ASAAS_API_URL")
    })

    it("strips a single trailing slash from the API URL", async () => {
      mockEnv.asaasApiUrl = "https://sandbox.asaas.com/api/v3/"
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(okResponse({ id: "cus_1" }))

      await createAsaasCustomer({ name: "x", cpfCnpj: "123" })

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://sandbox.asaas.com/api/v3/customers",
        expect.anything(),
      )
    })

    it("strips multiple trailing slashes from the API URL", async () => {
      mockEnv.asaasApiUrl = "https://sandbox.asaas.com/api/v3///"
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(okResponse({ id: "cus_1" }))

      await createAsaasCustomer({ name: "x", cpfCnpj: "123" })

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://sandbox.asaas.com/api/v3/customers",
        expect.anything(),
      )
    })

    it("leaves a URL without trailing slash unchanged", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(okResponse({ id: "cus_1" }))

      await createAsaasCustomer({ name: "x", cpfCnpj: "123" })

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://sandbox.asaas.com/api/v3/customers",
        expect.anything(),
      )
    })
  })

  describe("createAsaasCustomer", () => {
    it("returns validated customer with id", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        okResponse({ id: "cus_123", name: "Test", cpfCnpj: "12345" }),
      )

      const result = await createAsaasCustomer({
        name: "Test",
        cpfCnpj: "12345",
      })

      expect(result).toEqual({ id: "cus_123" })
    })

    it("throws on malformed response (missing id)", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        okResponse({ name: "Test" }),
      )

      await expect(
        createAsaasCustomer({ name: "Test", cpfCnpj: "12345" }),
      ).rejects.toThrow()
    })

    it("sends optional email and phone as mobilePhone", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(okResponse({ id: "cus_1" }))

      await createAsaasCustomer({
        name: "Test",
        cpfCnpj: "12345",
        email: "test@x.com",
        phone: "11999999999",
      })

      const sentBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
      expect(sentBody.email).toBe("test@x.com")
      expect(sentBody.mobilePhone).toBe("11999999999")
    })
  })

  describe("createAsaasPayment", () => {
    it("returns validated payment with id and invoiceUrl", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        okResponse({
          id: "pay_123",
          invoiceUrl: "https://sandbox.asaas.com/i/123",
          status: "PENDING",
        }),
      )

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

    it("accepts null invoiceUrl (PIX case)", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        okResponse({ id: "pay_123", invoiceUrl: null }),
      )

      const result = await createAsaasPayment({
        customerId: "cus_123",
        billingType: "PIX",
        value: 220,
        dueDate: "2026-03-17",
      })

      expect(result.invoiceUrl).toBeNull()
    })

    it("throws when installmentCount > 1 (installmentValue not yet implemented)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch")

      await expect(
        createAsaasPayment({
          customerId: "cus_1",
          billingType: "CREDIT_CARD",
          value: 227,
          dueDate: "2026-03-17",
          installmentCount: 3,
        }),
      ).rejects.toThrow("installmentCount > 1 requires installmentValue")

      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it("does not send installmentCount for PIX", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          okResponse({ id: "pay_1", invoiceUrl: "https://x" }),
        )

      await createAsaasPayment({
        customerId: "cus_1",
        billingType: "PIX",
        value: 220,
        dueDate: "2026-03-17",
      })

      const sentBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
      expect(sentBody.installmentCount).toBeUndefined()
    })

    it("does not send installmentCount when it is 1 (single payment)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          okResponse({ id: "pay_1", invoiceUrl: "https://x" }),
        )

      await createAsaasPayment({
        customerId: "cus_1",
        billingType: "CREDIT_CARD",
        value: 227,
        dueDate: "2026-03-17",
        installmentCount: 1,
      })

      const sentBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
      expect(sentBody.installmentCount).toBeUndefined()
    })
  })

  describe("refundAsaasPayment", () => {
    it("calls POST /payments/{id}/refund", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(okResponse({ id: "pay_123" }))

      await refundAsaasPayment("pay_123")

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://sandbox.asaas.com/api/v3/payments/pay_123/refund",
        expect.objectContaining({ method: "POST" }),
      )
    })

    it("sends value when provided (partial refund)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(okResponse({ id: "pay_123" }))

      await refundAsaasPayment("pay_123", 50)

      const sentBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
      expect(sentBody.value).toBe(50)
    })

    it("throws on HTTP error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Not Found", { status: 404 }),
      )

      await expect(refundAsaasPayment("pay_123")).rejects.toThrow(
        "Asaas API error (404)",
      )
    })
  })

  describe("cancelAsaasPayment", () => {
    it("calls DELETE /payments/{id}", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(okResponse({ deleted: true, id: "pay_123" }))

      await cancelAsaasPayment("pay_123")

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://sandbox.asaas.com/api/v3/payments/pay_123",
        expect.objectContaining({ method: "DELETE" }),
      )
    })

    it("does not send Content-Type header for DELETE requests", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(okResponse({ deleted: true, id: "pay_123" }))

      await cancelAsaasPayment("pay_123")

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<
        string,
        string
      >
      expect(headers["Content-Type"]).toBeUndefined()
    })

    it("throws when Asaas returns deleted: false", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        okResponse({ deleted: false, id: "pay_123" }),
      )

      await expect(cancelAsaasPayment("pay_123")).rejects.toThrow(
        "Asaas refused to delete payment pay_123 (deleted=false)",
      )
    })

    it("throws on HTTP error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Not Found", { status: 404 }),
      )

      await expect(cancelAsaasPayment("pay_123")).rejects.toThrow(
        "Asaas API error (404)",
      )
    })
  })

  describe("Zod response validation", () => {
    it("strips extra fields from response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        okResponse({ id: "cus_1", extraField: "should be stripped" }),
      )

      const result = await createAsaasCustomer({
        name: "x",
        cpfCnpj: "123",
      })

      expect(result).toEqual({ id: "cus_1" })
      expect((result as Record<string, unknown>).extraField).toBeUndefined()
    })
  })

  describe("error path — PII-safe error handling", () => {
    it("does NOT include the Asaas error body in the thrown error message", async () => {
      const sensitivePII =
        '{"errors":[{"code":"invalid_cpf","description":"CPF 12345678900 for user foo@example.com is invalid"}]}'
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(sensitivePII, { status: 422 }),
      )

      let thrown: unknown
      try {
        await createAsaasCustomer({ name: "x", cpfCnpj: "12345678900" })
      } catch (e) {
        thrown = e
      }

      expect(thrown).toBeInstanceOf(Error)
      const message = (thrown as Error).message
      expect(message).toBe("Asaas API error (422)")
      expect(message).not.toContain("12345678900")
      expect(message).not.toContain("foo@example.com")
      expect(message).not.toContain("invalid_cpf")
    })

    it("logs the truncated error body server-side with status + path", async () => {
      const errorSpy = vi.mocked(logger.error)
      const body = '{"errors":[{"code":"x","description":"boom"}]}'
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(body, { status: 500 }),
      )

      await expect(
        createAsaasCustomer({ name: "x", cpfCnpj: "123" }),
      ).rejects.toThrow()

      expect(errorSpy).toHaveBeenCalledWith(
        "Asaas API request failed",
        expect.objectContaining({
          path: "/customers",
          status: 500,
          body: expect.any(String),
        }),
      )
    })

    it("truncates the logged body when the Asaas response is long", async () => {
      const longBody = "x".repeat(5000)
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(longBody, { status: 500 }),
      )

      await expect(
        createAsaasCustomer({ name: "x", cpfCnpj: "123" }),
      ).rejects.toThrow()

      expect(logger.error).toHaveBeenCalledWith(
        "Asaas API request failed",
        expect.objectContaining({
          body: expect.stringMatching(/^x{1,500}$/),
        }),
      )
    })

    it("handles an unreadable response body without crashing", async () => {
      const response = new Response("ignored", { status: 500 })
      vi.spyOn(response, "text").mockRejectedValue(new Error("stream dead"))
      vi.spyOn(globalThis, "fetch").mockResolvedValue(response)

      await expect(
        createAsaasCustomer({ name: "x", cpfCnpj: "123" }),
      ).rejects.toThrow("Asaas API error (500)")
    })
  })

  describe("timeout", () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it("aborts the request after 30 seconds", async () => {
      vi.useFakeTimers()

      vi.spyOn(globalThis, "fetch").mockImplementation(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(
                new DOMException(
                  "The operation was aborted.",
                  "AbortError",
                ),
              )
            })
          }),
      )

      const customerPromise = createAsaasCustomer({
        name: "x",
        cpfCnpj: "123",
      })

      vi.advanceTimersByTime(30_000)

      await expect(customerPromise).rejects.toThrow()
    })

    it("logs network/timeout errors with request context", async () => {
      const networkError = new TypeError("fetch failed")
      vi.spyOn(globalThis, "fetch").mockRejectedValue(networkError)

      await expect(
        createAsaasCustomer({ name: "x", cpfCnpj: "123" }),
      ).rejects.toThrow("fetch failed")

      expect(logger.error).toHaveBeenCalledWith(
        "Asaas API request failed (network/timeout)",
        expect.objectContaining({
          path: "/customers",
          method: "POST",
          error: "fetch failed",
        }),
      )
    })
  })
})
