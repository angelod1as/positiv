import { test, expect } from "@playwright/test"

import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

// The e2e suite runs against the production build, so a guard written as
// `if (ENV.E2E_MODE)` is only worth anything if it is still in the bundle.
// varlock inlines the value of any item it treats as static, and the bundler
// then drops the branch as dead code — silently, and only in the artifact the
// tests actually exercise. Read the bundle back and say so.

function readServerBundle(): string {
  const serverDir = join(process.cwd(), "build", "server")
  const assetsDir = join(serverDir, "assets")

  const files = [
    join(serverDir, "index.js"),
    ...readdirSync(assetsDir)
      .filter((file) => file.endsWith(".js"))
      .map((file) => join(assetsDir, file)),
  ]

  return files.map((file) => readFileSync(file, "utf8")).join("\n")
}

test.describe("production build", () => {
  test("keeps the E2E_MODE guard instead of folding it away", () => {
    const bundle = readServerBundle()

    expect(bundle).toContain("E2E_MODE")
    expect(bundle).toMatch(/subscriberId:\s*0\b/)
  })
})
