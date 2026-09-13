import { beforeEach, describe, expect, it, vi } from "vitest"

const env = vi.hoisted<Record<string, unknown>>(() => ({
  PAYMENTS_ENABLED: true,
  ASAAS_WEBHOOK_TOKEN: "whsec_a_token_long_enough_to_be_real_0000",
  APP_ENV: "test",
}))
vi.mock("varlock/env", () => ({ ENV: env }))

vi.mock("~/kysely-db", () => ({ kyselyDb: {} }))

const logger = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

const recordWebhookEvent = vi.hoisted(() => vi.fn())
const applyWebhookEvent = vi.hoisted(() => vi.fn())
vi.mock("~/business/payment/payment-webhook.server", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("~/business/payment/payment-webhook.server")
    >()
  return {
    ...actual,
    recordWebhookEvent: (...a: unknown[]) => recordWebhookEvent(...a),
    applyWebhookEvent: (...a: unknown[]) => applyWebhookEvent(...a),
  }
})

import { action } from "./api.asaas-webhook"

function post(body: unknown, token?: string) {
  return action({
    request: new Request("http://localhost/api/asaas/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "asaas-access-token": token } : {}),
      },
      body: JSON.stringify(body),
    }),
    params: {},
    context: {} as never,
  })
}

const validEvent = {
  id: "evt_1",
  event: "PAYMENT_RECEIVED",
  dateCreated: "2026-08-24 12:00:00",
  payment: { id: "pay_1", status: "RECEIVED", value: 221.99, netValue: 220.0 },
}

beforeEach(() => {
  env.PAYMENTS_ENABLED = true
  env.ASAAS_WEBHOOK_TOKEN = "whsec_a_token_long_enough_to_be_real_0000"
  recordWebhookEvent.mockClear().mockResolvedValue({ isNew: true, id: "row-1" })
  applyWebhookEvent.mockClear().mockResolvedValue({ applied: true })
  logger.error.mockClear()
  logger.warn.mockClear()
})

describe("POST /api/asaas/webhook", () => {
  it("answers 404 when payments are switched off", async () => {
    env.PAYMENTS_ENABLED = false
    const response = await post(validEvent, env.ASAAS_WEBHOOK_TOKEN as string)
    expect(response.status).toBe(404)
  })

  it("answers 503 and shouts when the token is not configured", async () => {
    env.ASAAS_WEBHOOK_TOKEN = ""
    const response = await post(validEvent, "anything")
    expect(response.status).toBe(503)
    expect(logger.error).toHaveBeenCalled()
  })

  it("answers 401 without a token", async () => {
    const response = await post(validEvent)
    expect(response.status).toBe(401)
  })

  it("answers 401 with the wrong token", async () => {
    const response = await post(
      validEvent,
      "whsec_wrong_but_the_same_length_00000",
    )
    expect(response.status).toBe(401)
  })

  it("answers 401 with a token of a different length, without throwing", async () => {
    const response = await post(validEvent, "short")
    expect(response.status).toBe(401)
  })

  it("accepts a valid delivery and applies it", async () => {
    const response = await post(validEvent, env.ASAAS_WEBHOOK_TOKEN as string)
    expect(response.status).toBe(200)
    expect(applyWebhookEvent).toHaveBeenCalled()
  })

  it("does not apply a redelivery twice", async () => {
    recordWebhookEvent.mockResolvedValueOnce({ isNew: false, id: "row-1" })

    const response = await post(validEvent, env.ASAAS_WEBHOOK_TOKEN as string)

    expect(response.status).toBe(200)
    expect(applyWebhookEvent).not.toHaveBeenCalled()
  })

  it("accepts a body with fields it does not know", async () => {
    const response = await post(
      {
        ...validEvent,
        somethingNew: { nested: true },
        payment: { ...validEvent.payment, extra: 1 },
      },
      env.ASAAS_WEBHOOK_TOKEN as string,
    )
    expect(response.status).toBe(200)
  })

  it("answers 400 for a body that is not an Asaas event", async () => {
    const response = await post(
      { hello: "world" },
      env.ASAAS_WEBHOOK_TOKEN as string,
    )
    expect(response.status).toBe(400)
  })

  it("answers 500 so Asaas retries when applying blows up", async () => {
    applyWebhookEvent.mockRejectedValueOnce(new Error("database is down"))

    const response = await post(validEvent, env.ASAAS_WEBHOOK_TOKEN as string)

    expect(response.status).toBe(500)
    expect(logger.error).toHaveBeenCalled()
  })
})
