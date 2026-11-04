import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// The production database audit is a work policy, not a ticket (WEB-28): the
// only thing that makes it happen is this reminder arriving on the 1st. The
// repository is public, so the chat id and the bot token stay in secrets.
const root = join(import.meta.dirname, "..")
const workflowPath = join(root, ".github", "workflows", "database-audit-reminder.yml")
const docPath = "docs/database-audit.md"

function readWorkflow(): string {
  expect(existsSync(workflowPath), "database-audit-reminder.yml not found").toBe(true)

  return readFileSync(workflowPath, "utf8")
}

describe("database audit reminder workflow", () => {
  it("runs on the 1st of every month", () => {
    expect(readWorkflow()).toMatch(/cron: '\d+ \d+ 1 \* \*'/)
  })

  it("can be triggered by hand to check the message arrives", () => {
    expect(readWorkflow()).toContain("workflow_dispatch:")
  })

  it("sends through the Telegram action with the existing secrets", () => {
    const workflow = readWorkflow()

    expect(workflow).toContain("uses: appleboy/telegram-action@")
    expect(workflow).toContain("to: ${{ secrets.TELEGRAM_CHAT_ID }}")
    expect(workflow).toContain("token: ${{ secrets.TELEGRAM_BOT_TOKEN }}")
  })

  it("gives the job's GITHUB_TOKEN no permissions, since it never uses it", () => {
    expect(readWorkflow()).toMatch(/^permissions: \{\}$/m)
  })

  it("links to the checklist doc, which exists", () => {
    expect(readWorkflow()).toContain(`/blob/main/${docPath}`)
    expect(existsSync(join(root, docPath))).toBe(true)
  })

  it("holds no literal chat id or bot token", () => {
    const workflow = readWorkflow()

    expect(workflow).not.toMatch(/\b\d{8,}:[\w-]{30,}\b/)
    expect(workflow).not.toMatch(/to: ['"]?-?\d+/)
  })
})
