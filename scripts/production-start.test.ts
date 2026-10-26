import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// `pnpm run start` checks the dependencies before running the script. In the
// runtime image they never match what pnpm expects, so it ran
// `pnpm install --production` on every boot: one crash per deploy, and after
// pnpm-workspace.yaml gained overrides, a container that never became healthy.
// The image starts the server from node_modules/.bin, with no package manager
// on the boot path.
const dockerfile = readFileSync(
  join(import.meta.dirname, "..", "Dockerfile"),
  "utf8",
)

const packageJson = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"),
) as { scripts: { start: string } }

function runtimeCmd(): string[] {
  const runtimeStage = dockerfile.slice(dockerfile.lastIndexOf("\nFROM "))
  const cmd = runtimeStage.match(/^CMD (\[.*\])$/m)?.[1]

  expect(cmd, "the runtime stage has no exec-form CMD").toBeDefined()

  return JSON.parse(cmd ?? "[]") as string[]
}

describe("production start command", () => {
  it("starts the server without a package manager", () => {
    expect(runtimeCmd()[0]).not.toMatch(/^(pnpm|npm|npx|corepack)$/)
  })

  it("runs the start script from package.json through node_modules/.bin", () => {
    const expected = packageJson.scripts.start
      .split(" ")
      .map((arg) =>
        ["varlock", "react-router-serve"].includes(arg)
          ? `node_modules/.bin/${arg}`
          : arg,
      )

    expect(runtimeCmd()).toEqual(expected)
  })
})
