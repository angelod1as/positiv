import { describe, it, expect, vi, beforeEach } from "vitest"

const mockEnv = vi.hoisted(() => ({
  paymentSystemOnline: true,
  asaasWebhookToken: "test-webhook-token",
  nodeEnv: "test" as "development" | "production" | "test",
}))

const mockSelectResult = vi.hoisted(() => ({ value: undefined as unknown }))
const mockUpdateResult = vi.hoisted(() => ({ value: undefined as unknown }))
const mockExecute = vi.hoisted(() => vi.fn().mockResolvedValue([]))

vi.mock("~/env.server", () => ({
  env: () => mockEnv,
}))

vi.mock("~/kysely-db", () => {
  function chainProxy(kind: "select" | "update"): unknown {
    return new Proxy(
      {},
      {
        get(_, prop) {
          if (typeof prop === "symbol") return undefined
          if (prop === "then") return undefined
          if (prop === "executeTakeFirst") {
            return () =>
              Promise.resolve(
                kind === "select"
                  ? mockSelectResult.value
                  : mockUpdateResult.value,
              )
          }
          if (prop === "execute") return mockExecute
          return () => chainProxy(kind)
        },
      },
    )
  }
  return {
    kyselyDb: {
      selectFrom: () => chainProxy("select"),
      updateTable: () => chainProxy("update"),
    },
  }
})

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { action } from "./api.asaas-webhook"
import { logger } from "~/lib/logger/logger.server"

