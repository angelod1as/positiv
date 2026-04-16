import { describe, it, expect } from "vitest"
import { paymentFormSchema, VALID_PAYMENT_OPTIONS } from "./payment-form-schema"
import { MAX_INSTALLMENTS } from "./payment-pricing.server"

describe("paymentFormSchema", () => {
  it("VALID_PAYMENT_OPTIONS matches MAX_INSTALLMENTS", () => {
    // This test guards against drift between the shared client/server
    // enum and the server-only MAX_INSTALLMENTS constant.
    const expected = [
      "PIX",
      ...Array.from({ length: MAX_INSTALLMENTS }, (_, i) => `CC_${i + 1}`),
    ]
    expect([...VALID_PAYMENT_OPTIONS]).toEqual(expected)
  })

  it("accepts PIX", () => {
    expect(
      paymentFormSchema.safeParse({ paymentOption: "PIX" }).success,
    ).toBe(true)
  })

  it("accepts CC_1 through CC_4", () => {
    for (const value of ["CC_1", "CC_2", "CC_3", "CC_4"]) {
      expect(
        paymentFormSchema.safeParse({ paymentOption: value }).success,
        `${value} should be valid`,
      ).toBe(true)
    }
  })

  it("rejects CC_5 and higher", () => {
    expect(
      paymentFormSchema.safeParse({ paymentOption: "CC_5" }).success,
    ).toBe(false)
    expect(
      paymentFormSchema.safeParse({ paymentOption: "CC_999" }).success,
    ).toBe(false)
  })

  it("rejects empty and invalid strings", () => {
    expect(paymentFormSchema.safeParse({ paymentOption: "" }).success).toBe(
      false,
    )
    expect(
      paymentFormSchema.safeParse({ paymentOption: "invalid" }).success,
    ).toBe(false)
  })
})
