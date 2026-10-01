import { describe, expect, it } from "vitest"

import { pathsOf } from "../../test/errors"
import { sections } from "../../test/sections"
import { validateValueOf } from "../../test/validate"

const { richTextSection } = sections

describe("richTextSection", () => {
  it("accepts a title and a long text body", async () => {
    expect(await validateValueOf("richTextSection", richTextSection)).toEqual(
      [],
    )
  })

  it("accepts a body without a title", async () => {
    expect(
      await validateValueOf("richTextSection", {
        ...richTextSection,
        title: undefined,
      }),
    ).toEqual([])
  })

  it("requires the body", async () => {
    const errors = await validateValueOf("richTextSection", {
      ...richTextSection,
      body: undefined,
    })

    expect(pathsOf(errors)).toContain("richTextSection.body")
  })

  it("rejects a body with an image", async () => {
    const errors = await validateValueOf("richTextSection", {
      ...richTextSection,
      body: [
        {
          _type: "image",
          _key: "i1",
          asset: { _type: "reference", _ref: "image-abc-1x1-jpg" },
        },
      ],
    })

    expect(pathsOf(errors)).toContain("richTextSection.body.i1")
  })
})
