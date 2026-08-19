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

  it("runs e2e alongside the other checks rather than queued behind them", () => {
    expect(jobBlock("e2e-test")).not.toMatch(/^ {4}needs:/m)
  })
})
