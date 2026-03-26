import { beforeEach, describe, expect, it, vi } from "vitest"

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}))

vi.mock("./listmonk-client.server", () => ({
  getListmonkConfig: vi.fn(() => ({
    listmonkApiUrl: "http://listmonk:9000",
    headers: {
      Authorization: "Basic dGVzdDp0ZXN0",
      "Content-Type": "application/json",
    },
  })),
}))

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  })
}

describe("testListmonkConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 3 steps as ok on full success and include campaignId", async () => {
    const { testListmonkConnection } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch
      .mockReturnValueOnce(jsonResponse({ data: [] })) // ping
      .mockReturnValueOnce(jsonResponse({ data: { id: 99 } })) // create campaign
      .mockReturnValueOnce(jsonResponse({ data: {} })) // send

    const result = await testListmonkConnection()

    expect(result.success).toBe(true)
    expect(result.campaignId).toBe(99)
    expect(result.steps).toHaveLength(3)
    expect(result.steps.every((s) => s.status === "ok")).toBe(true)
  })

  it("should return error at step 1 when connection fails", async () => {
    const { testListmonkConnection } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch.mockReturnValueOnce(Promise.reject(new Error("fetch failed")))

    const result = await testListmonkConnection()

    expect(result.success).toBe(false)
    expect(result.campaignId).toBeNull()
    expect(result.steps).toHaveLength(1)
    expect(result.steps[0].status).toBe("error")
    expect(result.steps[0].error).toContain("fetch failed")
  })

  it("should return error at step 2 when campaign creation fails", async () => {
    const { testListmonkConnection } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch
      .mockReturnValueOnce(jsonResponse({ data: [] })) // ping ok
      .mockReturnValueOnce(jsonResponse({ error: "bad request" }, 400)) // create fails

    const result = await testListmonkConnection()

    expect(result.success).toBe(false)
    expect(result.campaignId).toBeNull()
    expect(result.steps).toHaveLength(2)
    expect(result.steps[0].status).toBe("ok")
    expect(result.steps[1].status).toBe("error")
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("should return error at step 3 when send fails but still return campaignId", async () => {
    const { testListmonkConnection } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch
      .mockReturnValueOnce(jsonResponse({ data: [] })) // ping ok
      .mockReturnValueOnce(jsonResponse({ data: { id: 99 } })) // create ok
      .mockReturnValueOnce(jsonResponse({ error: "timeout" }, 500)) // send fails

    const result = await testListmonkConnection()

    expect(result.success).toBe(false)
    expect(result.campaignId).toBe(99)
    expect(result.steps).toHaveLength(3)
    expect(result.steps[0].status).toBe("ok")
    expect(result.steps[1].status).toBe("ok")
    expect(result.steps[2].status).toBe("error")
  })

  it("should have step labels in Portuguese", async () => {
    const { testListmonkConnection } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch
      .mockReturnValueOnce(jsonResponse({ data: [] }))
      .mockReturnValueOnce(jsonResponse({ data: { id: 99 } }))
      .mockReturnValueOnce(jsonResponse({ data: {} }))

    const result = await testListmonkConnection()

    expect(result.steps[0].label).toBe("Conexão estabelecida")
    expect(result.steps[1].label).toBe("Campanha de teste criada")
    expect(result.steps[2].label).toBe("Email enviado para devs")
  })
})

describe("cleanupListmonkTestCampaign", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should delete campaign and return success", async () => {
    const { cleanupListmonkTestCampaign } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch.mockReturnValueOnce(jsonResponse(null))

    const result = await cleanupListmonkTestCampaign(99)

    expect(result.success).toBe(true)
    expect(result.step.status).toBe("ok")
    expect(result.step.label).toBe("Campanha de teste removida")
    expect(mockFetch).toHaveBeenCalledWith(
      "http://listmonk:9000/api/campaigns/99",
      expect.objectContaining({ method: "DELETE" }),
    )
  })

  it("should return error when delete fails", async () => {
    const { cleanupListmonkTestCampaign } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch.mockReturnValueOnce(jsonResponse({ error: "not found" }, 404))

    const result = await cleanupListmonkTestCampaign(99)

    expect(result.success).toBe(false)
    expect(result.step.status).toBe("error")
    expect(result.step.error).toBeDefined()
  })
})
