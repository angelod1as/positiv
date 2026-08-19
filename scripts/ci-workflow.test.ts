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
})
