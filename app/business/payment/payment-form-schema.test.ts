import { describe, it, expect } from "vitest"
import { paymentFormSchema } from "./payment-form-schema"

describe("paymentFormSchema", () => {
  it("accepts PIX with default installmentCount", () => {
    const result = paymentFormSchema.safeParse({ billingType: "PIX" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.installmentCount).toBe(1)
    }
  })

  it("accepts CREDIT_CARD with explicit installmentCount", () => {
    const result = paymentFormSchema.safeParse({
      billingType: "CREDIT_CARD",
      installmentCount: 3,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.installmentCount).toBe(3)
    }
  })

  it("coerces empty string installmentCount to 1", () => {
    const result = paymentFormSchema.safeParse({
      billingType: "PIX",
      installmentCount: "",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.installmentCount).toBe(1)
    }
  })

  it("coerces null installmentCount to 1", () => {
    const result = paymentFormSchema.safeParse({
      billingType: "PIX",
      installmentCount: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.installmentCount).toBe(1)
    }
  })

  it("rejects unknown billingType", () => {
    const result = paymentFormSchema.safeParse({ billingType: "BOLETO" })
    expect(result.success).toBe(false)
  })

  it("rejects missing billingType", () => {
    const result = paymentFormSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects installmentCount below 1", () => {
    const result = paymentFormSchema.safeParse({
      billingType: "CREDIT_CARD",
      installmentCount: 0,
    })
    expect(result.success).toBe(false)
  })

  it("rejects installmentCount above 3", () => {
    const result = paymentFormSchema.safeParse({
      billingType: "CREDIT_CARD",
      installmentCount: 4,
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-integer installmentCount", () => {
    const result = paymentFormSchema.safeParse({
      billingType: "CREDIT_CARD",
      installmentCount: 2.5,
    })
    expect(result.success).toBe(false)
  })

  it("rejects PIX with installmentCount > 1 (PIX doesn't support installments)", () => {
    const result = paymentFormSchema.safeParse({
      billingType: "PIX",
      installmentCount: 3,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "installmentCount")).toBe(
        true,
      )
    }
  })

  it("accepts PIX with installmentCount = 1 explicitly", () => {
    const result = paymentFormSchema.safeParse({
      billingType: "PIX",
      installmentCount: 1,
    })
    expect(result.success).toBe(true)
  })
})
