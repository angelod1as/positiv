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
})
