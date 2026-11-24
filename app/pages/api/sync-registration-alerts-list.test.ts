import { beforeEach, describe, expect, it, vi } from "vitest"

const { ENV, syncRegistrationAlertsListmonkList, syncEmailTokensToListmonk, logger } = vi.hoisted(() => ({
  ENV: {} as Record<string, unknown>,
  syncRegistrationAlertsListmonkList: vi.fn(),
  syncEmailTokensToListmonk: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("varlock/env", () => ({ ENV }))
vi.mock("~/business/newsletter/registration-alerts-list.server", () => ({
  syncRegistrationAlertsListmonkList,
}))
vi.mock("~/business/newsletter/email-token-sync.server", () => ({
  syncEmailTokensToListmonk,
}))
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

const { action } = await import("./sync-registration-alerts-list")

const SECRET = "test-secret-123"
const URL = "http://localhost:5173/api/sync-registration-alerts-list"

const call = (init: RequestInit) =>
  action({
    request: new Request(URL, init),
    url: new globalThis.URL(URL),
    pattern: "/api/sync-registration-alerts-list",
    params: {},
    context: {},
  })

describe("api.sync-registration-alerts-list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ENV.INTERNAL_JOB_SECRET = SECRET
    syncRegistrationAlertsListmonkList.mockResolvedValue({
      success: true,
      data: { added: 2, removed: 1, created: 3, failed: 0 },
      errors: [],
    })
    syncEmailTokensToListmonk.mockResolvedValue({
      success: true,
      data: { updated: 5, failed: 0 },
      errors: [],
    })
  })

  it("refuses a request with no bearer token", async () => {
    const response = await call({ method: "POST" })

    expect(response.status).toBe(401)
    expect(syncRegistrationAlertsListmonkList).not.toHaveBeenCalled()
  })

  it("refuses a request carrying the wrong token", async () => {
    const response = await call({
      method: "POST",
      headers: { Authorization: "Bearer nope" },
    })

    expect(response.status).toBe(401)
    expect(syncRegistrationAlertsListmonkList).not.toHaveBeenCalled()
  })

  it("refuses anything but a POST", async () => {
    const response = await call({
      method: "GET",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(405)
    expect(syncRegistrationAlertsListmonkList).not.toHaveBeenCalled()
  })

  it("refuses to run when no secret is configured", async () => {
    ENV.INTERNAL_JOB_SECRET = undefined

    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(500)
    expect(syncRegistrationAlertsListmonkList).not.toHaveBeenCalled()
  })

  it("syncs and reports what changed on the list", async () => {
    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      stats: { added: 2, removed: 1, created: 3, failed: 0 },
      tokens: { updated: 5, failed: 0 },
    })
  })

  it("gives the subscribers their email token after the list sync", async () => {
    await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(syncEmailTokensToListmonk).toHaveBeenCalledOnce()
    expect(
      syncRegistrationAlertsListmonkList.mock.invocationCallOrder[0],
    ).toBeLessThan(syncEmailTokensToListmonk.mock.invocationCallOrder[0])
  })

  it("answers 500 when the token sync fails", async () => {
    syncEmailTokensToListmonk.mockResolvedValue({
      success: false,
      errors: [new Error("tokens failed")],
    })

    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      success: false,
      error: "tokens failed",
    })
    expect(logger.error).toHaveBeenCalled()
  })

  it("still gives the subscribers their token when the list sync fails", async () => {
    syncRegistrationAlertsListmonkList.mockResolvedValue({
      success: false,
      errors: [new Error("Listmonk is down")],
    })

    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(syncEmailTokensToListmonk).toHaveBeenCalled()
    expect(response.status).toBe(500)
  })

  it("answers 500 when the sync fails", async () => {
    syncRegistrationAlertsListmonkList.mockResolvedValue({
      success: false,
      errors: [new Error("Listmonk is down")],
    })

    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      success: false,
      error: "Listmonk is down",
    })
    expect(logger.error).toHaveBeenCalled()
  })
})
