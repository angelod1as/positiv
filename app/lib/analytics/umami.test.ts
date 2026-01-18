import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { trackEvent, identifyUser } from "./umami"

describe("umami analytics", () => {
  const mockTrack = vi.fn()
  const mockIdentify = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("window", {
      umami: {
        track: mockTrack,
        identify: mockIdentify,
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe("trackEvent", () => {
    it("should call window.umami.track with event name", () => {
      trackEvent("test_event")

      expect(mockTrack).toHaveBeenCalledTimes(1)
      expect(mockTrack).toHaveBeenCalledWith("test_event", undefined)
    })

    it("should call window.umami.track with event name and data", () => {
      const eventData = { eventId: "123", profileId: "456" }

      trackEvent("event_application_submitted", eventData)

      expect(mockTrack).toHaveBeenCalledTimes(1)
      expect(mockTrack).toHaveBeenCalledWith(
        "event_application_submitted",
        eventData
      )
    })

    it("should not throw when window is undefined", () => {
      vi.stubGlobal("window", undefined)

      expect(() => trackEvent("test_event")).not.toThrow()
    })

    it("should not throw when window.umami is undefined", () => {
      vi.stubGlobal("window", {})

      expect(() => trackEvent("test_event")).not.toThrow()
    })
  })

  describe("identifyUser", () => {
    it("should call window.umami.identify with user id", () => {
      identifyUser("user-123")

      expect(mockIdentify).toHaveBeenCalledTimes(1)
      expect(mockIdentify).toHaveBeenCalledWith("user-123", undefined)
    })

    it("should call window.umami.identify with user id and data", () => {
      const userData = { role: "admin" }

      identifyUser("user-123", userData)

      expect(mockIdentify).toHaveBeenCalledTimes(1)
      expect(mockIdentify).toHaveBeenCalledWith("user-123", userData)
    })

    it("should not throw when window is undefined", () => {
      vi.stubGlobal("window", undefined)

      expect(() => identifyUser("user-123")).not.toThrow()
    })

    it("should not throw when window.umami is undefined", () => {
      vi.stubGlobal("window", {})

      expect(() => identifyUser("user-123")).not.toThrow()
    })
  })
})
