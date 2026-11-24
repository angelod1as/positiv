import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { Constants } from "~/types/database/database.types"
import { PERMISSIONS } from "./permissions"

const DOC = readFileSync(join(process.cwd(), "docs", "rbac.md"), "utf-8")

const headingsUnder = (section: string) => {
  const start = DOC.indexOf(`\n## ${section}\n`)
  if (start === -1) return []
  const end = DOC.indexOf("\n## ", start + 1)
  const body = DOC.slice(start, end === -1 ? undefined : end)

  return [...body.matchAll(/^### `([^`]+)`$/gm)].map(([, name]) => name).sort()
}

describe("docs/rbac.md", () => {
  it("documents every role, and only roles that exist", () => {
    expect(headingsUnder("Roles")).toEqual(
      [...Constants.public.Enums.user_role].sort(),
    )
  })

  it("documents every permission, and only permissions that exist", () => {
    expect(headingsUnder("Permissions")).toEqual(
      [...Constants.public.Enums.app_permission].sort(),
    )
  })
})

describe("PERMISSIONS", () => {
  it("names every app_permission value", () => {
    expect(Object.values(PERMISSIONS).sort()).toEqual(
      [...Constants.public.Enums.app_permission].sort(),
    )
  })
})
