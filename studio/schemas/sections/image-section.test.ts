import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { sections } from "../../test/sections"
import { validateValueOf } from "../../test/validate"

const { imageSection } = sections

describe("imageSection", () => {
  it("accepts an image with alt text, a hotspot and a caption", async () => {
    expect(
      await validateValueOf("imageSection", {
        ...imageSection,
        image: {
          ...imageSection.image,
          hotspot: { x: 0.5, y: 0.3, height: 0.4, width: 0.4 },
          crop: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      }),
    ).toEqual([])
  })

  it("accepts an image without a caption", async () => {
    expect(
      await validateValueOf("imageSection", {
        ...imageSection,
        caption: undefined,
      }),
    ).toEqual([])
  })

  it("requires the image", async () => {
    const errors = await validateValueOf("imageSection", {
      ...imageSection,
      image: undefined,
    })

    expect(pathsOf(errors)).toContain("imageSection.image")
  })

  it("requires the image file", async () => {
    const errors = await validateValueOf("imageSection", {
      ...imageSection,
      image: { ...imageSection.image, asset: undefined },
    })

    expect(pathsOf(errors)).toContain("imageSection.image")
  })

  it("requires the alt text", async () => {
    const errors = await validateValueOf("imageSection", {
      ...imageSection,
      image: { ...imageSection.image, alt: undefined },
    })

    expect(pathsOf(errors)).toContain("imageSection.image.alt")
  })
})
