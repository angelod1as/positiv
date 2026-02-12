import { describe, expect, it, afterEach, vi } from "vitest"

describe("FEATURES", () => {
  it("should export FEATURES object", async () => {
    const { FEATURES } = await import("./features.server")
    expect(FEATURES).toBeDefined()
    expect(typeof FEATURES).toBe("object")
  })

  it("should have paymentSystem property", async () => {
    const { FEATURES } = await import("./features.server")
    expect(FEATURES).toHaveProperty("paymentSystem")
    expect(typeof FEATURES.paymentSystem).toBe("boolean")
  })
})

describe("isPaymentSystemEnabled", () => {
  // Keep a copy of the original env var
  const originalEnv = process.env.ENABLE_PAYMENT_SYSTEM

  // Reset modules and env var after each test
  afterEach(() => {
    process.env.ENABLE_PAYMENT_SYSTEM = originalEnv
    vi.resetModules()
  })

  it('should return true when ENABLE_PAYMENT_SYSTEM is "true"', async () => {
    vi.resetModules() // Reset BEFORE setting env var
    process.env.ENABLE_PAYMENT_SYSTEM = "true"
    const { isPaymentSystemEnabled } = await import("./features.server")
    expect(isPaymentSystemEnabled()).toBe(true)
  })

  it('should return false when ENABLE_PAYMENT_SYSTEM is "false"', async () => {
    vi.resetModules() // Reset BEFORE setting env var
    process.env.ENABLE_PAYMENT_SYSTEM = "false"
    const { isPaymentSystemEnabled } = await import("./features.server")
    expect(isPaymentSystemEnabled()).toBe(false)
  })

  it("should return false when ENABLE_PAYMENT_SYSTEM is not set (default)", async () => {
    vi.resetModules() // Reset BEFORE deleting env var
    delete process.env.ENABLE_PAYMENT_SYSTEM
    const { isPaymentSystemEnabled } = await import("./features.server")
    expect(isPaymentSystemEnabled()).toBe(false)
  })

  it("should match FEATURES.paymentSystem value", async () => {
    vi.resetModules() // Reset BEFORE setting env var
    process.env.ENABLE_PAYMENT_SYSTEM = "true"
    const { isPaymentSystemEnabled, FEATURES } = await import(
      "./features.server"
    )
    expect(isPaymentSystemEnabled()).toBe(FEATURES.paymentSystem)
  })
})
