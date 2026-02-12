import { describe, expect, it } from "vitest"
import { FEATURES, isPaymentSystemEnabled } from "./features.server"

describe("FEATURES", () => {
  it("should export FEATURES object", () => {
    expect(FEATURES).toBeDefined()
    expect(typeof FEATURES).toBe("object")
  })

  it("should have paymentSystem property", () => {
    expect(FEATURES).toHaveProperty("paymentSystem")
    expect(typeof FEATURES.paymentSystem).toBe("boolean")
  })
})

describe("isPaymentSystemEnabled", () => {
  it("should return a boolean", () => {
    const result = isPaymentSystemEnabled()
    expect(typeof result).toBe("boolean")
  })

  it("should return boolean based on ENABLE_PAYMENT_SYSTEM env var", () => {
    const result = isPaymentSystemEnabled()
    const envValue = process.env.ENABLE_PAYMENT_SYSTEM
    const expected = envValue === "true"
    expect(result).toBe(expected)
  })

  it("should match FEATURES.paymentSystem value", () => {
    expect(isPaymentSystemEnabled()).toBe(FEATURES.paymentSystem)
  })
})
