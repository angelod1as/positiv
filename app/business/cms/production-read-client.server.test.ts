import { describe, expect, it, vi } from "vitest"
import { createProductionReadClient } from "./production-read-client.server"

vi.mock("varlock/env", () => ({
  ENV: {
    SANITY_PROJECT_ID: "someotherproject",
    SANITY_DATASET: "development",
    SANITY_API_HOST: "http://localhost:3999",
    SANITY_AUTH_TOKEN: "a-write-token",
  },
}))

describe("createProductionReadClient", () => {
  it("reads the production dataset whatever the env says", () => {
    const config = createProductionReadClient().config()

    expect(config.projectId).toBe("8ojkallk")
    expect(config.dataset).toBe("production")
    expect(config.apiHost).toBe("https://api.sanity.io")
  })

  it("reads published content through the CDN without a token", () => {
    const config = createProductionReadClient().config()

    expect(config.apiVersion).toBe("2026-09-24")
    expect(config.useCdn).toBe(true)
    expect(config.perspective).toBe("published")
    expect(config.token).toBeUndefined()
  })
})
