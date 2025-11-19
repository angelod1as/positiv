import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"

// Mock getUserContext to return a basic user context
vi.mock("../auth/auth.server", () => ({
  getUserContext: vi.fn(async () => ({
    user: {
      id: "test-user-id",
      email: "admin@test.com",
      user_metadata: { admin: true },
    },
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          error: null,
          data: [
            { id: "event-1", title: "Test Event 1" },
            { id: "event-2", title: "Test Event 2" },
          ],
        })),
      })),
    } as unknown as SupabaseClient,
  })),
}))

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

// Import after mocking
import { getAdminContext, getParticipantFullEventHistory } from "./admin.server"

describe("getAdminContext", () => {
  it("should return admin context without events array", async () => {
    const request = new Request("http://localhost/admin")
    const params = {}

    const result = await getAdminContext(request, params)

    expect(result).toBeDefined()
    expect(result.supabase).toBeDefined()
    expect(result).not.toHaveProperty("events")
  })
})

describe("getParticipantFullEventHistory", () => {
  it("should be defined with correct function signature", () => {
    expect(getParticipantFullEventHistory).toBeDefined()
    expect(typeof getParticipantFullEventHistory).toBe("function")
  })
})