function makeRequest(body: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) headers["asaas-access-token"] = token
  return new Request("http://localhost/api/asaas-webhook", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

const actionArgs = (request: Request) => ({ request, params: {}, context: {} })

describe("api.asaas-webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv.paymentSystemOnline = true
    mockEnv.asaasWebhookToken = "test-webhook-token"
    mockEnv.nodeEnv = "test"
    mockSelectResult.value = undefined
    mockUpdateResult.value = undefined
  })

  it("returns 404 when payment system is offline", async () => {
    mockEnv.paymentSystemOnline = false
    const request = makeRequest({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }, "test-webhook-token")
    const response = await action(actionArgs(request))
    expect(response.status).toBe(404)
  })

  it("returns 401 when token is missing", async () => {
    const request = makeRequest({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } })
    const response = await action(actionArgs(request))
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toContain("token")
  })

  it("returns 401 when token is invalid", async () => {
    const request = makeRequest(
      { event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } },
      "wrong-token",
    )
    const response = await action(actionArgs(request))
    expect(response.status).toBe(401)
  })

  it("allows requests but logs warning when ASAAS_WEBHOOK_TOKEN is not configured (dev/test)", async () => {
    mockEnv.asaasWebhookToken = undefined as unknown as string
    mockEnv.nodeEnv = "development"
    mockSelectResult.value = {
      id: "pr-1",
      event_participant_id: "ep-1",
      status: "awaiting_payment",
      amount: 220,
    }

    const request = makeRequest({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1", value: 220 } })
    const response = await action(actionArgs(request))
    expect(response.status).toBe(200)
  })

  it("rejects requests with 503 when ASAAS_WEBHOOK_TOKEN is not configured in production", async () => {
    mockEnv.asaasWebhookToken = undefined as unknown as string
    mockEnv.nodeEnv = "production"

    const request = makeRequest({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1", value: 220 } })
    const response = await action(actionArgs(request))
    expect(response.status).toBe(503)
    expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
      expect.stringContaining("not configured in production"),
    )
  })

  it("returns 200 and logs warning for unknown asaas_payment_id", async () => {
    const request = makeRequest(
      { event: "PAYMENT_RECEIVED", payment: { id: "pay_unknown", value: 220 } },
      "test-webhook-token",
    )
    const response = await action(actionArgs(request))
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.error).toContain("No payment_request found")
    expect(json.paymentId).toBe("pay_unknown")
  })

  it("returns 400 when payment.id is missing", async () => {
    const request = makeRequest(
      { event: "PAYMENT_RECEIVED", payment: {} },
      "test-webhook-token",
    )
    const response = await action(actionArgs(request))
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain("payment.id")
  })

  describe("PAYMENT_RECEIVED (PIX)", () => {
    it("marks payment request as paid", async () => {
      const row = {
        id: "pr-1",
        event_participant_id: "ep-1",
        status: "awaiting_payment",
        amount: 220,
      }
      mockSelectResult.value = row
      mockUpdateResult.value = { ...row, status: "paid" }

      const request = makeRequest(
        { event: "PAYMENT_RECEIVED", payment: { id: "pay_1", value: 220 } },
        "test-webhook-token",
      )
      const response = await action(actionArgs(request))
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.action).toBe("marked_paid")
      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        expect.stringContaining("marked as paid"),
        expect.objectContaining({ paymentRequestId: "pr-1" }),
      )
    })

    it("skips paid update when row is no longer in pre-paid state (race)", async () => {
      // SELECT sees awaiting_payment, but UPDATE with WHERE status IN
      // (pending, awaiting_payment) matches 0 rows (another process changed
      // it concurrently to a terminal state). Must NOT mark as paid.
      mockSelectResult.value = {
        id: "pr-1",
        event_participant_id: "ep-1",
        status: "awaiting_payment",
        amount: 220,
      }
      mockUpdateResult.value = undefined

      const request = makeRequest(
        { event: "PAYMENT_RECEIVED", payment: { id: "pay_1", value: 220 } },
        "test-webhook-token",
      )
      const response = await action(actionArgs(request))
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.skipped).toBe("already_terminal")
    })
  })

  describe("PAYMENT_CONFIRMED (CC)", () => {
    it("marks payment as paid (same as PAYMENT_RECEIVED)", async () => {
      const row = {
        id: "pr-1",
        event_participant_id: "ep-1",
        status: "awaiting_payment",
        amount: 220,
      }
      mockSelectResult.value = row
      mockUpdateResult.value = { ...row, status: "paid" }

      const request = makeRequest(
        { event: "PAYMENT_CONFIRMED", payment: { id: "pay_1", value: 220 } },
        "test-webhook-token",
      )
      const response = await action(actionArgs(request))
      const json = await response.json()
      expect(json.action).toBe("marked_paid")
    })

    it("is idempotent — skips if already paid", async () => {
      mockSelectResult.value = {
        id: "pr-1",
        event_participant_id: "ep-1",
        status: "paid",
        amount: 220,
      }

      const request = makeRequest(
        { event: "PAYMENT_CONFIRMED", payment: { id: "pay_1", value: 220 } },
        "test-webhook-token",
      )
      const response = await action(actionArgs(request))
      const json = await response.json()
      expect(json.skipped).toBe("already_paid")
      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        expect.stringContaining("already paid"),
        expect.anything(),
      )
    })
  })

  describe("PAYMENT_OVERDUE", () => {
    it("marks payment as expired", async () => {
      const row = {
        id: "pr-1",
        event_participant_id: "ep-1",
        status: "awaiting_payment",
        amount: 220,
      }
      mockSelectResult.value = row
      mockUpdateResult.value = { ...row, status: "expired" }

      const request = makeRequest(
        { event: "PAYMENT_OVERDUE", payment: { id: "pay_1", value: 220 } },
        "test-webhook-token",
      )
      const response = await action(actionArgs(request))
      const json = await response.json()
      expect(json.action).toBe("marked_expired")
      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        expect.stringContaining("marked as expired"),
        expect.anything(),
      )
    })

    it("does NOT flip paid payment to expired (late/out-of-order webhook)", async () => {
      // Critical guard: if Asaas sends PAYMENT_OVERDUE AFTER PAYMENT_CONFIRMED
      // (retry, network reorder), we must NOT overwrite the paid status.
      // SELECT sees paid; UPDATE with WHERE status IN (pending, awaiting)
      // matches 0 rows → undefined → skip.
      mockSelectResult.value = {
        id: "pr-1",
        event_participant_id: "ep-1",
        status: "paid",
        amount: 220,
      }
      mockUpdateResult.value = undefined

      const request = makeRequest(
        { event: "PAYMENT_OVERDUE", payment: { id: "pay_1", value: 220 } },
        "test-webhook-token",
      )
      const response = await action(actionArgs(request))
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.skipped).toBe("already_terminal")
    })
  })

  describe("PAYMENT_REFUNDED", () => {
    it("marks payment as refunded", async () => {
      const row = {
        id: "pr-1",
        event_participant_id: "ep-1",
        status: "paid",
        amount: 220,
      }
      mockSelectResult.value = row
      mockUpdateResult.value = { ...row, status: "refunded" }

      const request = makeRequest(
        { event: "PAYMENT_REFUNDED", payment: { id: "pay_1", value: 220 } },
        "test-webhook-token",
      )
      const response = await action(actionArgs(request))
      const json = await response.json()
      expect(response.status).toBe(200)
      expect(json.action).toBe("marked_refunded")
    })

    it("PAYMENT_REFUND_IN_PROGRESS is also handled", async () => {
      const row = {
        id: "pr-1",
        event_participant_id: "ep-1",
        status: "paid",
        amount: 220,
      }
      mockSelectResult.value = row
      mockUpdateResult.value = { ...row, status: "refunded" }

      const request = makeRequest(
        {
          event: "PAYMENT_REFUND_IN_PROGRESS",
          payment: { id: "pay_1", value: 220 },
        },
        "test-webhook-token",
      )
      const response = await action(actionArgs(request))
      const json = await response.json()
      expect(json.action).toBe("marked_refunded")
    })

    it("is idempotent — skips if already refunded", async () => {
      mockSelectResult.value = {
        id: "pr-1",
        event_participant_id: "ep-1",
        status: "refunded",
        amount: 220,
      }

      const request = makeRequest(
        { event: "PAYMENT_REFUNDED", payment: { id: "pay_1", value: 220 } },
        "test-webhook-token",
      )
      const response = await action(actionArgs(request))
      const json = await response.json()
      expect(json.skipped).toBe("already_refunded")
    })

    it("skips if row is in a non-refundable state (e.g. pending)", async () => {
      mockSelectResult.value = {
        id: "pr-1",
        event_participant_id: "ep-1",
        status: "pending",
        amount: 220,
      }
      mockUpdateResult.value = undefined

      const request = makeRequest(
        { event: "PAYMENT_REFUNDED", payment: { id: "pay_1", value: 220 } },
        "test-webhook-token",
      )
      const response = await action(actionArgs(request))
      const json = await response.json()
      expect(json.skipped).toBe("already_terminal")
    })

    it("does NOT flip partially_refunded to fully refunded (would lose history)", async () => {
      // Webhook handler must not overwrite refund_amount on a partial
      // refund row — the actual refund value from the webhook payload
      // is needed and we don't parse it yet.
      mockSelectResult.value = {
        id: "pr-1",
        event_participant_id: "ep-1",
        status: "partially_refunded",
        amount: 220,
        refund_amount: 50,
      }
      mockUpdateResult.value = undefined

      const request = makeRequest(
        { event: "PAYMENT_REFUNDED", payment: { id: "pay_1", value: 220 } },
        "test-webhook-token",
      )
      const response = await action(actionArgs(request))
      const json = await response.json()
      expect(json.skipped).toBe("already_terminal")
    })
  })
})
