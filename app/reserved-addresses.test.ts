import { readFileSync } from "node:fs"
import { afterEach, describe, expect, it, vi } from "vitest"

import { reservedAddresses } from "./reserved-addresses"

type Route = { path?: string; children?: Route[] }

async function developmentRoutes() {
  vi.stubEnv("NODE_ENV", "development")
  vi.resetModules()
  return (await import("./routes")).default as Route[]
}

function topLevelSegments(routes: Route[]): string[] {
  return routes.flatMap((route) => {
    const segment = route.path?.replace(/^\//, "").split("/")[0]
    if (segment === "*") return []
    return segment ? [segment] : topLevelSegments(route.children ?? [])
  })
}

function missingFrom(reserved: readonly string[], routes: Route[]) {
  return [...new Set(topLevelSegments(routes))].filter(
    (segment) => !reserved.includes(segment),
  )
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("reserved addresses", () => {
  it("reserves every top-level segment of the Platform's routes", async () => {
    expect(missingFrom(reservedAddresses, await developmentRoutes())).toEqual(
      [],
    )
  })

  it("names a route segment once it drops off the list", async () => {
    const withoutAdmin = reservedAddresses.filter(
      (segment) => segment !== "admin",
    )

    expect(missingFrom(withoutAdmin, await developmentRoutes())).toEqual([
      "admin",
    ])
  })

  it("stays import-free, so the Studio can bundle it across the workspace", () => {
    const source = readFileSync("app/reserved-addresses.ts", "utf8")

    expect(source).toContain("reservedAddresses")
    expect(source).not.toMatch(/^\s*import\b/m)
    expect(source).not.toMatch(/\brequire\s*\(/)
  })
})
