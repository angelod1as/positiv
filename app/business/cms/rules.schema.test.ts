import rulesFixture from "../../../e2e/fixtures/rules.json"
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

  it("accepts the e2e fixture generated from the seed", () => {
    expect(rulesSchema.parse(rulesFixture)).toEqual(rulesFixture)
  })

  it("accepts a highlight without a title", () => {
    const highlight = { title: null, body: paragraph("Só o texto.") }
    const rules = { ...valid, agreements: [{ ...rule("a1"), highlight }] }

    expect(rulesSchema.parse(rules)).toEqual(rules)
  })

  // The Studio asks for at least one rule in each part; a part emptied while
  // being rewritten must not take the other two down with it.
  it.each(["generalRules", "agreements", "privateRules"])(
    "accepts an empty %s",
    (part) => {
      expect(rulesSchema.safeParse({ ...valid, [part]: [] }).success).toBe(true)
    },
  )

  // Sanity drops an array field emptied in the Studio, so it arrives as null.
  it("reads a part Sanity dropped as no rules", () => {
    expect(rulesSchema.parse({ ...valid, agreements: null })).toEqual({
      ...valid,
      agreements: [],
    })
  })

  it("rejects a rule without a title", () => {
    const rules = { ...valid, generalRules: [{ ...rule("g1"), title: null }] }

    expect(rulesSchema.safeParse(rules).success).toBe(false)
  })

  it("rejects a rule without a text", () => {
    const rules = { ...valid, generalRules: [{ ...rule("g1"), body: null }] }

    expect(rulesSchema.safeParse(rules).success).toBe(false)
  })
})
