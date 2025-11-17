import { describe, expect, it } from "vitest"
import { requireUser, requireAdmin } from "./guards.server"

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

describe("requireAdmin", () => {
  it("should return profile when user is admin", () => {
    const mockProfile = {
      id: "profile-123",
      email: "admin@example.com",
      social_name: "Admin",
      is_admin: true,
      created_at: "2025-01-01T00:00:00Z",
      basic_data_filled: true,
    }

    const result = requireAdmin(mockProfile)

    expect(result).toEqual(mockProfile)
  })

  it("should throw redirect when profile is null", () => {
    expect(() => requireAdmin(null)).toThrow()
  })

  it("should throw redirect when user is not admin", () => {
    const mockProfile = {
      id: "profile-123",
      email: "user@example.com",
      social_name: "User",
      is_admin: false,
      created_at: "2025-01-01T00:00:00Z",
      basic_data_filled: true,
    }

    expect(() => requireAdmin(mockProfile)).toThrow()
  })
})
