import { describe, expect, it } from "vitest"
import { likertSchema } from "./likert"

describe("likertSchema", () => {
  it("refuses a statement nobody answered", () => {
    expect(likertSchema.safeParse(undefined).success).toBe(false)
  })

  it("refuses an answer with a comment but no choice", () => {
    expect(likertSchema.safeParse({ comment: "Depende do dia" }).success).toBe(
      false,
    )
  })

  it("refuses a choice the scale does not offer", () => {
    expect(likertSchema.safeParse({ choice: "maybe" }).success).toBe(false)
  })

  it("accepts a choice without a comment", () => {
    expect(likertSchema.safeParse({ choice: "agree" }).success).toBe(true)
  })

  it("accepts a choice with a comment", () => {
    expect(
      likertSchema.safeParse({
        choice: "strongly_disagree",
        comment: "Nunca pensei nisso",
      }).success,
    ).toBe(true)
  })

  it("says to pick an option when none was picked", () => {
    const result = likertSchema.safeParse({})

    expect(result.error?.issues[0].message).toBe("Escolha uma opção")
  })
})
