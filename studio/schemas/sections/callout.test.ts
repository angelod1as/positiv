import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { sections } from "../../test/sections"
import { validateValueOf } from "../../test/validate"

const { callout } = sections

const withFields = (fields: Record<string, unknown>) => ({
  ...callout,
  ...fields,
})

describe("callout", () => {
  it("accepts an emoji, a title, a text and a colour", async () => {
    expect(await validateValueOf("callout", callout)).toEqual([])
  })

  it("accepts a text alone", async () => {
    expect(
      await validateValueOf(
        "callout",
        withFields({ emoji: undefined, title: undefined }),
      ),
    ).toEqual([])
  })

  it.each([
    "purple",
    "blue",
    "green",
    "lightgreen",
    "yellow",
    "red",
    "neutral",
  ])("accepts the %s colour", async (color) => {
    expect(await validateValueOf("callout", withFields({ color }))).toEqual([])
  })

  it.each(["🎉", "❤️", "👩🏽‍💻", "🏳️‍🌈", "🇧🇷", "1️⃣"])(
    "accepts the %s emoji",
    async (emoji) => {
      expect(await validateValueOf("callout", withFields({ emoji }))).toEqual(
        [],
      )
    },
  )

  it.each([
    ["two emoji", "🎉🎉"],
    ["a letter", "a"],
    ["an emoji and a word", "🎉 festa"],
    ["a digit", "1"],
    ["a copyright sign", "©"],
    ["a trade mark sign", "™"],
  ])("rejects %s as the emoji", async (_, emoji) => {
    const errors = await validateValueOf("callout", withFields({ emoji }))

    expect(pathsOf(errors)).toContain("callout.emoji")
  })

  it("requires the text", async () => {
    const errors = await validateValueOf(
      "callout",
      withFields({ body: undefined }),
    )

    expect(pathsOf(errors)).toContain("callout.body")
  })

  it("requires a colour", async () => {
    const errors = await validateValueOf(
      "callout",
      withFields({ color: undefined }),
    )

    expect(pathsOf(errors)).toContain("callout.color")
  })

  it("rejects a colour outside the brand colours", async () => {
    const errors = await validateValueOf(
      "callout",
      withFields({ color: "orange" }),
    )

    expect(pathsOf(errors)).toContain("callout.color")
  })

  it.each(["bullet", "number"])("accepts a %s list", async (listItem) => {
    const [paragraph] = callout.body

    expect(
      await validateValueOf(
        "callout",
        withFields({ body: [{ ...paragraph, listItem, level: 1 }] }),
      ),
    ).toEqual([])
  })

  it.each(["h2", "h3", "blockquote"])(
    "rejects the %s style in the text",
    async (style) => {
      const [paragraph] = callout.body
      const errors = await validateValueOf(
        "callout",
        withFields({ body: [{ ...paragraph, style }] }),
      )

      expect(errors).not.toEqual([])
    },
  )
})
