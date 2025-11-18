import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import type { ViewEvent } from "~types/database/entities.types"
import { splitEvents } from "~/pages/dashboard/utils/split-events"

describe("Dashboard Loader - Deferred Loading Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should split events into registration categories", () => {
    // This test verifies the splitEvents function behavior
    // The defer() implementation will use this same logic

    const mockEvents: ViewEvent[] = [
      {
        id: "1",
        title: "Open Event",
        event_status: "Registration Open",
      } as ViewEvent,
      {
        id: "2",
        title: "Closed Event",
        event_status: "Registration Closed",
      } as ViewEvent,
      {
        id: "3",
        title: "Scheduled Event",
        event_status: "Scheduled",
      } as ViewEvent,
    ]

    const result = splitEvents(mockEvents)

    expect(result.registrationOpen).toHaveLength(1)
    expect(result.registrationClosed).toHaveLength(1)
    expect(result.scheduled).toHaveLength(1)
    expect(result.registrationOpen[0]?.title).toBe("Open Event")
    expect(result.registrationClosed[0]?.title).toBe("Closed Event")
    expect(result.scheduled[0]?.title).toBe("Scheduled Event")
  })

  it("should handle empty events array", () => {
    const result = splitEvents([])

    expect(result.registrationOpen).toHaveLength(0)
    expect(result.registrationClosed).toHaveLength(0)
    expect(result.scheduled).toHaveLength(0)
  })

  it("should handle undefined events", () => {
    const result = splitEvents(undefined)

    expect(result.registrationOpen).toHaveLength(0)
    expect(result.registrationClosed).toHaveLength(0)
    expect(result.scheduled).toHaveLength(0)
  })
})
