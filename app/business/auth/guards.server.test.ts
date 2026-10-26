import { describe, expect, it } from "vitest"
import paths from "~/lib/paths"
import { requireUser, requirePermission } from "./guards.server"
import { PERMISSIONS } from "./permissions"

const {
  auth: { LOGIN },
  dash: { DASHBOARD },
} = paths

const expectRedirect = async (guard: () => unknown, location: string) => {
  let error: unknown
  try {
    await guard()
  } catch (caught) {
    error = caught
  }

  expect(error).toBeInstanceOf(Response)
  const response = error as Response
  expect(response.status).toBe(302)
  expect(response.headers.get("Location")).toBe(location)
  expect(response.headers.get("Set-Cookie")).toBeTruthy()
}

describe("requireUser", () => {
  it("should return user when currentUser exists", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" }

    const result = await requireUser(mockUser)

    expect(result).toEqual(mockUser)
  })

  it("should throw a redirect to login when currentUser is null", async () => {
    await expectRedirect(() => requireUser(null), LOGIN)
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

  it("should return the profile when it holds the permission", async () => {
    const staff = profile([PERMISSIONS.EVENTS_APPLY_DIRECT])

    expect(
      await requirePermission(staff, PERMISSIONS.EVENTS_APPLY_DIRECT),
    ).toEqual(staff)
  })

  it("should throw a redirect to login when profile is null", async () => {
    await expectRedirect(
      () => requirePermission(null, PERMISSIONS.ADMIN_PANEL),
      LOGIN,
    )
  })

  it("should throw a redirect to the dashboard when the profile lacks the permission", async () => {
    await expectRedirect(
      () =>
        requirePermission(
          profile([PERMISSIONS.EVENTS_APPLY_DIRECT]),
          PERMISSIONS.ADMIN_PANEL,
        ),
      DASHBOARD,
    )
  })

  it("should throw a redirect to the dashboard when the profile has no permissions at all", async () => {
    await expectRedirect(
      () => requirePermission(profile(null), PERMISSIONS.ADMIN_PANEL),
      DASHBOARD,
    )
  })
})
