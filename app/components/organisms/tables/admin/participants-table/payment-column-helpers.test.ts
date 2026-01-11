import { describe, expect, it } from "vitest"
import {
  parsePaymentValue,
  shouldAutoCheckHasPaid,
} from "./payment-column-helpers"

describe("parsePaymentValue", () => {
  describe("blocking negative values", () => {
    it("returns oldValue when newValue is negative", () => {
      const result = parsePaymentValue(-50, 100)
      expect(result).toBe(100)
    })

    it("returns oldValue when newValue is -1", () => {
      const result = parsePaymentValue(-1, 0)
      expect(result).toBe(0)
    })

    it("returns oldValue when newValue is negative decimal", () => {
      const result = parsePaymentValue(-0.5, 25)
      expect(result).toBe(25)
    })
  })

  describe("accepting valid values", () => {
    it("returns 0 when newValue is 0", () => {
      const result = parsePaymentValue(0, 100)
      expect(result).toBe(0)
    })

    it("returns positive number when newValue is positive", () => {
      const result = parsePaymentValue(150, 0)
      expect(result).toBe(150)
    })

    it("returns positive decimal when newValue is positive decimal", () => {
      const result = parsePaymentValue(99.99, 0)
      expect(result).toBe(99.99)
    })

    it("returns null when newValue is null", () => {
      const result = parsePaymentValue(null, 100)
      expect(result).toBeNull()
    })

    it("returns null when newValue is undefined", () => {
      const result = parsePaymentValue(undefined, 100)
      expect(result).toBeNull()
    })

    it("returns null when newValue is empty string", () => {
      const result = parsePaymentValue("", 100)
      expect(result).toBeNull()
    })

    it("parses string numbers correctly", () => {
      const result = parsePaymentValue("200", 0)
      expect(result).toBe(200)
    })

    it("rejects negative string numbers", () => {
      const result = parsePaymentValue("-50", 100)
      expect(result).toBe(100)
    })
  })

  describe("blocking NaN values", () => {
    it("returns oldValue when newValue is non-numeric string", () => {
      const result = parsePaymentValue("abc", 100)
      expect(result).toBe(100)
    })

    it("returns oldValue when newValue is mixed string", () => {
      const result = parsePaymentValue("12abc", 50)
      expect(result).toBe(50)
    })
  })
})

describe("shouldAutoCheckHasPaid", () => {
  describe("auto-check when payment > 0 and has_paid is false", () => {
    it("returns true when payment is positive and has_paid is false", () => {
      const result = shouldAutoCheckHasPaid(100, false)
      expect(result).toBe(true)
    })

    it("returns true when payment is 1 and has_paid is false", () => {
      const result = shouldAutoCheckHasPaid(1, false)
      expect(result).toBe(true)
    })

    it("returns true when payment is positive decimal and has_paid is false", () => {
      const result = shouldAutoCheckHasPaid(0.01, false)
      expect(result).toBe(true)
    })
  })

  describe("no auto-check when payment is 0 or null", () => {
    it("returns false when payment is 0", () => {
      const result = shouldAutoCheckHasPaid(0, false)
      expect(result).toBe(false)
    })

    it("returns false when payment is null", () => {
      const result = shouldAutoCheckHasPaid(null, false)
      expect(result).toBe(false)
    })
  })

  describe("no auto-check when has_paid is already true", () => {
    it("returns false when payment is positive but has_paid is already true", () => {
      const result = shouldAutoCheckHasPaid(100, true)
      expect(result).toBe(false)
    })

    it("returns false when payment is 0 and has_paid is true", () => {
      const result = shouldAutoCheckHasPaid(0, true)
      expect(result).toBe(false)
    })
  })

  describe("never auto-uncheck", () => {
    it("does not return indication to uncheck when payment becomes 0", () => {
      const result = shouldAutoCheckHasPaid(0, true)
      expect(result).toBe(false)
    })

    it("does not return indication to uncheck when payment becomes null", () => {
      const result = shouldAutoCheckHasPaid(null, true)
      expect(result).toBe(false)
    })
  })
})
