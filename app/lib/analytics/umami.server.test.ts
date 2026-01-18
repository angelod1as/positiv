import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { trackServerEvent } from "./umami.server"

describe("trackServerEvent", () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch)
    mockFetch.mockResolvedValue({ ok: true })

    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "test-website-id")
    vi.stubEnv("VITE_UMAMI_URL", "https://umami.test.com")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it("should send event to Umami API with correct payload", async () => {
    await trackServerEvent("test_event", { key: "value" }, "/test-page")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      "https://umami.test.com/api/send",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": expect.stringContaining("Mozilla"),
          Origin: "https://positivparty.com",
          Referer: "https://positivparty.com/",
        },
        body: JSON.stringify({
          type: "event",
          payload: {
            website: "test-website-id",
            hostname: "positivparty.com",
            url: "/test-page",
            name: "test_event",
            language: "pt-BR",
            screen: "1920x1080",
            title: "Positiv",
            data: { key: "value" },
          },
        }),
      })
    )
  })

  it("should use default url when not provided", async () => {
    await trackServerEvent("test_event")

    expect(mockFetch).toHaveBeenCalledWith(
      "https://umami.test.com/api/send",
      expect.objectContaining({
        body: expect.stringContaining('"url":"/"'),
      })
    )
  })

  it("should not send event when website ID is missing", async () => {
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "")

    await trackServerEvent("test_event")

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("should not send event when Umami URL is missing", async () => {
    vi.stubEnv("VITE_UMAMI_URL", "")

    await trackServerEvent("test_event")

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("should silently handle fetch errors", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"))

    await expect(trackServerEvent("test_event")).resolves.not.toThrow()
  })

  it("should send event without data when not provided", async () => {
    await trackServerEvent("test_event")

    const callArgs = mockFetch.mock.calls[0]
    const body = JSON.parse(callArgs[1].body)
    expect(body.payload.data).toBeUndefined()
  })
})
