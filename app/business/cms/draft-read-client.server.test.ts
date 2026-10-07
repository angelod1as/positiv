import { beforeEach, describe, expect, it, vi } from "vitest"
import { createDraftReadClient } from "./draft-read-client.server"

const env = vi.hoisted<Record<string, unknown>>(() => ({}))

vi.mock("varlock/env", () => ({ ENV: env }))

beforeEach(() => {
  env.SANITY_PROJECT_ID = "8ojkallk"
  env.SANITY_DATASET = "development"
  env.SANITY_API_HOST = undefined
  env.SANITY_VIEWER_TOKEN = "viewer-token"
})

describe("createDraftReadClient", () => {
  it("reads drafts live with the viewer token, never the CDN", () => {
    const config = createDraftReadClient().config()

    expect(config.projectId).toBe("8ojkallk")
    expect(config.dataset).toBe("development")
    expect(config.apiVersion).toBe("2026-09-24")
    expect(config.useCdn).toBe(false)
    expect(config.perspective).toBe("drafts")
    expect(config.token).toBe("viewer-token")
  })

  it("talks to Sanity's own API when SANITY_API_HOST is unset", () => {
    expect(createDraftReadClient().config().apiHost).toBe("https://api.sanity.io")
  })

  it("sends every request to SANITY_API_HOST when it is set", () => {
    env.SANITY_API_HOST = "http://localhost:3999"

    const config = createDraftReadClient().config()

    expect(config.apiHost).toBe("http://localhost:3999")
    expect(config.url).toBe("http://localhost:3999/v2026-09-24")
  })
})
