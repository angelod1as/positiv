import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// The e2e job spent 551 of its 1025 seconds installing Playwright, and 484 of
// those were apt dragging nine font packages off azure.archive.ubuntu.com at
// 43 kB/s. Every library `--with-deps` wanted was already the newest version on
// the runner image; the fonts were the whole bill, and the suite asserts no
// screenshots. This is a regression guard for that: it is nine minutes of every
// pull request.
const workflow = readFileSync(
  join(import.meta.dirname, "..", ".github", "workflows", "deploy-and-test.yml"),
  "utf8",
)

function jobBlock(name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`)

  expect(start, `job "${name}" not found`).toBeGreaterThan(-1)

  const rest = workflow.slice(start + 1)
  const nextJob = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/)

  return nextJob === -1 ? rest : rest.slice(0, nextJob + 1)
}

function stepBlock(jobName: string, stepName: string): string {
  const step = jobBlock(jobName).match(
    new RegExp(`- name: ${stepName}\\n((?: {8}.+\\n)+)`),
  )?.[1]

  if (!step) {
    throw new Error(`no body found for step "${stepName}" in job "${jobName}"`)
  }

  return step
}

function runCommand(stepName: string): string {
  const step = workflow.match(
    new RegExp(`- name: ${stepName}\\n(?: +[a-z-]+:.*\\n)*? +run: (.+)`),
  )

  if (!step) {
    throw new Error(`no run command found for step "${stepName}"`)
  }

  return step[1]
}

describe("deploy-and-test workflow", () => {
  it("installs the browser without apt, which is where the nine minutes went", () => {
    const command = runCommand("Install Playwright Browsers")

    expect(command).toContain("playwright install")
    expect(command).not.toContain("--with-deps")
  })

  it("keeps the downloaded browser between runs", () => {
    const e2e = jobBlock("e2e-test")

    expect(e2e).toContain("actions/cache")
    expect(e2e).toContain("~/.cache/ms-playwright")
  })

  it("keys that cache on the Playwright version, so a bump downloads afresh", () => {
    const key = jobBlock("e2e-test").match(/key: (.+)/)?.[1] ?? ""

    expect(key).toContain("steps.playwright-version.outputs.version")
  })

  it("runs the integration suite in the e2e job, once the database is up and before playwright", () => {
    const e2e = jobBlock("e2e-test")
    const position = (step: string) => e2e.indexOf(`- name: ${step}\n`)
    const steps = [
      "Get Supabase local credentials",
      "Install dependencies",
      "Run integration tests",
      "Run E2E tests",
    ]

    for (const step of steps) {
      expect(position(step), `step "${step}" not found`).toBeGreaterThanOrEqual(0)
    }
    expect(runCommand("Run integration tests")).toBe("pnpm test:integration")
    expect(position("Run integration tests")).toBeGreaterThan(position("Get Supabase local credentials"))
    expect(position("Run integration tests")).toBeGreaterThan(position("Install dependencies"))
    expect(position("Run integration tests")).toBeLessThan(position("Run E2E tests"))
  })

  it("lets a red integration suite fail the job", () => {
    const step = stepBlock("e2e-test", "Run integration tests")

    expect(step).not.toContain("continue-on-error")
    expect(step).toContain("SUPABASE_CONNECT_URL: ${{ steps.supabase-creds.outputs.db_url }}")
  })

  it("gives the integration suite the APP_URL a developer's .env supplies", () => {
    const step = stepBlock("e2e-test", "Run integration tests")

    expect(step).toMatch(/APP_URL: http:\/\/localhost:\d+/)
  })

  it("never hands the integration suite Listmonk credentials", () => {
    const step = stepBlock("e2e-test", "Run integration tests")

    expect(step).not.toContain("LISTMONK")
  })

  it("runs e2e alongside the other checks rather than queued behind them", () => {
    expect(jobBlock("e2e-test")).not.toMatch(/^ {4}needs:/m)
  })

  it("builds the Studio in every pull request, so a broken schema never merges", () => {
    expect(runCommand("Build the Studio")).toBe("pnpm --filter studio build")
  })

  it("runs the Studio's tests, which test:coverage does not reach", () => {
    expect(runCommand("Test the Studio")).toBe("pnpm --filter studio test")
  })

  it("type-checks and lints the Studio, which sanity build does not", () => {
    expect(runCommand("Lint the Studio")).toBe("pnpm --filter studio lint")
  })

  it("checks env.d.ts without the icons varlock fetches, which come and go with the network", () => {
    const step = workflow.match(
      /- name: Check env\.d\.ts matches \.env\.schema\n +run: \|\n((?: {10}.+\n)+)/,
    )?.[1]

    expect(step).toContain("pnpm exec varlock codegen")
    expect(step).toContain("pnpm exec tsx scripts/check-env-types.ts")
    expect(step).not.toContain("git diff --exit-code env.d.ts")
  })
})
