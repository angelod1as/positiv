import { describe, expect, it } from "vitest"
import { isTestEnvironment } from "./is-test-environment.server"

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
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "test"

    const result = isTestEnvironment()
    expect(result).toBe(true)

    process.env.NODE_ENV = originalEnv
  })

  it("should return false for production IP", () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "production"

    const result = isTestEnvironment({ ip: "192.168.1.1" })
    expect(result).toBe(false)

    process.env.NODE_ENV = originalEnv
  })

  it("should return false when no request and NODE_ENV is production", () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "production"

    const result = isTestEnvironment()
    expect(result).toBe(false)

    process.env.NODE_ENV = originalEnv
  })
})