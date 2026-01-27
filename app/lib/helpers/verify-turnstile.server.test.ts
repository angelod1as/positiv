import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { verifyTurnstileToken } from "./verify-turnstile.server"

describe("verifyTurnstileToken", () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env.NODE_ENV = "test"
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it("should return success true when Cloudflare validates the token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    } as Response)

    const result = await verifyTurnstileToken("valid-token", "127.0.0.1")

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it("should return success false when Cloudflare rejects the token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
    } as Response)

    const result = await verifyTurnstileToken("invalid-token", "127.0.0.1")

    expect(result.success).toBe(false)
    expect(result.error).toBe("invalid-input-response")
  })

  it("should join multiple error codes with comma", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({
        success: false,
        "error-codes": ["invalid-input-response", "timeout-or-duplicate"],
      }),
    } as Response)

    const result = await verifyTurnstileToken("invalid-token", "127.0.0.1")

    expect(result.success).toBe(false)
    expect(result.error).toBe("invalid-input-response, timeout-or-duplicate")
  })

  it("should call Cloudflare API with correct parameters", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    } as Response)

    await verifyTurnstileToken("test-token", "192.168.1.1")

    expect(fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    )

    const call = vi.mocked(fetch).mock.calls[0]
    const body = call[1]?.body as URLSearchParams
    expect(body.get("response")).toBe("test-token")
    expect(body.get("remoteip")).toBe("192.168.1.1")
    expect(body.get("secret")).toBeTruthy()
  })

  it("should handle network errors gracefully", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"))

    const result = await verifyTurnstileToken("test-token", "127.0.0.1")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Network error")
  })
})
