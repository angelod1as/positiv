import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { paragraphs } from "../../test/portable-text"
import { validateValueOf } from "../../test/validate"

const hero = {
  _type: "hero",
  title: "evento de gente pelada",
  subtitle: paragraphs("para amantes de saliências não-mono"),
}

describe("hero", () => {
  it("accepts a title and a subtitle", async () => {
    expect(await validateValueOf("hero", hero)).toEqual([])
  })

  it.each(["title", "subtitle"])("requires the %s", async (field) => {
    const errors = await validateValueOf("hero", {
      ...hero,
      [field]: undefined,
    })

    expect(pathsOf(errors)).toContain(`hero.${field}`)
  })
})
