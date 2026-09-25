import { describe, expect, it } from "vitest"

import { validateDocumentOf } from "../../test/validate"

const bio = [
  {
    _type: "block",
    _key: "b1",
    style: "normal",
    markDefs: [],
    children: [
      { _type: "span", _key: "s1", text: "Organiza eventos.", marks: [] },
    ],
  },
]

const validPerson = {
  name: "Julia Fernandez",
  pronouns: "todos os pronomes",
  instagram: "ju.z.fernandez",
  photo: {
    _type: "image",
    asset: { _type: "reference", _ref: "image-abc123-800x800-jpg" },
    alt: "Julia sorrindo",
  },
  bio,
}

function pathsOfErrors(errors: { path: string }[]) {
  return errors.map((error) => error.path)
}

describe("person", () => {
  it("accepts a complete person", async () => {
    expect(await validateDocumentOf("person", validPerson)).toEqual([])
  })

  it.each(["name", "pronouns", "instagram", "photo", "bio"])(
    "requires %s",
    async (field) => {
      const errors = await validateDocumentOf("person", {
        ...validPerson,
        [field]: undefined,
      })

      expect(pathsOfErrors(errors)).toContain(field)
    },
  )

  it("requires the photo file, not just its alt text", async () => {
    const errors = await validateDocumentOf("person", {
      ...validPerson,
      photo: { _type: "image", alt: "Julia sorrindo" },
    })

    expect(pathsOfErrors(errors)).toContain("photo")
  })

  it("requires alt text on the photo", async () => {
    const errors = await validateDocumentOf("person", {
      ...validPerson,
      photo: { ...validPerson.photo, alt: undefined },
    })

    expect(pathsOfErrors(errors)).toContain("photo.alt")
  })

  it.each([
    ["with the @", "@ju.z.fernandez"],
    ["as a profile link", "https://www.instagram.com/ju.z.fernandez"],
    ["with spaces", "ju fernandez"],
  ])("rejects an Instagram handle written %s", async (_, instagram) => {
    const errors = await validateDocumentOf("person", {
      ...validPerson,
      instagram,
    })

    expect(pathsOfErrors(errors)).toContain("instagram")
  })
})
