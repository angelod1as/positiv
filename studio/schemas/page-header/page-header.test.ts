import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { paragraphs } from "../../test/portable-text"
import { validateValueOf } from "../../test/validate"

const forms = {
  homepageHero: {
    _type: "homepageHero",
    title: "evento de gente pelada",
    subtitle: paragraphs("para amantes de saliências não-mono"),
  },
  pageHero: {
    _type: "pageHero",
    title: "Quem somos",
    subtitle: paragraphs("Uma comunidade naturista queer."),
  },
  pageTitle: {
    _type: "pageTitle",
    title: "Código de conduta",
    intro: "O que esperamos de quem vem aos eventos.",
  },
}

describe.each(Object.entries(forms))("%s", (type, form) => {
  it("accepts a complete header", async () => {
    expect(await validateValueOf(type, form)).toEqual([])
  })

  it("requires the title", async () => {
    const errors = await validateValueOf(type, { ...form, title: undefined })

    expect(pathsOf(errors)).toContain(`${type}.title`)
  })
})

describe.each(["homepageHero", "pageHero"] as const)("%s", (type) => {
  it("requires the subtitle", async () => {
    const errors = await validateValueOf(type, {
      ...forms[type],
      subtitle: undefined,
    })

    expect(pathsOf(errors)).toContain(`${type}.subtitle`)
  })

  it("keeps the subtitle to short text", async () => {
    const errors = await validateValueOf(type, {
      ...forms[type],
      subtitle: [{ ...paragraphs("Título")[0], style: "h2" }],
    })

    expect(
      pathsOf(errors).some((path) => path.startsWith(`${type}.subtitle`)),
    ).toBe(true)
  })
})

describe("pageTitle", () => {
  it("makes the intro optional", async () => {
    expect(
      await validateValueOf("pageTitle", {
        ...forms.pageTitle,
        intro: undefined,
      }),
    ).toEqual([])
  })
})
