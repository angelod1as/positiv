import { ESLint } from "eslint"
import { describe, expect, it } from "vitest"

// Linted as if it were this file, so the real config and its globs decide.
const PROBE_PATH = "app/business/common.ts"

const restrictedSyntaxErrors = async (code: string) => {
  const eslint = new ESLint()
  const [result] = await eslint.lintText(code, { filePath: PROBE_PATH })

  return result.messages.filter(
    (message) => message.ruleId === "no-restricted-syntax",
  )
}

describe("permission guard", () => {
  it.each([
    ["reads is_admin", "export const f = (p: { is_admin: boolean }) => p.is_admin"],
    ["filters on role_name", 'export const column = "user_roles.role_name"'],
    ["reads role_name", "export const f = (row: { role_name: string }) => row.role_name"],
    ["compares a role name", 'export const f = (role: string) => role === "admin"'],
    [
      "looks for a role in a list",
      'export const f = (roles: string[]) => roles.includes("staff")',
    ],
    [
      "reaches for the ROLES constant",
      'import { ROLES } from "~/lib/constants/roles"\nexport const admin = ROLES.ADMIN',
    ],
  ])("fails when app code %s", async (_, code) => {
    expect(await restrictedSyntaxErrors(code)).not.toEqual([])
  }, 60_000)

  it("lets app code ask for a permission", async () => {
    const code = [
      'import { can, PERMISSIONS } from "~/business/auth/permissions"',
      "export const f = (p: { permissions: string[] }) => can(p, PERMISSIONS.ADMIN_PANEL)",
    ].join("\n")

    expect(await restrictedSyntaxErrors(code)).toEqual([])
  }, 60_000)
})
