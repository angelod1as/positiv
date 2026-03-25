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

  it("should return all 4 steps as ok on full success", async () => {
    const { testListmonkConnection } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch
      .mockReturnValueOnce(jsonResponse({ data: [] })) // testConnection
      .mockReturnValueOnce(jsonResponse({ data: { id: 99 } })) // createCampaign
      .mockReturnValueOnce(jsonResponse({ data: {} })) // send (status running)
      .mockReturnValueOnce(jsonResponse(null)) // delete campaign

    const result = await testListmonkConnection()

    expect(result.success).toBe(true)
    expect(result.steps).toHaveLength(4)
    expect(result.steps.every((s) => s.status === "ok")).toBe(true)
  })

  it("should return error at step 1 when connection fails", async () => {
    const { testListmonkConnection } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch.mockReturnValueOnce(Promise.reject(new Error("fetch failed")))

    const result = await testListmonkConnection()

    expect(result.success).toBe(false)
    expect(result.steps).toHaveLength(1)
    expect(result.steps[0].status).toBe("error")
    expect(result.steps[0].error).toContain("fetch failed")
  })

  it("should return error at step 2 when campaign creation fails, no cleanup needed", async () => {
    const { testListmonkConnection } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch
      .mockReturnValueOnce(jsonResponse({ data: [] })) // testConnection ok
      .mockReturnValueOnce(jsonResponse({ error: "bad request" }, 400)) // createCampaign fails

    const result = await testListmonkConnection()

    expect(result.success).toBe(false)
    expect(result.steps).toHaveLength(2)
    expect(result.steps[0].status).toBe("ok")
    expect(result.steps[1].status).toBe("error")
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("should return error at step 3 when send fails, still runs cleanup", async () => {
    const { testListmonkConnection } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch
      .mockReturnValueOnce(jsonResponse({ data: [] })) // testConnection ok
      .mockReturnValueOnce(jsonResponse({ data: { id: 99 } })) // createCampaign ok
      .mockReturnValueOnce(jsonResponse({ error: "timeout" }, 500)) // send fails
      .mockReturnValueOnce(jsonResponse(null)) // delete campaign (cleanup)

    const result = await testListmonkConnection()

    expect(result.success).toBe(false)
    expect(result.steps).toHaveLength(4)
    expect(result.steps[0].status).toBe("ok")
    expect(result.steps[1].status).toBe("ok")
    expect(result.steps[2].status).toBe("error")
    expect(result.steps[3].status).toBe("ok")
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })

  it("should return error at step 4 when cleanup fails", async () => {
    const { testListmonkConnection } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch
      .mockReturnValueOnce(jsonResponse({ data: [] })) // testConnection ok
      .mockReturnValueOnce(jsonResponse({ data: { id: 99 } })) // createCampaign ok
      .mockReturnValueOnce(jsonResponse({ data: {} })) // send ok
      .mockReturnValueOnce(jsonResponse({ error: "not found" }, 404)) // delete fails

    const result = await testListmonkConnection()

    expect(result.success).toBe(false)
    expect(result.steps).toHaveLength(4)
    expect(result.steps[0].status).toBe("ok")
    expect(result.steps[1].status).toBe("ok")
    expect(result.steps[2].status).toBe("ok")
    expect(result.steps[3].status).toBe("error")
  })

  it("should have step labels in Portuguese", async () => {
    const { testListmonkConnection } = await import(
      "./test-listmonk-connection.server"
    )

    mockFetch
      .mockReturnValueOnce(jsonResponse({ data: [] }))
      .mockReturnValueOnce(jsonResponse({ data: { id: 99 } }))
      .mockReturnValueOnce(jsonResponse({ data: {} }))
      .mockReturnValueOnce(jsonResponse(null))

    const result = await testListmonkConnection()

    expect(result.steps[0].label).toBe("Conexão estabelecida")
    expect(result.steps[1].label).toBe("Campanha de teste criada")
    expect(result.steps[2].label).toBe("Email enviado para admins")
    expect(result.steps[3].label).toBe("Campanha de teste removida")
  })
})
