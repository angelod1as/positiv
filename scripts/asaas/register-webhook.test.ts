import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { registerAsaasWebhook, WEBHOOK_EVENTS } from "./register-webhook"

const env = vi.hoisted<Record<string, unknown>>(() => ({
  APP_ENV: "test",
  ASAAS_API_URL: "https://api-sandbox.asaas.com/v3",
  ASAAS_API_KEY: "aact_test_key",
  ASAAS_WEBHOOK_TOKEN: "a".repeat(32),
}))

vi.mock("varlock/env", () => ({ ENV: env }))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function bodyOf(call: number): Record<string, unknown> {
  return JSON.parse(String(fetchMock.mock.calls[call][1].body))
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  env.ASAAS_WEBHOOK_TOKEN = "a".repeat(32)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("registerAsaasWebhook", () => {
  it("creates the webhook when the account has none by that name", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [{ id: "hook_other", name: "Outro", url: "https://x" }] }))
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "hook_1", name: "Positiv", url: "https://www.positivparty.com/api/asaas/webhook" }),
    )

    const result = await registerAsaasWebhook("https://www.positivparty.com/")

    expect(result).toEqual({ created: true, id: "hook_1" })
    expect(fetchMock.mock.calls[1][0]).toBe("https://api-sandbox.asaas.com/v3/webhooks")
    expect(fetchMock.mock.calls[1][1].method).toBe("POST")
    expect(bodyOf(1)).toEqual({
      name: "Positiv",
      url: "https://www.positivparty.com/api/asaas/webhook",
      email: "contato@positivparty.com",
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: "a".repeat(32),
      sendType: "SEQUENTIALLY",
      events: [...WEBHOOK_EVENTS],
    })
  })

  it("updates the existing webhook instead of adding a second one", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: [{ id: "hook_1", name: "Positiv", url: "https://old.example.com" }] }),
    )
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "hook_1", name: "Positiv", url: "https://www.positivparty.com/api/asaas/webhook" }),
    )

    const result = await registerAsaasWebhook("https://www.positivparty.com")

    expect(result).toEqual({ created: false, id: "hook_1" })
    expect(fetchMock.mock.calls[1][0]).toBe("https://api-sandbox.asaas.com/v3/webhooks/hook_1")
    expect(fetchMock.mock.calls[1][1].method).toBe("PUT")
  })

  it("subscribes to every event the webhook handler acts on", () => {
    expect(WEBHOOK_EVENTS).toEqual([
      "PAYMENT_CREATED",
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECEIVED",
      "PAYMENT_OVERDUE",
      "PAYMENT_DELETED",
      "PAYMENT_RESTORED",
      "PAYMENT_UPDATED",
      "PAYMENT_REFUND_IN_PROGRESS",
      "PAYMENT_REFUNDED",
      "PAYMENT_PARTIALLY_REFUNDED",
      "PAYMENT_CHARGEBACK_REQUESTED",
      "PAYMENT_CHARGEBACK_DISPUTE",
      "PAYMENT_AWAITING_CHARGEBACK_REVERSAL",
      "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
      "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
    ])
  })

  it("refuses to register without an origin", async () => {
    await expect(registerAsaasWebhook("")).rejects.toThrow(/origin/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("refuses a webhook token short enough to guess", async () => {
    env.ASAAS_WEBHOOK_TOKEN = "short"

    await expect(registerAsaasWebhook("https://www.positivparty.com")).rejects.toThrow(
      /ASAAS_WEBHOOK_TOKEN/,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
