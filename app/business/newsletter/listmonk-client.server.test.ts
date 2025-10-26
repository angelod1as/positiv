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
    vi.mocked(env).mockReturnValue({
      listmonkApiUrl: undefined,
      listmonkApiUsername: undefined,
      listmonkApiPassword: undefined,
    } as any)

    expect(() => createListmonkClient()).toThrow(
      "Listmonk API credentials not configured"
    )
  })
})
