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
    currentProfile: {
      id: "test-profile-id",
      permissions: ["admin.panel"],
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

// Import after mocking
import { getUserContext } from "../auth/auth.server"
import { getAdminContext } from "./admin.server"
import { getParticipantFullEventHistory } from "../profile/profiles.server"

describe("getAdminContext", () => {
  it("should return admin context without events array", async () => {
    const request = new Request("http://localhost/admin")
    const params = {}

    const result = await getAdminContext(request, params)

    expect(result).toBeDefined()
    expect(result.supabase).toBeDefined()
    expect(result).not.toHaveProperty("events")
  })

  // Actions call this directly: React Router does not run the admin layout
  // loader before a child action, so this is the only check standing there
  it("should refuse a signed-in profile that is not an admin", async () => {
    vi.mocked(getUserContext).mockResolvedValueOnce({
      currentProfile: { id: "test-profile-id" },
    } as unknown as Awaited<ReturnType<typeof getUserContext>>)

    await expect(
      getAdminContext(new Request("http://localhost/admin"), {}),
    ).rejects.toBeInstanceOf(Response)
  })

  it("should refuse a staff, who may apply directly but not enter the admin panel", async () => {
    vi.mocked(getUserContext).mockResolvedValueOnce({
      currentProfile: {
        id: "test-profile-id",
        permissions: ["events.apply_direct"],
      },
    } as unknown as Awaited<ReturnType<typeof getUserContext>>)

    await expect(
      getAdminContext(new Request("http://localhost/admin"), {}),
    ).rejects.toBeInstanceOf(Response)
  })

  it("should refuse a user without a profile", async () => {
    vi.mocked(getUserContext).mockResolvedValueOnce({
      currentProfile: null,
    } as unknown as Awaited<ReturnType<typeof getUserContext>>)

    await expect(
      getAdminContext(new Request("http://localhost/admin"), {}),
    ).rejects.toBeInstanceOf(Response)
  })
})

describe("getParticipantFullEventHistory", () => {
  it("should be defined with correct function signature", () => {
    expect(getParticipantFullEventHistory).toBeDefined()
    expect(typeof getParticipantFullEventHistory).toBe("function")
  })
})