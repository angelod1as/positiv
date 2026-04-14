import { describe, it, expect, vi, beforeEach } from "vitest"

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

import { createAsaasCustomer, createAsaasPayment } from "./asaas-client.server"
import { logger } from "~/lib/logger/logger.server"

const okResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 })

describe("asaas-client scaffold guard logic", () => {
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

  describe("createAsaasPayment installment guard", () => {
    it("throws when installmentCount > 1 (not yet implemented in scaffold)", async () => {
      // The guard must fire BEFORE any fetch call — we verify that by
      // not mocking fetch and expecting the throw to happen synchronously
      // enough that a real fetch would be caught.
      const fetchSpy = vi.spyOn(globalThis, "fetch")

      await expect(
        createAsaasPayment({
          customerId: "cus_1",
          billingType: "CREDIT_CARD",
          value: 100,
          dueDate: "2026-06-01",
          installmentCount: 3,
        }),
      ).rejects.toThrow("installmentCount > 1 is not yet implemented")

      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it("does NOT throw when installmentCount is 1 (proceeds to fetch)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(okResponse({ id: "pay_1", invoiceUrl: "https://x" }))

      await expect(
        createAsaasPayment({
          customerId: "cus_1",
          billingType: "CREDIT_CARD",
          value: 100,
          dueDate: "2026-06-01",
          installmentCount: 1,
        }),
      ).resolves.toBeDefined()

      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it("does NOT throw when installmentCount is undefined (PIX case)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(okResponse({ id: "pay_1", invoiceUrl: "https://x" }))

      await expect(
        createAsaasPayment({
          customerId: "cus_1",
          billingType: "PIX",
          value: 100,
          dueDate: "2026-06-01",
        }),
      ).resolves.toBeDefined()

      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe("error path — PII-safe error handling", () => {
    it("does NOT include the Asaas error body in the thrown error message", async () => {
      // Asaas error bodies can carry PII (CPF, email, phone). The thrown
      // Error.message is serialized outward by the app's handleApiError,
      // so PII must never land in it.
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
      // Defence-in-depth: no substring of the PII body in the message
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
      // `response.text()` can reject if the body stream is already consumed
      // or otherwise unreadable. The fetch wrapper should still throw a
      // sanitized Error and log a placeholder rather than surfacing the
      // text() rejection.
      const response = new Response("ignored", { status: 500 })
      vi.spyOn(response, "text").mockRejectedValue(new Error("stream dead"))
      vi.spyOn(globalThis, "fetch").mockResolvedValue(response)

      await expect(
        createAsaasCustomer({ name: "x", cpfCnpj: "123" }),
      ).rejects.toThrow("Asaas API error (500)")
    })
  })
})
