import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Node 24.22.1 is the October 21, 2026 security release (Brotli RCE, TLS
// hostname bypasses, DNS truncation). A floating node:24-alpine says nothing
// about which 24.x the production image was built from: Coolify reuses the base
// image it already has cached. An exact tag forces the pull and lets Dependabot
// raise it.
const PATCHED = [24, 22, 1] as const

const dockerfile = readFileSync(join(import.meta.dirname, "..", "Dockerfile"), "utf8")

const packageJson = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"),
) as { engines: { node: string }; devEngines: { runtime: { version: string } } }

const workflowsDir = join(import.meta.dirname, "..", ".github", "workflows")
const workflows = readdirSync(workflowsDir)
  .filter((file) => file.endsWith(".yml"))
  .map((file) => [file, readFileSync(join(workflowsDir, file), "utf8")] as const)

function parse(version: string): number[] {
  return version.split(".").map(Number)
}

function atLeastPatched(version: number[]): boolean {
  for (let i = 0; i < PATCHED.length; i++) {
    if (version[i] !== PATCHED[i]) return version[i] > PATCHED[i]
  }
  return true
}

describe("Node version", () => {
  it("builds every Docker stage from one exact, patched Node 24 alpine tag", () => {
    const tags = [...dockerfile.matchAll(/^FROM node:(\S+)/gm)].map((m) => m[1])

    expect(tags.length).toBeGreaterThan(0)
    expect(new Set(tags).size).toBe(1)

    const version = tags[0].match(/^(\d+\.\d+\.\d+)-alpine$/)?.[1]

    expect(version, `"${tags[0]}" is not an exact x.y.z-alpine tag`).toBeDefined()
    expect(parse(version ?? "")[0]).toBe(24)
    expect(atLeastPatched(parse(version ?? ""))).toBe(true)
  })

  it.each([
    ["engines", packageJson.engines.node],
    ["devEngines", packageJson.devEngines.runtime.version],
  ])("refuses an unpatched Node in %s", (_field, range) => {
    const floor = range.match(/^>=(\d+\.\d+\.\d+) <25$/)?.[1]

    expect(floor, `"${range}" has no exact >=x.y.z <25 floor`).toBeDefined()
    expect(atLeastPatched(parse(floor ?? ""))).toBe(true)
  })

  // .nvmrc says 24, and setup-node takes whatever 24.x the runner image has
  // cached unless told to look for the newest one.
  it.each(workflows.filter(([, text]) => text.includes("actions/setup-node")))(
    "resolves the latest Node 24 patch in every setup-node step of %s",
    (_file, text) => {
      const steps = [...text.matchAll(/uses: actions\/setup-node@.+\n((?: {8,}.+\n)+)/g)]

      expect(steps.length).toBeGreaterThan(0)
      for (const [, body] of steps) {
        expect(body).toContain("node-version-file: .nvmrc")
        expect(body).toContain("check-latest: true")
      }
    },
  )
})
