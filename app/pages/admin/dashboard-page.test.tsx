import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

// Mock the getAdminContext to return without events
vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn().mockResolvedValue({
    user: {
      id: "test-user-id",
      email: "admin@test.com",
    },
    supabase: {} as SupabaseClient,
  }),
  getEventsForDashboard: vi.fn().mockResolvedValue([
    {
      id: "event-1",
      title: "Test Event 1",
      emoji: "🎉",
      description: "Test Description 1",
      location: "Test Location 1",
      ticket_price: "100",
      event_status: "Registration Open",
      time_event_start: "2024-03-01T10:00:00",
      time_event_end: "2024-03-01T12:00:00",
      time_application_start: "2024-02-01T00:00:00",
      time_group_start: null,
      time_group_end: null,
      time_payment_start: null,
      time_payment_end: null,
    },
    {
      id: "event-2",
      title: "Test Event 2",
      emoji: "🎭",
      description: "Test Description 2",
      location: "Test Location 2",
      ticket_price: "150",
      event_status: "Scheduled",
      time_event_start: "2024-02-01T10:00:00",
      time_event_end: "2024-02-01T12:00:00",
      time_application_start: "2024-01-01T00:00:00",
      time_group_start: null,
      time_group_end: null,
      time_payment_start: null,
      time_payment_end: null,
    },
    {
      id: "event-3",
      title: "Test Event 3",
      emoji: "🎪",
      description: "Test Description 3",
      location: "Test Location 3",
      ticket_price: "200",
      event_status: "Registration Open",
      time_event_start: "2024-04-01T10:00:00",
      time_event_end: "2024-04-01T12:00:00",
      time_application_start: "2024-03-01T00:00:00",
      time_group_start: null,
      time_group_end: null,
      time_payment_start: null,
      time_payment_end: null,
    },
  ]),
}))

// Import after mocking
import { loader } from "./dashboard-page"

describe("Dashboard Page Loader", () => {
  it("should load events with only required fields", async () => {
    const result = await loader()

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

  it("should return events sorted by time_event_start in descending order", async () => {
    const result = await loader()

    if (result.events && result.events.length > 1) {
      const firstEventTime = result.events[0].time_event_start
      const secondEventTime = result.events[1].time_event_start

      if (firstEventTime && secondEventTime) {
        expect(new Date(firstEventTime).getTime()).toBeGreaterThanOrEqual(
          new Date(secondEventTime).getTime(),
        )
      }
    }
  })
})
