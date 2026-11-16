import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// pg_dump aborts when the server's major version is newer than its own. After
// production moved to Postgres 17 (WEB-4), the runner's default client was 16,
// so both the pre-deploy dump and the nightly backup would fail. The nightly one
// runs on a schedule, where nobody watches it go red. Both workflows must dump
// with the client that matches the major version local and CI run.
const root = join(import.meta.dirname, "..")

const majorVersion = readFileSync(join(root, "supabase", "config.toml"), "utf8").match(
  /^major_version = (\d+)$/m,
)?.[1]

const workflows = ["database-backup.yml", "production.yml"].map((file) => ({
  file,
  yaml: readFileSync(join(root, ".github", "workflows", file), "utf8"),
}))

function runLines(yaml: string): string[] {
  return yaml
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
}

describe.each(workflows)("$file", ({ yaml }) => {
  it("installs the PostgreSQL client at the database's major version", () => {
    expect(majorVersion).toBeDefined()
    expect(runLines(yaml)).toContain(`sudo apt-get install -y postgresql-client-${majorVersion}`)
  })

  it("dumps with that client, not whichever pg_dump comes first on the PATH", () => {
    const dumps = runLines(yaml).filter((line) => line.includes("pg_dump "))

    expect(dumps.length).toBeGreaterThan(0)
    for (const line of dumps) {
      expect(line.startsWith(`/usr/lib/postgresql/${majorVersion}/bin/pg_dump `)).toBe(true)
    }
  })
})
