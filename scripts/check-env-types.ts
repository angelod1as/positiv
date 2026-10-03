import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

import { withoutIcons } from "./env-types"

const committed = execFileSync("git", ["show", "HEAD:env.d.ts"], {
  encoding: "utf8",
})
const generated = readFileSync("env.d.ts", "utf8")

if (withoutIcons(committed) !== withoutIcons(generated)) {
  execFileSync("git", ["diff", "env.d.ts"], { stdio: "inherit" })
  console.error(
    "env.d.ts does not match .env.schema: run `pnpm lint` and commit it.",
  )
  process.exit(1)
}
