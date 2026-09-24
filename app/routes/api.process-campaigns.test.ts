import { beforeEach, describe, expect, it, vi } from "vitest"

const { ENV, getPendingCampaigns, processCampaignForEvent, logger } =
  vi.hoisted(() => ({
    ENV: {} as Record<string, unknown>,
    getPendingCampaigns: vi.fn(),
    processCampaignForEvent: vi.fn(),
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  }))

vi.mock("varlock/env", () => ({ ENV }))
vi.mock("~/business/newsletter/campaign-tracking.server", () => ({
  getPendingCampaigns,
}))
vi.mock("~/business/newsletter/campaign-automation.server", () => ({
  processCampaignForEvent,
}))
vi.mock("~/business/admin/event-listmonk-sync.server", () => ({
  deleteEventListmonkList: vi.fn(),
}))
vi.mock("~/kysely-db", () => {
  const query = {
    select: () => query,
    where: () => query,
    execute: async () => [],
  }
  return { kyselyDb: { selectFrom: () => query } }
})
vi.mock("~/lib/logger/logger.server", () => ({ logger }))

const { action } = await import("./api.process-campaigns")

const SECRET = "test-secret-123"
const URL = "http://localhost:5173/api/process-campaigns"

const call = (init: RequestInit) =>
  action({ request: new Request(URL, init), params: {}, context: {} })

describe("api.process-campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ENV.INTERNAL_JOB_SECRET = SECRET
    getPendingCampaigns.mockResolvedValue({ success: true, data: [] })
  })

  it("refuses a request with no bearer token", async () => {
    const response = await call({ method: "POST" })

    expect(response.status).toBe(401)
    expect(getPendingCampaigns).not.toHaveBeenCalled()
  })

  it("refuses a request carrying the wrong token", async () => {
    const response = await call({
      method: "POST",
      headers: { Authorization: "Bearer nope" },
    })

    expect(response.status).toBe(401)
    expect(getPendingCampaigns).not.toHaveBeenCalled()
  })

  it("refuses a wrong token of the same length as the right one", async () => {
    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${"x".repeat(SECRET.length)}` },
    })

    expect(response.status).toBe(401)
    expect(getPendingCampaigns).not.toHaveBeenCalled()
  })

  it("refuses to run when no secret is configured", async () => {
    ENV.INTERNAL_JOB_SECRET = undefined

    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(500)
    expect(getPendingCampaigns).not.toHaveBeenCalled()
  })

  it("processes pending opening campaigns with the right token", async () => {
    const response = await call({
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
    })

    expect(response.status).toBe(200)
    expect(getPendingCampaigns).toHaveBeenCalledWith("opening")
  })
})
