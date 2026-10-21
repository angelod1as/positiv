import { describe, expect, it } from "vitest"
import { can, PERMISSIONS } from "./permissions"

const admin = {
  permissions: [
    PERMISSIONS.ADMIN_PANEL,
    PERMISSIONS.EVENTS_APPLY_DIRECT,
    PERMISSIONS.EVENTS_MANAGE,
  ],
}
const staff = { permissions: [PERMISSIONS.EVENTS_APPLY_DIRECT] }
const user = { permissions: null }

describe("can", () => {
  it("lets an admin apply directly and enter the admin panel", () => {
    expect(can(admin, PERMISSIONS.EVENTS_APPLY_DIRECT)).toBe(true)
    expect(can(admin, PERMISSIONS.ADMIN_PANEL)).toBe(true)
  })

  it("lets a staff apply directly but not enter the admin panel", () => {
    expect(can(staff, PERMISSIONS.EVENTS_APPLY_DIRECT)).toBe(true)
    expect(can(staff, PERMISSIONS.ADMIN_PANEL)).toBe(false)
  })

  it("gives a person with no role nothing", () => {
    expect(can(user, PERMISSIONS.EVENTS_APPLY_DIRECT)).toBe(false)
    expect(can({}, PERMISSIONS.ADMIN_PANEL)).toBe(false)
  })

  it("gives nobody logged out anything", () => {
    expect(can(null, PERMISSIONS.EVENTS_APPLY_DIRECT)).toBe(false)
    expect(can(undefined, PERMISSIONS.ADMIN_PANEL)).toBe(false)
  })
})
