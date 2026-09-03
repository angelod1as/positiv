import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// A review run on PR #647 sat for 16 minutes, reported success across 3 turns
// and $8.20, and posted nothing at all — no comment, no review, no inline
// notes. Nothing stopped it and nothing recorded what it had decided. These
// are the guards for both halves of that.
const workflow = readFileSync(
  join(import.meta.dirname, "..", ".github", "workflows", "claude-code-review.yml"),
  "utf8",
)

function jobBlock(name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`)

  expect(start, `job "${name}" not found`).toBeGreaterThan(-1)

  const rest = workflow.slice(start + 1)
  const nextJob = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/)

  return nextJob === -1 ? rest : rest.slice(0, nextJob + 1)
}

describe("claude code review workflow", () => {
  it("stops a stuck review instead of letting it run unbounded", () => {
    // 60 completed runs put the median at 3.5 minutes and the slowest genuine
    // single attempt at 15.4. Twenty is 1.3x that slowest run, so a stuck one
    // dies without cutting off a slow-but-working review of a large pull
    // request.
    expect(jobBlock("claude-review")).toContain("timeout-minutes: 20")
  })
})
