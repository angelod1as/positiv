import likertScaleFixture from "../../../e2e/fixtures/likert-scale.json"
import { describe, expect, it } from "vitest"
import { likertScaleSchema } from "./likert-scale.schema"

const valid = {
  statements: [
    { key: "exemplo-01", text: "Sou uma afirmação de exemplo." },
    { key: "exemplo-02", text: "Também sou de exemplo." },
  ],
}

describe("likertScaleSchema", () => {
  it("accepts a list of statements", () => {
    expect(likertScaleSchema.parse(valid)).toEqual(valid)
  })

  it("accepts the e2e fixture generated from the seed", () => {
    expect(likertScaleSchema.parse(likertScaleFixture)).toEqual(
      likertScaleFixture,
    )
  })

  it("rejects a scale with no statements", () => {
    expect(likertScaleSchema.safeParse({ statements: [] }).success).toBe(false)
  })

  it("rejects a blank statement", () => {
    expect(
      likertScaleSchema.safeParse({
        statements: [{ key: "exemplo-01", text: " " }],
      }).success,
    ).toBe(false)
  })

  it("rejects a statement key outside the allowed format", () => {
    expect(
      likertScaleSchema.safeParse({
        statements: [{ key: "Chave Ruim", text: "Texto." }],
      }).success,
    ).toBe(false)
  })

  it("rejects two statements with the same key", () => {
    const result = likertScaleSchema.safeParse({
      statements: [
        { key: "repetida", text: "Um." },
        { key: "repetida", text: "Dois." },
      ],
    })
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain("repetida")
  })
})
