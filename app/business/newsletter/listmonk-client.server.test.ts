import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { createListmonkClient } from "./listmonk-client.server"

vi.mock("~/env.server", () => ({
  env: vi.fn(() => ({
    listmonkApiUrl: "https://listmonk.test",
    listmonkApiUsername: "testuser",
    listmonkApiPassword: "testpass",
  })),
}))

describe("createListmonkClient", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should create a client with correct BasicAuth header", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response)

    const client = createListmonkClient()

    // Try to make a request to verify auth header is set
    await client.testConnection()

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/subscribers",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=", // base64 of "testuser:testpass"
        }),
      })
    )
  })

  it("should handle missing credentials gracefully", async () => {
    const { env } = await import("~/env.server")
    vi.mocked(env).mockReturnValueOnce({
      listmonkApiUrl: undefined,
      listmonkApiUsername: undefined,
      listmonkApiPassword: undefined,
    } as any)

    expect(() => createListmonkClient()).toThrow(
      "Listmonk API credentials not configured"
    )
  })
})

describe("addSubscriber", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>
  let consoleSpy: ReturnType<typeof vi.spyOn>

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

    const client = createListmonkClient()

    await client.addSubscriber({
      email: "test@example.com",
      name: "Test User",
      lists: [1, 2],
      attributes: {
        profile_id: "abc-123",
        custom_field: "value",
      },
    })

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

  it("should handle API errors gracefully without throwing", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response)

    const client = createListmonkClient()

    await expect(
      client.addSubscriber({
        email: "test@example.com",
        name: "Test User",
        lists: [1],
        attributes: {},
      })
    ).resolves.not.toThrow()

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to add subscriber")
    )
  })

  it("should handle network errors gracefully", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const client = createListmonkClient()

    await expect(
      client.addSubscriber({
        email: "test@example.com",
        name: "Test User",
        lists: [1],
        attributes: {},
      })
    ).resolves.not.toThrow()

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to add subscriber"),
      expect.any(Error)
    )
  })
})

describe("removeSubscriber", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>
  let consoleSpy: ReturnType<typeof vi.spyOn>

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

    const client = createListmonkClient()

    await client.removeSubscriber(123)

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

  it("should handle API errors gracefully without throwing", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response)

    const client = createListmonkClient()

    await expect(client.removeSubscriber(123)).resolves.not.toThrow()

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to remove subscriber")
    )
  })

  it("should handle network errors gracefully", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const client = createListmonkClient()

    await expect(client.removeSubscriber(123)).resolves.not.toThrow()

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to remove subscriber"),
      expect.any(Error)
    )
  })
})
