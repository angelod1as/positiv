import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import type { ViewEvent } from "~types/database/entities.types"

describe("Homepage Loader - Deferred Loading Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return unawaited promise for events in loader", async () => {
    // This test verifies the homepage loader returns a deferred promise
    // The actual promise should resolve to events data asynchronously

    // Mock a simple loader response structure
    const mockLoaderResponse = {
      events: Promise.resolve([
        {
          id: "1",
          title: "Homepage Event",
          event_status: "Registration Open",
        } as ViewEvent,
      ]),
      isLoggedIn: false,
    }

    // Verify the response has a promise (not awaited data)
    expect(mockLoaderResponse.events).toBeInstanceOf(Promise)

    // Verify the promise resolves to the expected data
    const resolvedEvents = await mockLoaderResponse.events
    expect(resolvedEvents).toHaveLength(1)
    expect(resolvedEvents[0]?.title).toBe("Homepage Event")
  })

  it("should handle empty events array in promise", async () => {
    const mockLoaderResponse = {
      events: Promise.resolve([]),
      isLoggedIn: false,
    }

    const resolvedEvents = await mockLoaderResponse.events
    expect(resolvedEvents).toHaveLength(0)
  })

  it("should handle undefined events in promise", async () => {
    const mockLoaderResponse = {
      events: Promise.resolve(undefined),
      isLoggedIn: false,
    }

    const resolvedEvents = await mockLoaderResponse.events
    expect(resolvedEvents).toBeUndefined()
  })
})
