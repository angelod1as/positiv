import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Pushes from parallel worktrees queued behind one another because the hook
// ran the changed integration tests under the cross-worktree database lock.
// The integration suite runs in CI now, so a push must never take that lock.
const root = join(import.meta.dirname, "..")
const hook = readFileSync(join(root, ".husky", "pre-push"), "utf8")
const scripts: Record<string, string> = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).scripts

function expand(command: string, seen = new Set<string>()): string {
  return command.replace(/pnpm (?:run )?([a-z][\w:-]*)/g, (match, name: string) => {
    if (!(name in scripts) || seen.has(name)) return match

    return `${match} (${expand(scripts[name], new Set([...seen, name]))})`
  })
}

describe("pre-push hook", () => {
  const pushPath = expand(hook)

  it("never takes the database lock", () => {
    expect(pushPath).not.toContain("with-db-lock")
  })

  it("never runs the integration suite", () => {
    expect(pushPath).not.toContain("vitest.integration.config.ts")
  })

  it("still lints and runs the changed unit tests", () => {
    expect(hook).toMatch(/^pnpm lint$/m)
    expect(hook).toMatch(/^pnpm test:unit:changed$/m)
  })

  it("still refuses pushes from a protected branch", () => {
    expect(hook).toContain('PROTECTED_BRANCHES="^(master|main)"')
    expect(hook).toContain("exit 1")
  })

  it("still checks for deleted TODOs", () => {
    expect(hook).toContain("sh scripts/no-todo-delete.sh")
  })
})
