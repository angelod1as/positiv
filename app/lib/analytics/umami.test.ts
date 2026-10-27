import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest"
import type { AnonymousRegistry } from "./events"
import { trackEvent } from "./umami"

describe("umami analytics", () => {
  const mockTrack = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("window", {
      umami: {
        track: mockTrack,
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  describe("trackEvent", () => {
    it("sends an event that carries no payload by name alone", () => {
      trackEvent("signup_completed")

      expect(mockTrack).toHaveBeenCalledTimes(1)
      expect(mockTrack).toHaveBeenCalledWith("signup_completed", undefined)
    })

    it("sends a registered event with its payload", () => {
      trackEvent("application_submitted", { eventId: "123" })

      expect(mockTrack).toHaveBeenCalledTimes(1)
      expect(mockTrack).toHaveBeenCalledWith("application_submitted", {
        eventId: "123",
      })
    })

    it("should not throw when window is undefined", () => {
      vi.stubGlobal("window", undefined)

      expect(() => trackEvent("signup_completed")).not.toThrow()
    })

    it("should not throw when window.umami is undefined", () => {
      vi.stubGlobal("window", {})

      expect(() => trackEvent("signup_completed")).not.toThrow()
    })
  })

  describe("the registry's types", () => {
    it("refuses names and payloads it does not register", () => {
      vi.stubGlobal("window", {})

      // @ts-expect-error - a name the registry does not hold
      trackEvent("application_clicked", { eventId: "123" })
      // @ts-expect-error - a registered name with a field it does not declare
      trackEvent("application_submitted", { eventId: "123", userId: "u" })
      // @ts-expect-error - a payload left out of an event that declares one
      trackEvent("application_submitted")
      // @ts-expect-error - a payload handed to an event that declares none
      trackEvent("signup_completed", { eventId: "123" })

      expect(mockTrack).not.toHaveBeenCalled()
    })

    it("refuses a payload field that names personal data", () => {
      // @ts-expect-error - personal data cannot be declared as a payload field
      type WithEmail = AnonymousRegistry<{ signup_completed: { email: string } }>
      // @ts-expect-error - personal data cannot be declared as a payload field
      type WithUserId = AnonymousRegistry<{ login_completed: { userId: string } }>

      expectTypeOf<WithEmail | WithUserId>().not.toBeNever()
    })
  })
})
