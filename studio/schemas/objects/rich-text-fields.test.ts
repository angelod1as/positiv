import { createSchema } from "sanity"
import { describe, expect, it } from "vitest"

import { validateDocumentOf, validateValueOf } from "../../test/validate"
import { schemaTypes } from "../schema-types"

type CompiledType = {
  name: string
  jsonType: string
  type?: CompiledType
  fields?: { name: string; type: CompiledType }[]
  of?: CompiledType[]
}

type Case = { value: Record<string, unknown>; path: string[] }

const richTextTypes = ["richText", "longRichText"]

const image = [
  {
    _type: "image",
    _key: "i1",
    asset: { _type: "reference", _ref: "image-abc-1x1-jpg" },
  },
]

const schema = createSchema({ name: "rich-text-fields", types: schemaTypes })

function richTextFieldsOf(type: CompiledType): Case[] {
  return (type.fields ?? []).flatMap<Case>(({ name, type: fieldType }) => {
    if (richTextTypes.includes(fieldType.name)) {
      return [{ value: { [name]: image }, path: [name, "i1"] }]
    }

    if (fieldType.jsonType === "object") {
      return richTextFieldsOf(fieldType).map((inner) => ({
        value: { [name]: { _type: fieldType.name, ...inner.value } },
        path: [name, ...inner.path],
      }))
    }

    return (fieldType.of ?? []).flatMap((member) =>
      richTextFieldsOf(member).map((inner) => ({
        value: {
          [name]: [{ _type: member.name, _key: member.name, ...inner.value }],
        },
        path: [name, member.name, ...inner.path],
      })),
    )
  })
}

const cases = schemaTypes.flatMap(({ name }) => {
  const type = schema.get(name) as CompiledType

  return richTextFieldsOf(type).map(({ value, path }) => ({
    name,
    isDocument: type.type?.name === "document",
    value,
    path,
  }))
})

function pathOf(name: string, isDocument: boolean, path: string[]) {
  return (isDocument ? path : [name, ...path]).join(".")
}

function labelOf(name: string, isDocument: boolean, path: string[]) {
  return isDocument
    ? `${name}: ${pathOf(name, true, path)}`
    : pathOf(name, false, path)
}

describe("every rich text field", () => {
  it("finds the rich text fields nested in objects and arrays", () => {
    expect(
      cases.map(({ name, isDocument, path }) =>
        labelOf(name, isDocument, path),
      ),
    ).toEqual(
      expect.arrayContaining([
        "person: bio.i1",
        "about.cards.aboutCard.body.i1",
        "richTextSection.body.i1",
        "page: header.pageHero.subtitle.i1",
        "page: sections.richTextSection.body.i1",
        "siteSettings: footer.text.i1",
        "siteSettings: notice.i1",
      ]),
    )
  })

  it.each(
    cases.map((testCase) => [
      labelOf(testCase.name, testCase.isDocument, testCase.path),
      testCase,
    ]),
  )(
    "keeps its content rule at %s",
    async (_, { name, isDocument, value, path }) => {
      const errors = isDocument
        ? await validateDocumentOf(name, value)
        : await validateValueOf(name, { _type: name, ...value })

      expect(errors).toContainEqual(
        expect.objectContaining({ path: pathOf(name, isDocument, path) }),
      )
    },
  )
})
