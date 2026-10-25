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

  // One pnpm-lock.yaml at the root covers studio/ through pnpm-workspace.yaml;
  // a second entry for studio/ would race the first over the same lockfile.
  it("covers the pnpm workspace through its single root lockfile", () => {
    expect(config().match(/package-ecosystem: npm/g)).toHaveLength(1)
  })

  it("batches npm minor and patch updates, and security updates, into groups", () => {
    const npm = updateBlock("npm")

    expect(npm).toMatch(/applies-to: version-updates\n\s+update-types:\n\s+- minor\n\s+- patch/)
    expect(npm).toMatch(/applies-to: security-updates/)
  })

  // Ungrouped majors, one pull request each, could fill every open slot and
  // starve the minor and patch group.
  it("batches npm major updates into a group of their own", () => {
    expect(updateBlock("npm")).toMatch(
      /applies-to: version-updates\n\s+update-types:\n\s+- major\n/,
    )
  })

  it("keeps the Docker base image on Node 24 until a major move is chosen", () => {
    expect(updateBlock("docker")).toMatch(
      /- dependency-name: node\n\s+update-types:\n\s+- version-update:semver-major/,
    )
  })
})
