import { beforeEach, describe, expect, it, vi } from "vitest"

const { ENV, syncListmonkUnsubscribes, reportConsentDrift, logger } = vi.hoisted(() => ({
  ENV: {} as Record<string, unknown>,
  syncListmonkUnsubscribes: vi.fn(),
  reportConsentDrift: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("varlock/env", () => ({ ENV }))
vi.mock("~/business/newsletter/listmonk-unsubscribe-sync.server", () => ({
  syncListmonkUnsubscribes,
  reportConsentDrift,
}))
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

const { action } = await import("./api.sync-listmonk-unsubscribes")

const SECRET = "test-secret-123"
const URL = "http://localhost:5173/api/sync-listmonk-unsubscribes"

const call = (init: RequestInit, url = URL) =>
  action({
    request: new Request(url, init),
    url: new globalThis.URL(url),
    pattern: "/api/sync-listmonk-unsubscribes",
    params: {},
    context: {},
  })

describe("api.sync-listmonk-unsubscribes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ENV.INTERNAL_JOB_SECRET = SECRET
    syncListmonkUnsubscribes.mockResolvedValue({
      success: true,
      data: { unsubscribed: 3 },
      errors: [],
    })
  })

  it("refuses a request with no bearer token", async () => {
    const response = await call({ method: "POST" })

    expect(response.status).toBe(401)
    expect(syncListmonkUnsubscribes).not.toHaveBeenCalled()
  })

  it("refuses a request carrying the wrong token", async () => {
    const response = await call({
      method: "POST",
      headers: { Authorization: "Bearer nope" },
    })

    expect(response.status).toBe(401)
    expect(syncListmonkUnsubscribes).not.toHaveBeenCalled()
  })

  it("refuses anything but a POST", async () => {
    const response = await call({
      method: "GET",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(405)
    expect(syncListmonkUnsubscribes).not.toHaveBeenCalled()
  })

  it("refuses to run when no secret is configured", async () => {
    ENV.INTERNAL_JOB_SECRET = undefined

    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(500)
    expect(syncListmonkUnsubscribes).not.toHaveBeenCalled()
  })

  it("syncs and reports how many consents it withdrew", async () => {
    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      stats: { unsubscribed: 3 },
    })
  })

  it("answers 500 when the sync fails", async () => {
    syncListmonkUnsubscribes.mockResolvedValue({
      success: false,
      errors: [new Error("Listmonk is down")],
    })

    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(500)
    expect(logger.error).toHaveBeenCalled()
  })

  it("reports the drift without syncing on a dry run", async () => {
    const drift = {
      withdrawnInListmonk: [
        { email: "left@example.com", optedOutAt: "2026-10-01T10:00:00.000Z" },
      ],
      subscribedOnlyInListmonk: [],
    }
    reportConsentDrift.mockResolvedValue({ success: true, data: drift, errors: [] })

    const response = await call(
      { method: "POST", headers: { Authorization: `Bearer ${SECRET}` } },
      `${URL}?dryRun=true`,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, dryRun: true, drift })
    expect(syncListmonkUnsubscribes).not.toHaveBeenCalled()
  })
})
