import { describe, expect, it, beforeEach, vi } from "vitest"
import { getTurnstileConfig } from "./get-turnstile-config.server"

const { ENV } = vi.hoisted(() => ({ ENV: {} as Record<string, unknown> }))
vi.mock("varlock/env", () => ({ ENV }))

describe("getTurnstileConfig", () => {
  beforeEach(() => {
    Object.keys(ENV).forEach((key) => (ENV[key] = undefined))
  })

  it("should return test keys for localhost IP", () => {
    ENV.NODE_ENV = "production"
    ENV.VITE_TURNSTILE_SITE_KEY = "prod-site-key"
    ENV.SUPABASE_TURNSTILE_SECRET = "prod-secret-key"

    const config = getTurnstileConfig({ ip: "127.0.0.1" })

    expect(config.siteKey).toBe("1x00000000000000000000AA")
    expect(config.secretKey).toBe("1x0000000000000000000000000000000AA")
  })

  it("should return test keys when NODE_ENV is test", () => {
    ENV.NODE_ENV = "test"
    ENV.VITE_TURNSTILE_SITE_KEY = "prod-site-key"
    ENV.SUPABASE_TURNSTILE_SECRET = "prod-secret-key"

    const config = getTurnstileConfig()

    expect(config.siteKey).toBe("1x00000000000000000000AA")
    expect(config.secretKey).toBe("1x0000000000000000000000000000000AA")
  })

  it("should return production keys for production environment", () => {
    ENV.NODE_ENV = "production"
    ENV.VITE_TURNSTILE_SITE_KEY = "prod-site-key"
    ENV.SUPABASE_TURNSTILE_SECRET = "prod-secret-key"

    const config = getTurnstileConfig({ ip: "192.168.1.1" })

    expect(config.siteKey).toBe("prod-site-key")
    expect(config.secretKey).toBe("prod-secret-key")
  })

  it("should throw error if production keys are missing in production", () => {
    ENV.NODE_ENV = "production"
    delete ENV.VITE_TURNSTILE_SITE_KEY
    delete ENV.SUPABASE_TURNSTILE_SECRET

    expect(() => getTurnstileConfig({ ip: "192.168.1.1" })).toThrow()
  })
})