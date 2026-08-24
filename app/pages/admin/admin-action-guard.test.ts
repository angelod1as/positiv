import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// React Router runs an action before it revalidates loaders, so the admin
// layout loader does not protect a POST. Every admin action has to call
// getAdminContext itself, and this test is what stops the next new page from
// repeating the hole.
const ADMIN_PAGES = join(process.cwd(), "app/pages/admin")

const EXPORTS_AN_ACTION = /export\s+(async\s+function|const)\s+action\b/

const collectRouteFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) return collectRouteFiles(path)
    if (!/\.tsx?$/.test(entry.name)) return []
    if (/\.(test|spec)\.tsx?$/.test(entry.name)) return []

    return [path]
  })

describe("admin actions", () => {
  it("should check the admin context in every action under app/pages/admin", () => {
    const unguarded = collectRouteFiles(ADMIN_PAGES)
      .map((path) => ({ path, source: readFileSync(path, "utf-8") }))
      .filter(({ source }) => EXPORTS_AN_ACTION.test(source))
      .filter(({ source }) => !source.includes("getAdminContext"))
      .map(({ path }) => path.replace(`${process.cwd()}/`, ""))

    expect(unguarded).toEqual([])
  })
})
