import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Corepack resolves pnpm from packageManager when the image runs it from /app.
// A version written into the Dockerfile is a second source of truth that a
// packageManager bump leaves behind, and the image keeps building with the old
// pnpm without anyone noticing.
const dockerfile = readFileSync(join(import.meta.dirname, "..", "Dockerfile"), "utf8")

const packageJson = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"),
) as { packageManager: string }

describe("pnpm version", () => {
  it("declares an exact pnpm version in packageManager", () => {
    expect(packageJson.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/)
  })

  it("leaves the image's pnpm version to packageManager", () => {
    const pins = [...dockerfile.matchAll(/pnpm@\S+/g)].map((m) => m[0])

    expect(pins).toEqual([])
  })

  it("enables corepack in every stage that runs pnpm", () => {
    const stages = dockerfile.split(/^FROM /m).slice(1)

    for (const stage of stages.filter((s) => /^RUN pnpm /m.test(s))) {
      expect(stage).toMatch(/^RUN corepack enable$/m)
    }
  })
})
