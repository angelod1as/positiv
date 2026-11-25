import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { sections } from "../../test/sections"
import { validateValueOf } from "../../test/validate"
import { rulesSection as rulesSectionType } from "./rules-section"

const { rulesSection } = sections

describe("rulesSection", () => {
  it.each(["generalRules", "agreements", "privateRules"])(
    "accepts the %s part",
    async (part) => {
      expect(
        await validateValueOf("rulesSection", { ...rulesSection, part }),
      ).toEqual([])
    },
  )

  it("requires a part", async () => {
    const errors = await validateValueOf("rulesSection", {
      ...rulesSection,
      part: undefined,
    })

    expect(pathsOf(errors)).toContain("rulesSection.part")
  })

  it("rejects a part the Rules do not have", async () => {
    const errors = await validateValueOf("rulesSection", {
      ...rulesSection,
      part: "somethingElse",
    })

    expect(pathsOf(errors)).toContain("rulesSection.part")
  })

  it("names the preview after the chosen part", () => {
    expect(
      rulesSectionType.preview?.prepare?.({ part: "privateRules" }),
    ).toEqual(
      expect.objectContaining({
        title: "Regras Privadas",
        subtitle: "Só para quem entrou na conta",
      }),
    )
  })
})
