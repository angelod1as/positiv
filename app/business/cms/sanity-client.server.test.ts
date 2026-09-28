import { beforeEach, describe, expect, it, vi } from "vitest"
import { createSanityClient } from "./sanity-client.server"

const env = vi.hoisted<Record<string, unknown>>(() => ({}))

vi.mock("varlock/env", () => ({ ENV: env }))

beforeEach(() => {
  env.SANITY_PROJECT_ID = "8ojkallk"
  env.SANITY_DATASET = "development"
  env.SANITY_API_HOST = undefined
})

describe("createSanityClient", () => {
  it("reads published content from the env's project and dataset through the CDN", () => {
    const config = createSanityClient().config()

    expect(config.projectId).toBe("8ojkallk")
    expect(config.dataset).toBe("development")
    expect(config.apiVersion).toBe("2026-09-24")
    expect(config.useCdn).toBe(true)
    expect(config.perspective).toBe("published")
    expect(config.token).toBeUndefined()
  })

  it("talks to Sanity's own CDN when SANITY_API_HOST is unset", () => {
    const config = createSanityClient().config()

    expect(config.apiHost).toBe("https://api.sanity.io")
    expect(config.cdnUrl).toBe("https://8ojkallk.apicdn.sanity.io/v2026-09-24")
  })

  it("sends every request to SANITY_API_HOST when it is set", () => {
    env.SANITY_API_HOST = "http://localhost:3999"

    const config = createSanityClient().config()

    expect(config.apiHost).toBe("http://localhost:3999")
    expect(config.url).toBe("http://localhost:3999/v2026-09-24")
    expect(config.cdnUrl).toBe("http://localhost:3999/v2026-09-24")
  })
})
