import { describe, expect, it } from "vitest"
import { bdsmConsentSchema } from "./bdsm-consent"

describe("bdsmConsentSchema", () => {
  it("should pass validation when consent is true", () => {
    const result = bdsmConsentSchema.safeParse({ consent: true })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ consent: true })
  })

  it("should fail validation when consent is false", () => {
    const result = bdsmConsentSchema.safeParse({ consent: false })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.message).toBe("Você deve aceitar para continuar")
  })

  it("should fail validation when consent is missing", () => {
    const result = bdsmConsentSchema.safeParse({})
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.code).toBe("invalid_type")
  })

  it("should fail validation when consent is null", () => {
    const result = bdsmConsentSchema.safeParse({ consent: null })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.code).toBe("invalid_type")
  })

  it("should fail validation when consent is undefined", () => {
    const result = bdsmConsentSchema.safeParse({ consent: undefined })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.code).toBe("invalid_type")
  })

  it("should fail validation when consent is a non-boolean value", () => {
    const result = bdsmConsentSchema.safeParse({ consent: "yes" })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.code).toBe("invalid_type")
  })

  it("should fail validation when consent is a number", () => {
    const result = bdsmConsentSchema.safeParse({ consent: 1 })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.code).toBe("invalid_type")
  })

  it("should ignore extra fields and only validate consent", () => {
    const result = bdsmConsentSchema.safeParse({ 
      consent: true, 
      extraField: "ignored" 
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ consent: true })
  })
})