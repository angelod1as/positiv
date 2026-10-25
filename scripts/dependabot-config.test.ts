import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Nobody heard about vulnerable dependencies until someone ran pnpm audit by
// hand. Dependabot watches every ecosystem the repository ships, and groups its
// version updates so a weekly run is a handful of pull requests, not dozens.
const path = join(import.meta.dirname, "..", ".github", "dependabot.yml")

function config(): string {
  expect(existsSync(path), ".github/dependabot.yml is missing").toBe(true)
  return readFileSync(path, "utf8")
}

function updateBlock(ecosystem: string): string {
  const text = config()
  const start = text.indexOf(`  - package-ecosystem: ${ecosystem}\n`)

  expect(start, `no update entry for "${ecosystem}"`).toBeGreaterThan(-1)

  const rest = text.slice(start + 1)
  const next = rest.search(/\n {2}- package-ecosystem: /)

  return next === -1 ? rest : rest.slice(0, next + 1)
}

describe("Dependabot config", () => {
  it("is version 2", () => {
    expect(config()).toMatch(/^version: 2$/m)
  })

  it.each(["npm", "github-actions", "docker"])(
    "checks %s weekly from the repository root, with a cap on open pull requests",
    (ecosystem) => {
      const block = updateBlock(ecosystem)

      expect(block).toMatch(/^ {4}directory: "\/"$/m)
      expect(block).toMatch(/^ {6}interval: weekly$/m)
      expect(block).toMatch(/^ {4}open-pull-requests-limit: \d+$/m)
      expect(block).toMatch(/^ {4}groups:$/m)
    },
  )

  // One pnpm-lock.yaml at the root covers studio/ through pnpm-workspace.yaml,
  // so the root entry updates both packages. GitHub still raises alerts against
  // studio/package.json, and left alone it opens a second pull request for the
  // same dependency over the same lockfile -- the studio entry exists only to
  // switch that off.
  it("updates the pnpm workspace only through its single root lockfile", () => {
    const text = config()
    const studio = text.slice(text.indexOf('    directory: "/studio"\n'))

    expect(text.match(/package-ecosystem: npm/g)).toHaveLength(2)
    expect(studio).toMatch(/^ {4}open-pull-requests-limit: 0$/m)
    expect(studio).toMatch(/^ {4}ignore:\n {6}- dependency-name: "\*"\n(?! {8})/m)
  })

  it("batches npm security updates, and version updates in small groups with catch-alls last", () => {
    const npm = updateBlock("npm")

    expect(npm).toMatch(/applies-to: security-updates\n\s+patterns:\n\s+- "\*"/)
    expect(npm).toMatch(
      /npm-production:\n\s+dependency-type: production\n\s+npm-development:\n\s+dependency-type: development\n\n/,
    )
  })

  // A major needs code changes and a decision, not a weekly bump.
  it("leaves npm majors out of version updates", () => {
    expect(updateBlock("npm")).toMatch(
      /ignore:\n\s+- dependency-name: "\*"\n\s+update-types:\n\s+- version-update:semver-major\n/,
    )
  })

  it("keeps the Docker base image on Node 24 until a major move is chosen", () => {
    expect(updateBlock("docker")).toMatch(
      /- dependency-name: node\n\s+update-types:\n\s+- version-update:semver-major/,
    )
  })
})
