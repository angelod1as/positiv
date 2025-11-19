import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ProfileWithRoles } from "~types/database/entities.types"
import { useProfileUpdateStatus } from "./use-profile-update-status"

const createMockProfile = (
  overrides: Partial<ProfileWithRoles> = {},
): ProfileWithRoles => ({
  id: "test-id",
  email: "test@example.com",
  full_name: "Test User",
  is_admin: false,
  basic_data_filled: true,
  social_name: null,
  pronouns: null,
  rg: null,
  cpf: null,
  phone: null,
  date_of_birth: null,
  gender: null,
  orientation: null,
  where_lives: null,
  how_came_to_us: null,
  rg_issuer: null,
  created_at: "2024-01-01",
  race_color: ["white"], // Default: has race_color
  ...overrides,
})

describe("useProfileUpdateStatus", () => {
  it("should return true when race_color is missing (null)", () => {
    const profile = createMockProfile({ race_color: null })

    const { result } = renderHook(() => useProfileUpdateStatus(profile))

    expect(result.current).toBe(true)
  })

  it("should return true when race_color is missing (undefined)", () => {
    const profile = createMockProfile({ race_color: undefined })

    const { result } = renderHook(() => useProfileUpdateStatus(profile))

    expect(result.current).toBe(true)
  })

  it("should return true when race_color is empty array", () => {
    const profile = createMockProfile({ race_color: [] })

    const { result } = renderHook(() => useProfileUpdateStatus(profile))

    expect(result.current).toBe(true)
  })

  it("should return false when race_color is present", () => {
    const profile = createMockProfile({ race_color: ["white"] })

    const { result } = renderHook(() => useProfileUpdateStatus(profile))

    expect(result.current).toBe(false)
  })

  it("should return false when race_color has multiple values", () => {
    const profile = createMockProfile({ race_color: ["white", "asian"] })

    const { result } = renderHook(() => useProfileUpdateStatus(profile))

    expect(result.current).toBe(false)
  })

  it("should return false when profile is null", () => {
    const { result } = renderHook(() => useProfileUpdateStatus(null))

    expect(result.current).toBe(false)
  })

  it("should return false when profile is undefined", () => {
    const { result } = renderHook(() => useProfileUpdateStatus(undefined))

    expect(result.current).toBe(false)
  })

  it("should handle profile changes reactively", () => {
    const profileWithoutRace = createMockProfile({ race_color: null })
    const profileWithRace = createMockProfile({ race_color: ["black"] })

    const { result, rerender } = renderHook(
      ({ profile }) => useProfileUpdateStatus(profile),
      { initialProps: { profile: profileWithoutRace } },
    )

    // Initially should need update
    expect(result.current).toBe(true)

    // After providing race_color, should not need update
    rerender({ profile: profileWithRace })
    expect(result.current).toBe(false)
  })
})
