import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { ConfigEnv, UserConfig, UserConfigFnObject } from "vite"
import { describe, expect, it, vi } from "vitest"

import viteConfig from "../vite.config"

// Only the build options are under test; Vite and its plugins do not load under
// jsdom.
vi.mock("@react-router/dev/vite", () => ({ reactRouter: () => [] }))
vi.mock("@tailwindcss/vite", () => ({ default: () => [] }))
vi.mock("@varlock/vite-integration", () => ({ varlockVitePlugin: () => [] }))
vi.mock("vite-plugin-devtools-json", () => ({ default: () => [] }))
vi.mock("vite-tsconfig-paths", () => ({ default: () => [] }))
vi.mock("vite", () => ({ defineConfig: (config: unknown) => config }))

// A stack in a Telegram alert pointed at build/server/index.js, which says
// nothing. The server build carries source maps and Node applies them, so a
// stack names app/... file:line. The browser never gets them: the client build
// has none, and react-router-serve serves only build/client.
function buildConfig(isSsrBuild: boolean): UserConfig {
  const env: ConfigEnv = { command: "build", mode: "production", isSsrBuild }
  return (viteConfig as UserConfigFnObject)(env)
}

const dockerfile = readFileSync(
  join(import.meta.dirname, "..", "Dockerfile"),
  "utf8",
)

describe("server source maps", () => {
  it("emits source maps for the server build", () => {
    expect(buildConfig(true).build?.sourcemap).toBe(true)
  })

  it("emits none for the client build", () => {
    expect(buildConfig(false).build?.sourcemap).toBe(false)
  })

  it("runs the production image with Node applying them", () => {
    const runtimeStage = dockerfile.slice(dockerfile.lastIndexOf("\nFROM "))

    expect(runtimeStage).toMatch(/NODE_OPTIONS=--enable-source-maps/)
  })
})
