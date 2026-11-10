import { describe, expect, it, vi } from "vitest"
import { isTestEnvironment } from "./is-test-environment.server"

const { ENV } = vi.hoisted(() => ({ ENV: {} as Record<string, unknown> }))
vi.mock("varlock/env", () => ({ ENV }))

describe("isTestEnvironment", () => {
  it("should return true for localhost IP (127.0.0.1)", () => {
    const result = isTestEnvironment({ ip: "127.0.0.1" })
    expect(result).toBe(true)
  })

  it("should return true for IPv6 localhost (::1)", () => {
    const result = isTestEnvironment({ ip: "::1" })
    expect(result).toBe(true)
  })

  it("should return true when NODE_ENV is test", () => {
    const originalEnv = ENV.NODE_ENV
    ENV.NODE_ENV = "test"

    const result = isTestEnvironment()
    expect(result).toBe(true)

    ENV.NODE_ENV = originalEnv
  })

  it("should return false for production IP", () => {
    const originalEnv = ENV.NODE_ENV
    ENV.NODE_ENV = "production"

    const result = isTestEnvironment({ ip: "192.168.1.1" })
    expect(result).toBe(false)

    ENV.NODE_ENV = originalEnv
  })

  it("should return false when no request and NODE_ENV is production", () => {
    const originalEnv = ENV.NODE_ENV
    ENV.NODE_ENV = "production"

    const result = isTestEnvironment()
    expect(result).toBe(false)

    ENV.NODE_ENV = originalEnv
  })
})