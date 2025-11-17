import { describe, expect, it, vi, beforeEach } from "vitest"

// Mock the getAdminContext to return without events
vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(async () => ({
    user: {
      id: "test-user-id",
      email: "admin@test.com",
    },
    supabase: {} as any,
  })),
  getEventsForDashboard: vi.fn(async () => [
    {
      id: "event-1",
      title: "Test Event 1",
      emoji: "🎉",
      event_status: "published",
      time_event_start: "2024-03-01T10:00:00",
    },
    {
      id: "event-2",
      title: "Test Event 2",
      emoji: "🎭",
      event_status: "draft",
      time_event_start: "2024-02-01T10:00:00",
    },
  ]),
}))

describe("Dashboard Page Loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should load events with only required fields", async () => {
    const { loader } = await import("./dashboard-page")

    const request = new Request("http://localhost/admin/dashboard")
    const params = {}

    const result = await loader({ request, params } as any)

    expect(result).toBeDefined()
    expect(result.events).toBeDefined()
    expect(Array.isArray(result.events)).toBe(true)

    if (result.events && result.events.length > 0) {
      const event = result.events[0]
      expect(event).toHaveProperty("id")
      expect(event).toHaveProperty("title")
      expect(event).toHaveProperty("emoji")
      expect(event).toHaveProperty("event_status")
      expect(event).toHaveProperty("time_event_start")
    }
  })

  it("should sort events by time_event_start", async () => {
    const { loader } = await import("./dashboard-page")

    const request = new Request("http://localhost/admin/dashboard")
    const params = {}

    const result = await loader({ request, params } as any)

    if (result.events && result.events.length > 1) {
      const firstEventTime = result.events[0].time_event_start
      const secondEventTime = result.events[1].time_event_start

      if (firstEventTime && secondEventTime) {
        expect(new Date(firstEventTime).getTime()).toBeLessThanOrEqual(
          new Date(secondEventTime).getTime(),
        )
      }
    }
  })
})
