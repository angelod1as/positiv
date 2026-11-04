import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { sections } from "../../test/sections"
import { validateValueOf } from "../../test/validate"
import { statsSection as statsSectionType } from "./stats-section"

const { statsSection } = sections
const [bigNumber, range, comparison] = statsSection.cards

const withCards = (...cards: Record<string, unknown>[]) => ({
  ...statsSection,
  cards,
})

describe("statsSection", () => {
  it("accepts a title and one card of each type", async () => {
    expect(await validateValueOf("statsSection", statsSection)).toEqual([])
  })

  it("accepts cards without a title", async () => {
    expect(
      await validateValueOf("statsSection", {
        ...statsSection,
        title: undefined,
      }),
    ).toEqual([])
  })

  it.each(["none", "percent", "brl"])(
    "accepts a card in the %s unit",
    async (unit) => {
      expect(
        await validateValueOf("statsSection", withCards({ ...bigNumber, unit })),
      ).toEqual([])
    },
  )

  it("requires at least one card", async () => {
    const errors = await validateValueOf("statsSection", withCards())

    expect(pathsOf(errors)).toContain("statsSection.cards")
  })

  it.each([
    ["a big number", "value", bigNumber],
    ["a big number", "caption", bigNumber],
    ["a big number", "unit", bigNumber],
    ["a range", "average", range],
    ["a comparison", "before", comparison],
    ["a comparison", "afterLabel", comparison],
  ])("requires %s's %s", async (_, field, card) => {
    const errors = await validateValueOf(
      "statsSection",
      withCards({ ...card, [field]: undefined }),
    )

    expect(pathsOf(errors)).toContain(
      `statsSection.cards.${card._key}.${field}`,
    )
  })

  it("rejects a unit outside none, percent and brl", async () => {
    const errors = await validateValueOf(
      "statsSection",
      withCards({ ...bigNumber, unit: "usd" }),
    )

    expect(pathsOf(errors)).toContain(`statsSection.cards.${bigNumber._key}.unit`)
  })

  it.each([
    ["an average below the minimum", { min: 30, average: 20, max: 40 }],
    ["an average above the maximum", { min: 10, average: 50, max: 40 }],
    ["a minimum above the maximum", { min: 50, average: 50, max: 40 }],
  ])("rejects a range with %s", async (_, values) => {
    const errors = await validateValueOf(
      "statsSection",
      withCards({ ...range, ...values }),
    )

    expect(pathsOf(errors)).toContain(`statsSection.cards.${range._key}`)
  })

  it("titles the preview Números when it has no title", () => {
    expect(statsSectionType.preview?.prepare?.({ title: "" })).toEqual(
      expect.objectContaining({ title: "Números" }),
    )
  })
})
