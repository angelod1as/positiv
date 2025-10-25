import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { getTurnstileConfig } from "./get-turnstile-config.server"

describe("getTurnstileConfig", () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("should return test keys for localhost IP", () => {
    process.env.NODE_ENV = "production"
    process.env.VITE_TURNSTILE_SITE_KEY = "prod-site-key"
    process.env.SUPABASE_TURNSTILE_SECRET = "prod-secret-key"

    const config = getTurnstileConfig({ ip: "127.0.0.1" })

    expect(config.siteKey).toBe("1x00000000000000000000AA")
    expect(config.secretKey).toBe("1x0000000000000000000000000000000AA")
  })

  it("should return test keys when NODE_ENV is test", () => {
    process.env.NODE_ENV = "test"
    process.env.VITE_TURNSTILE_SITE_KEY = "prod-site-key"
    process.env.SUPABASE_TURNSTILE_SECRET = "prod-secret-key"

    const config = getTurnstileConfig()

    expect(config.siteKey).toBe("1x00000000000000000000AA")
    expect(config.secretKey).toBe("1x0000000000000000000000000000000AA")
  })

  it("should return production keys for production environment", () => {
    process.env.NODE_ENV = "production"
    process.env.VITE_TURNSTILE_SITE_KEY = "prod-site-key"
    process.env.SUPABASE_TURNSTILE_SECRET = "prod-secret-key"

    const config = getTurnstileConfig({ ip: "192.168.1.1" })

    expect(config.siteKey).toBe("prod-site-key")
    expect(config.secretKey).toBe("prod-secret-key")
  })

  it("should throw error if production keys are missing in production", () => {
    process.env.NODE_ENV = "production"
    delete process.env.VITE_TURNSTILE_SITE_KEY
    delete process.env.SUPABASE_TURNSTILE_SECRET

    expect(() => getTurnstileConfig({ ip: "192.168.1.1" })).toThrow()
  })
})