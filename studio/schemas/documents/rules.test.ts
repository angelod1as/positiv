import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { paragraphs } from "../../test/portable-text"
import { validateDocumentOf } from "../../test/validate"

const rule = (key: string, fields: Record<string, unknown> = {}) => ({
  _type: "rule",
  _key: key,
  title: "👍 Apenas SIM é SIM 👍",
  body: paragraphs("Essa é nossa regra de ouro do rolê."),
  ...fields,
})

const valid = {
  generalRules: [rule("g1")],
  agreements: [rule("a1")],
  privateRules: [rule("p1")],
}

function validate(fields: Record<string, unknown>) {
  return validateDocumentOf("rules", { ...valid, ...fields })
}

describe("rules", () => {
  it("accepts one list of rules for each part", async () => {
    expect(await validate({})).toEqual([])
  })

  it.each(["generalRules", "agreements"])(
    "requires at least one rule in %s",
    async (part) => {
      expect(pathsOf(await validate({ [part]: [] }))).toContain(part)
    },
  )

  it.each([[[]], [undefined]])(
    "publishes without Regras Privadas while they are being written (%j)",
    async (privateRules) => {
      expect(await validate({ privateRules })).toEqual([])
    },
  )

  it("requires a rule's title", async () => {
    expect(
      pathsOf(await validate({ generalRules: [rule("g1", { title: undefined })] })),
    ).toContain("generalRules.g1.title")
  })

  it("requires a rule's text", async () => {
    expect(
      pathsOf(await validate({ agreements: [rule("a1", { body: undefined })] })),
    ).toContain("agreements.a1.body")
  })

  it("accepts a highlight with a title and a text", async () => {
    const highlight = {
      title: "👀 Olhar tira pedaço, sim! 👀",
      body: paragraphs("A experiência de ser encarade pode ser muito ruim."),
    }

    expect(
      await validate({ privateRules: [rule("p1", { highlight })] }),
    ).toEqual([])
  })

  it("requires the highlight's text when there is a highlight", async () => {
    const highlight = { title: "👀 Olhar tira pedaço, sim! 👀" }

    expect(
      pathsOf(await validate({ privateRules: [rule("p1", { highlight })] })),
    ).toContain("privateRules.p1.highlight.body")
  })
})
