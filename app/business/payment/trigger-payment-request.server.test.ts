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

vi.mock("~/kysely-db", () => ({ kyselyDb: mockKyselyDb }))

vi.mock("~/env.server", () => ({
  env: () => ({
    paymentSystemOnline: true,
    appUrl: "https://www.positivparty.com",
    asaasApiKey: "test",
    asaasApiUrl: "https://sandbox.asaas.com/api/v3",
  }),
}))

vi.mock("./send-payment-link-email.server", () => ({
  sendPaymentLinkEmail: vi.fn().mockResolvedValue({ emailSent: true }),
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { resolvePaymentRequest } from "./trigger-payment-request.server"
import { sendPaymentLinkEmail } from "./send-payment-link-email.server"

describe("resolvePaymentRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates payment request and sends email", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
      { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: "12345678900" },
      undefined,
      {
        id: "pr-new",
        event_participant_id: "ep-1",
        amount: 220,
        status: "pending",
        expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
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

  it("returns failure when event has no ticket_price", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Free Event", ticket_price: null },
    ])

    const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1")

    expect(result.success).toBe(false)
  })

  it("returns failure when profile has no CPF", async () => {
    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
      { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: null },
    ])

    const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1")

    expect(result.success).toBe(false)
  })

  it("reuses active payment request if one exists", async () => {
    const existingRequest = {
      id: "pr-existing",
      event_participant_id: "ep-1",
      amount: 220,
      status: "pending",
      expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    }

    mockKyselyDb._setResults([
      { id: "ev-1", title: "Positiv Regular", ticket_price: 220 },
      { id: "pr-1", email: "joao@test.com", full_name: "João", cpf: "12345678900" },
      existingRequest,
    ])

    const result = await resolvePaymentRequest("ep-1", "ev-1", "pr-1")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data?.id).toBe("pr-existing")
    }
    expect(sendPaymentLinkEmail).toHaveBeenCalled()
  })
})
