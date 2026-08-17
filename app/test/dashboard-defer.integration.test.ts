import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import type { Event } from "~types/database/entities.types"
import { splitEvents } from "~/pages/dashboard/utils/split-events"

describe("Dashboard Loader - Deferred Loading Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should split events into applied and available categories", () => {
    // This test verifies the splitEvents function behavior
    // The defer() implementation will use this same logic

    const mockEvents: Event[] = [
      {
        id: "1",
        title: "Applied Event",
        is_applied: true,
      } as Event,
      {
        id: "2",
        title: "Available Event",
        is_applied: false,
      } as Event,
    ]

    const result = splitEvents(mockEvents)

    expect(result.applied).toHaveLength(1)
    expect(result.available).toHaveLength(1)
    expect(result.applied[0]?.title).toBe("Applied Event")
    expect(result.available[0]?.title).toBe("Available Event")
  })

  it("should handle empty events array", () => {
    const result = splitEvents([])

    expect(result.applied).toHaveLength(0)
    expect(result.available).toHaveLength(0)
  })

  it("should handle undefined events", () => {
    const result = splitEvents(undefined)

    expect(result.applied).toHaveLength(0)
    expect(result.available).toHaveLength(0)
  })
})
