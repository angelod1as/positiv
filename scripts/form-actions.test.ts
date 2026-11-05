import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// request.formData() throws a TypeError for a body that is not a form, and on
// the server that becomes a 500 and a Telegram alert (WEB-38). Server code
// reads forms through readFormData, which answers the client with a 4xx
// instead. A clientAction runs in the browser, where the request is always one
// of our own forms, so it keeps calling formData() directly.
const READER = "app/lib/helpers/read-form-data.server.ts"
const DIRECT_READ = /\.formData\(\)|\binputFromForm\(/
const EXPORTED_FUNCTION =
  /^export (?:async )?function (\w+)|^export const (\w+)/

function sourceFiles() {
  return execFileSync("git", ["ls-files", "app/*.ts", "app/*.tsx"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .filter((file) => !/\.(test|spec)\.tsx?$/.test(file))
    .filter((file) => file !== READER)
}

function directReadsOutsideClientActions(file: string) {
  let enclosing: string | undefined
  return readFileSync(file, "utf8")
    .split("\n")
    .flatMap((line, index) => {
      const exported = EXPORTED_FUNCTION.exec(line)
      if (exported) enclosing = exported[1] ?? exported[2]
      if (!DIRECT_READ.test(line) || enclosing === "clientAction") return []
      return [`${file}:${index + 1} (${enclosing ?? "module"})`]
    })
}

describe("form reads on the server", () => {
  it("go through readFormData", () => {
    expect(sourceFiles().flatMap(directReadsOutsideClientActions)).toEqual([])
  })
})
