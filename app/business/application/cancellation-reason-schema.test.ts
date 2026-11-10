import { describe, expect, it } from "vitest"
import {
  MAX_CANCELLATION_REASON_LENGTH,
  cancellationReasonSchema,
} from "./cancellation-reason-schema"

describe("cancellationReasonSchema", () => {
  it("caps the reason at 500 characters", () => {
    expect(MAX_CANCELLATION_REASON_LENGTH).toBe(500)
  })

  it("keeps the reason the participant typed, trimmed", () => {
    expect(cancellationReasonSchema.parse("  Vou viajar  ")).toBe("Vou viajar")
  })

  it("turns a missing reason into null", () => {
    expect(cancellationReasonSchema.parse(undefined)).toBeNull()
  })

  it("turns a blank reason into null", () => {
    expect(cancellationReasonSchema.parse("   ")).toBeNull()
  })

  it("accepts exactly 500 characters", () => {
    const reason = "a".repeat(500)

    expect(cancellationReasonSchema.parse(reason)).toBe(reason)
  })

  it("refuses 501 characters", () => {
    expect(cancellationReasonSchema.safeParse("a".repeat(501)).success).toBe(
      false,
    )
  })

  it("measures the length after trimming", () => {
    const reason = `  ${"a".repeat(500)}  `

    expect(cancellationReasonSchema.parse(reason)).toBe("a".repeat(500))
  })
})
