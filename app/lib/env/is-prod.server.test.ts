import { beforeEach, describe, expect, it, vi } from "vitest"
import { isCI, isProd } from "./is-prod.server"

const { ENV } = vi.hoisted(() => ({ ENV: {} as Record<string, unknown> }))
vi.mock("varlock/env", () => ({ ENV }))

describe("isProd", () => {
  beforeEach(() => {
    Object.keys(ENV).forEach((key) => (ENV[key] = undefined))
  })

  it("is true when the app is deployed to production", () => {
    ENV.APP_ENV = "production"

    expect(isProd()).toBe(true)
  })

  it("is false in development", () => {
    ENV.APP_ENV = "development"

    expect(isProd()).toBe(false)
  })

  it("is false in CI even when the environment says production", () => {
    ENV.APP_ENV = "production"
    ENV.CI = true

    expect(isProd()).toBe(false)
  })

  it("ignores NODE_ENV, which the runtime image pins to production", () => {
    ENV.NODE_ENV = "production"
    ENV.APP_ENV = "test"

    expect(isProd()).toBe(false)
  })
})

describe("isCI", () => {
  beforeEach(() => {
    Object.keys(ENV).forEach((key) => (ENV[key] = undefined))
  })

  it("reports what CI resolved to", () => {
    ENV.CI = true
    expect(isCI()).toBe(true)

    ENV.CI = false
    expect(isCI()).toBe(false)
  })
})
