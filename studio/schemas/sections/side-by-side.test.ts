import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { sections } from "../../test/sections"
import { validateValueOf } from "../../test/validate"

const { sideBySide, callout } = sections

const withItems = (count: number) => ({
  ...sideBySide,
  items: Array.from({ length: count }, (_, index) => ({
    ...callout,
    _key: `item-${index}`,
  })),
})

describe("sideBySide", () => {
  it("accepts a title and two callouts", async () => {
    expect(await validateValueOf("sideBySide", sideBySide)).toEqual([])
  })

  it("accepts callouts without a title", async () => {
    expect(
      await validateValueOf("sideBySide", { ...sideBySide, title: undefined }),
    ).toEqual([])
  })

  it.each([2, 3, 4])("accepts %s callouts", async (count) => {
    expect(await validateValueOf("sideBySide", withItems(count))).toEqual([])
  })

  it.each([0, 1, 5])("rejects %s callouts", async (count) => {
    const errors = await validateValueOf("sideBySide", withItems(count))

    expect(pathsOf(errors)).toContain("sideBySide.items")
  })

  it("checks each callout's own fields", async () => {
    const errors = await validateValueOf("sideBySide", {
      ...sideBySide,
      items: [
        { ...callout, _key: "a" },
        { ...callout, _key: "b", body: undefined },
      ],
    })

    expect(pathsOf(errors)).toContain("sideBySide.items.b.body")
  })
})
