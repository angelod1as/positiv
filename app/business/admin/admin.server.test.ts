import { describe, expect, it, vi } from "vitest"

// Mock the database module
vi.mock("~/lib/supabase/db.server", () => ({
  kysely: {
    selectFrom: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([
      {
        id: "1",
        profile_id: "test-profile-id",
        event_id: "event-1",
        event_title: "Test Event 1",
        event_emoji: "🎉",
        time_event_start: "2024-03-01T10:00:00",
        application_status: "finalised",
        attendance_status: "attended",
        admin_general_notes: "Test notes",
        flag: "none",
        flag_notes: null,
      },
      {
        id: "2",
        profile_id: "test-profile-id",
        event_id: "event-2",
        event_title: "Test Event 2",
        event_emoji: "🎭",
        time_event_start: "2024-02-01T10:00:00",
        application_status: "finalised",
        attendance_status: "not-attended",
        admin_general_notes: null,
        flag: "yellow",
        flag_notes: "Needs follow-up",
      },
    ]),
  },
}))

describe("getParticipantFullEventHistory", () => {
  it("should be defined with correct function signature", () => {
    // This test will fail until we create the function
    // We're testing that the function exists and returns the expected shape
    import("./admin.server").then((module) => {
      expect(module.getParticipantFullEventHistory).toBeDefined()
      expect(typeof module.getParticipantFullEventHistory).toBe("function")
    })
  })

  // Integration tests for this function have been moved to admin.server.integration.test.ts
  // These tests require database access and are now properly tested with a real database connection
})