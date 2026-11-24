import { describe, expect, it } from "vitest"
import { rulesSchema } from "./rules.schema"

const paragraph = (text: string) => [
  {
    _type: "block",
    _key: "p",
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: "s", text, marks: [] }],
  },
]

const rule = (key: string) => ({
  _key: key,
  title: "👍 Apenas SIM é SIM 👍",
  body: paragraph("Essa é nossa regra de ouro do rolê."),
  highlight: null,
})

const valid = {
  generalRules: [rule("g1")],
  agreements: [rule("a1")],
  privateRules: [
    {
      ...rule("p1"),
      highlight: {
        title: "👀 Olhar tira pedaço, sim! 👀",
        body: paragraph("Ser encarade pode ser muito ruim."),
      },
    },
  ],
}

describe("rulesSchema", () => {
  it("accepts the three parts, a rule with a highlight among them", () => {
    expect(rulesSchema.parse(valid)).toEqual(valid)
  })

  it("accepts a highlight without a title", () => {
    const highlight = { title: null, body: paragraph("Só o texto.") }
    const rules = { ...valid, agreements: [{ ...rule("a1"), highlight }] }

    expect(rulesSchema.parse(rules)).toEqual(rules)
  })

  it.each(["generalRules", "agreements", "privateRules"])(
    "rejects an empty %s",
    (part) => {
      expect(rulesSchema.safeParse({ ...valid, [part]: [] }).success).toBe(
        false,
      )
    },
  )

  it("rejects a rule without a title", () => {
    const rules = { ...valid, generalRules: [{ ...rule("g1"), title: null }] }

    expect(rulesSchema.safeParse(rules).success).toBe(false)
  })

  it("rejects a rule without a text", () => {
    const rules = { ...valid, generalRules: [{ ...rule("g1"), body: null }] }

    expect(rulesSchema.safeParse(rules).success).toBe(false)
  })
})
