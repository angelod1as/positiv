import { beforeEach, describe, expect, it, vi } from "vitest"

const { ENV, syncVeteransListmonkList, logger } = vi.hoisted(() => ({
  ENV: {} as Record<string, unknown>,
  syncVeteransListmonkList: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("varlock/env", () => ({ ENV }))
vi.mock("~/business/newsletter/veterans-list.server", () => ({
  syncVeteransListmonkList,
}))
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

const { action } = await import("./api.sync-veterans-list")

const SECRET = "test-secret-123"
const URL = "http://localhost:5173/api/sync-veterans-list"

const call = (init: RequestInit) =>
  action({
    request: new Request(URL, init),
    url: new globalThis.URL(URL),
    pattern: "/api/sync-veterans-list",
    params: {},
    context: {},
  })

describe("api.sync-veterans-list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ENV.INTERNAL_JOB_SECRET = SECRET
    syncVeteransListmonkList.mockResolvedValue({
      success: true,
      data: { added: 2, removed: 1, total: 40 },
      errors: [],
    })
  })

  it("refuses a request with no bearer token", async () => {
    const response = await call({ method: "POST" })

    expect(response.status).toBe(401)
    expect(syncVeteransListmonkList).not.toHaveBeenCalled()
  })

  it("refuses a request carrying the wrong token", async () => {
    const response = await call({
      method: "POST",
      headers: { Authorization: "Bearer nope" },
    })

    expect(response.status).toBe(401)
    expect(syncVeteransListmonkList).not.toHaveBeenCalled()
  })

  it("refuses anything but a POST", async () => {
    const response = await call({
      method: "GET",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(405)
    expect(syncVeteransListmonkList).not.toHaveBeenCalled()
  })

  it("refuses to run when no secret is configured", async () => {
    ENV.INTERNAL_JOB_SECRET = undefined

    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(500)
    expect(syncVeteransListmonkList).not.toHaveBeenCalled()
  })

  it("syncs and reports what changed on the list", async () => {
    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      stats: { added: 2, removed: 1, total: 40 },
    })
  })

  it("answers 500 when the sync fails", async () => {
    syncVeteransListmonkList.mockResolvedValue({
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
