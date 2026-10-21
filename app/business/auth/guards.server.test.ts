import { describe, expect, it } from "vitest"
import { requireUser, requirePermission } from "./guards.server"
import { PERMISSIONS } from "./permissions"

describe("requireUser", () => {
  it("should return user when currentUser exists", () => {
    const mockUser = { id: "user-123", email: "test@example.com" }

    const result = requireUser(mockUser)

    expect(result).toEqual(mockUser)
  })

  it("should throw redirect when currentUser is null", () => {
    expect(() => requireUser(null)).toThrow()
  })
})

describe("requirePermission", () => {
  const profile = (permissions: string[] | null) => ({
    id: "profile-123",
    email: "someone@example.com",
    social_name: "Someone",
    roles: null,
    permissions,
    created_at: "2025-01-01T00:00:00Z",
    basic_data_filled: true,
  })

  it("should return the profile when it holds the permission", () => {
    const staff = profile([PERMISSIONS.EVENTS_APPLY_DIRECT])

    expect(requirePermission(staff, PERMISSIONS.EVENTS_APPLY_DIRECT)).toEqual(staff)
  })

  it("should throw redirect when profile is null", () => {
    expect(() => requirePermission(null, PERMISSIONS.ADMIN_PANEL)).toThrow()
  })

  it("should throw redirect when the profile lacks the permission", () => {
    expect(() =>
      requirePermission(profile([PERMISSIONS.EVENTS_APPLY_DIRECT]), PERMISSIONS.ADMIN_PANEL),
    ).toThrow()
  })

  it("should throw redirect when the profile has no permissions at all", () => {
    expect(() => requirePermission(profile(null), PERMISSIONS.ADMIN_PANEL)).toThrow()
  })
})
