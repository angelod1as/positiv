import { describe, expect, it } from "vitest"
import { likertScaleSchema } from "./likert-scale.schema"

const valid = {
  themes: [
    {
      name: "Tema de exemplo",
      statements: [
        { key: "exemplo-01", text: "Sou uma afirmação de exemplo." },
        { key: "exemplo-02", text: "Também sou de exemplo." },
      ],
    },
    {
      name: "Outro tema",
      statements: [{ key: "exemplo-03", text: "Mais uma." }],
    },
  ],
  venues: {
    question: "A quais destes você já foi?",
    options: [
      { key: "sauna", label: "Sauna" },
      { key: "nenhum", label: "Nenhum destes" },
    ],
  },
  nonMonogamySince: {
    question: "Desde quando você vive a não-monogamia?",
    notLivingLabel: "Não vivo a não-monogamia hoje",
  },
}

function withThemes(themes: unknown) {
  return { ...valid, themes }
}

describe("likertScaleSchema", () => {
  it("accepts a complete scale and keeps its order", () => {
    expect(likertScaleSchema.parse(valid)).toEqual(valid)
  })

  it("rejects a scale with no themes", () => {
    expect(likertScaleSchema.safeParse(withThemes([])).success).toBe(false)
  })

  it("rejects a theme with no statements", () => {
    expect(
      likertScaleSchema.safeParse(withThemes([{ name: "Tema", statements: [] }]))
        .success,
    ).toBe(false)
  })

  it("rejects a theme with a blank name", () => {
    expect(
      likertScaleSchema.safeParse(
        withThemes([{ ...valid.themes[0], name: "  " }]),
      ).success,
    ).toBe(false)
  })

  it("rejects a blank statement", () => {
    expect(
      likertScaleSchema.safeParse(
        withThemes([
          { name: "Tema", statements: [{ key: "exemplo-01", text: " " }] },
        ]),
      ).success,
    ).toBe(false)
  })

  it("rejects a statement key outside the allowed format", () => {
    expect(
      likertScaleSchema.safeParse(
        withThemes([
          { name: "Tema", statements: [{ key: "Chave Ruim", text: "Texto." }] },
        ]),
      ).success,
    ).toBe(false)
  })

  it("rejects the same statement key in two themes", () => {
    const result = likertScaleSchema.safeParse(
      withThemes([
        { name: "Tema 1", statements: [{ key: "repetida", text: "Um." }] },
        { name: "Tema 2", statements: [{ key: "repetida", text: "Dois." }] },
      ]),
    )
    expect(result.success).toBe(false)
    expect(JSON.stringify(result.error?.issues)).toContain("repetida")
  })

  it("rejects a venues question with no options", () => {
    expect(
      likertScaleSchema.safeParse({
        ...valid,
        venues: { ...valid.venues, options: [] },
      }).success,
    ).toBe(false)
  })

  it("rejects two venue options with the same key", () => {
    expect(
      likertScaleSchema.safeParse({
        ...valid,
        venues: {
          ...valid.venues,
          options: [
            { key: "sauna", label: "Sauna" },
            { key: "sauna", label: "Outra sauna" },
          ],
        },
      }).success,
    ).toBe(false)
  })

  it("rejects a missing objective question", () => {
    const { nonMonogamySince: _omitted, ...withoutSince } = valid
    expect(likertScaleSchema.safeParse(withoutSince).success).toBe(false)
  })

  it("rejects a blank label for the not-living option", () => {
    expect(
      likertScaleSchema.safeParse({
        ...valid,
        nonMonogamySince: { ...valid.nonMonogamySince, notLivingLabel: "" },
      }).success,
    ).toBe(false)
  })
})
