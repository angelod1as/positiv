import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Node 24.22.1 is the October 21, 2026 security release (Brotli RCE, TLS
// hostname bypasses, DNS truncation). A floating node:24-alpine says nothing
// about which 24.x the production image was built from: Coolify reuses the base
// image it already has cached. An exact tag forces the pull and lets Dependabot
// raise it.
const PATCHED = [24, 22, 1] as const

const dockerfile = readFileSync(join(import.meta.dirname, "..", "Dockerfile"), "utf8")

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
})
