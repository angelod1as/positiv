import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// POS-520 merged, Coolify finished deploying the app six minutes later, and the
// migration that the app depended on never ran: the gate job sat for fifteen
// minutes and was cancelled, so `deploy` was skipped. For a while production
// served an app that reads integer cents from a column still holding reais, and
// every price on the site was a hundredth of itself.
//
// Two things made a cancelled job into wrong numbers on the site, and these are
// the guards for both.
const workflow = readFileSync(
  join(import.meta.dirname, "..", ".github", "workflows", "production.yml"),
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

function jobBlock(name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`)

  expect(start, `job "${name}" not found`).toBeGreaterThan(-1)

  const rest = workflow.slice(start + 1)
  const nextJob = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/)

  return nextJob === -1 ? rest : rest.slice(0, nextJob + 1)
}

describe("production workflow", () => {
  it("gates the migration on a plain test run, not on one carrying coverage", () => {
    // Coverage instrumentation belongs to the pull request, where
    // deploy-and-test.yml runs it and keeps the artifact. Here it is fifteen
    // minutes of the window between the app deploying and the schema it needs
    // being there.
    const command = runCommand("Run unit tests")

    expect(command).toBe("pnpm test:unit")
  })

  it("gives that gate a timeout, so a hung run fails instead of hanging", () => {
    // The run that caused this was cancelled at fifteen minutes with no
    // timeout set, which reads as an infrastructure mystery rather than as a
    // job that took too long. A stated limit fails on its own terms.
    const unitTest = jobBlock("unit-test")

    expect(unitTest).toMatch(/timeout-minutes: \d+/)
  })

  it("still refuses to touch the production database before the tests pass", () => {
    // The window is the problem, not the gate. Closing it by letting the
    // migration run first would trade wrong prices for a wrong schema.
    const deploy = jobBlock("deploy")

    expect(deploy).toContain("needs: unit-test")
  })

  it("says out loud that the app deploys on its own trigger", () => {
    // Nothing in this repository sequences Coolify against this workflow, and
    // the next person to read it should not have to find that out the way we
    // did.
    expect(workflow).toContain("Coolify")
  })
})
