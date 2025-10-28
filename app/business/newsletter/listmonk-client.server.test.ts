import { describe, expect, it, vi, beforeEach, afterEach, type MockInstance } from "vitest"
import {
  testConnection,
  addSubscriber,
  removeSubscriber,
  createCampaign,
  updateCampaignStatus,
} from "./listmonk-client.server"

vi.mock("~/env.server", () => ({
  env: vi.fn(() => ({
    listmonkApiUrl: "https://listmonk.test",
    listmonkApiUsername: "testuser",
    listmonkApiPassword: "testpass",
  })),
}))

describe("testConnection", () => {
  let fetchSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should make a request with correct BasicAuth header", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response)

    const result = await testConnection()

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/subscribers",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=", // base64 of "testuser:testpass"
        }),
      })
    )
  })

  it("should fail when credentials are missing", async () => {
    const { env } = await import("~/env.server")
    vi.mocked(env).mockReturnValueOnce({
      listmonkApiUrl: undefined,
      listmonkApiUsername: undefined,
      listmonkApiPassword: undefined,
    } as ReturnType<typeof env>)

    const result = await testConnection()

    expect(result.success).toBe(false)
  })
})

describe("addSubscriber", () => {
  let fetchSpy: MockInstance
  let consoleSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    consoleSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should add a subscriber with correct data", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 123 } }),
    } as Response)

    const result = await addSubscriber({
      email: "test@example.com",
      name: "Test User",
      lists: [1, 2],
      attributes: {
        profile_id: "abc-123",
        custom_field: "value",
      },
    })

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/subscribers",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          email: "test@example.com",
          name: "Test User",
          lists: [1, 2],
          attribs: {
            profile_id: "abc-123",
            custom_field: "value",
          },
        }),
      })
    )
  })

  it("should succeed but log error when API returns error", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response)

    const result = await addSubscriber({
      email: "test@example.com",
      name: "Test User",
      lists: [1],
      attributes: {},
    })

    expect(result.success).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to add subscriber")
    )
  })

  it("should fail when network error occurs", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const result = await addSubscriber({
      email: "test@example.com",
      name: "Test User",
      lists: [1],
      attributes: {},
    })

    expect(result.success).toBe(false)
  })
})

describe("removeSubscriber", () => {
  let fetchSpy: MockInstance
  let consoleSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    consoleSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should blocklist a subscriber by id", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 123, status: "blocklisted" } }),
    } as Response)

    const result = await removeSubscriber(123)

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/subscribers/123/blocklist",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=",
        }),
      })
    )
  })

  it("should succeed but log error when API returns error", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response)

    const result = await removeSubscriber(123)

    expect(result.success).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to remove subscriber")
    )
  })

  it("should fail when network error occurs", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const result = await removeSubscriber(123)

    expect(result.success).toBe(false)
  })
})

describe("createCampaign", () => {
  let fetchSpy: MockInstance
  let consoleSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    consoleSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should create a campaign with correct data", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 456 } }),
    } as Response)

    const campaignData = {
      name: "Test Campaign",
      subject: "Test Subject",
      lists: [1, 2],
      body: "<p>Test content</p>",
    }

    const result = await createCampaign(campaignData)

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/campaigns",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(campaignData),
      })
    )
  })

  it("should succeed but log error when API returns error", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
    } as Response)

    const result = await createCampaign({ name: "Test", lists: [] })

    expect(result.success).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to create campaign")
    )
  })

  it("should fail when network error occurs", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const result = await createCampaign({ name: "Test", lists: [] })

    expect(result.success).toBe(false)
  })
})

describe("updateCampaignStatus", () => {
  let fetchSpy: MockInstance
  let consoleSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    consoleSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should update campaign status", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 456, status: "running" } }),
    } as Response)

    const result = await updateCampaignStatus(456, "running")

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/campaigns/456/status",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ status: "running" }),
      })
    )
  })

  it("should succeed but log error when API returns error", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response)

    const result = await updateCampaignStatus(456, "paused")

    expect(result.success).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to update campaign status")
    )
  })

  it("should fail when network error occurs", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const result = await updateCampaignStatus(456, "cancelled")

    expect(result.success).toBe(false)
  })
})
