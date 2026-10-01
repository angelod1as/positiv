import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { validateValueOf } from "../../test/validate"

const seo = {
  _type: "seo",
  title: "Sobre a Positiv",
  description:
    "Quem somos, como nascemos e por que fazemos eventos naturistas para pessoas queer.",
  image: {
    _type: "image",
    asset: { _type: "reference", _ref: "image-abc-1200x630-jpg" },
    alt: "Pessoas reunidas em um evento da Positiv",
  },
  noIndex: false,
}

describe("seo", () => {
  it("accepts complete SEO", async () => {
    expect(await validateValueOf("seo", seo)).toEqual([])
    expect(await validateValueOf("seo", seo, "warning")).toEqual([])
  })

  it.each(["title", "image", "noIndex"])(
    "makes the %s optional",
    async (field) => {
      expect(
        await validateValueOf("seo", { ...seo, [field]: undefined }),
      ).toEqual([])
    },
  )

  it("requires the description", async () => {
    const errors = await validateValueOf("seo", {
      ...seo,
      description: undefined,
    })

    expect(pathsOf(errors)).toContain("seo.description")
  })

  it.each([
    ["shorter than 50 characters", "a".repeat(49)],
    ["longer than 160 characters", "a".repeat(161)],
  ])(
    "warns, without blocking, about a description %s",
    async (_, description) => {
      const value = { ...seo, description }

      expect(await validateValueOf("seo", value)).toEqual([])
      expect(pathsOf(await validateValueOf("seo", value, "warning"))).toContain(
        "seo.description",
      )
    },
  )

  it.each([50, 160])("does not warn at %i characters", async (length) => {
    expect(
      await validateValueOf(
        "seo",
        { ...seo, description: "a".repeat(length) },
        "warning",
      ),
    ).toEqual([])
  })

  it("requires alt text on the image", async () => {
    const errors = await validateValueOf("seo", {
      ...seo,
      image: { ...seo.image, alt: undefined },
    })

    expect(pathsOf(errors)).toContain("seo.image.alt")
  })
})
