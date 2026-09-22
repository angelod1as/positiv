import { beforeEach, describe, expect, it, vi } from "vitest"

const { ENV, sweepPaymentEmails, logger } = vi.hoisted(() => ({
  ENV: {} as Record<string, unknown>,
  sweepPaymentEmails: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("varlock/env", () => ({ ENV }))
vi.mock("~/business/payment/payment-email-outbox.server", () => ({
  sweepPaymentEmails,
}))
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

const { action } = await import("./api.retry-payment-emails")

const SECRET = "test-secret-123"
const URL = "http://localhost:5173/api/retry-payment-emails"

const call = (init: RequestInit) =>
  action({ request: new Request(URL, init), params: {}, context: {} })

describe("api.retry-payment-emails", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ENV.INTERNAL_JOB_SECRET = SECRET
    sweepPaymentEmails.mockResolvedValue({ processed: 2, sent: 2, failed: 0 })
  })

  it("refuses a request with no bearer token", async () => {
    const response = await call({ method: "POST" })

    expect(response.status).toBe(401)
    expect(sweepPaymentEmails).not.toHaveBeenCalled()
  })

  it("refuses a request carrying the wrong token", async () => {
    const response = await call({
      method: "POST",
      headers: { Authorization: "Bearer nope" },
    })

    expect(response.status).toBe(401)
    expect(sweepPaymentEmails).not.toHaveBeenCalled()
  })

  it("refuses anything but a POST", async () => {
    const response = await call({
      method: "GET",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(405)
    expect(sweepPaymentEmails).not.toHaveBeenCalled()
  })

  it("refuses to run when no secret is configured", async () => {
    ENV.INTERNAL_JOB_SECRET = undefined

    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(500)
    expect(sweepPaymentEmails).not.toHaveBeenCalled()
  })

  it("sweeps and reports what it sent", async () => {
    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      stats: { processed: 2, sent: 2, failed: 0 },
    })
  })

  it("answers 500 when the sweep itself fails", async () => {
    sweepPaymentEmails.mockRejectedValue(new Error("the database is down"))

    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(500)
    expect(logger.error).toHaveBeenCalled()
  })
})
