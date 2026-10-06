import { SanityClient } from "@sanity/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { validateDocumentOf, validateValueOf } from "../../test/validate"
import { CODE_OF_CONDUCT_PAGE_ID, codeOfConductToPage } from "./transform"

describe("codeOfConductToPage", () => {
  beforeEach(() => {
    vi.spyOn(
      SanityClient.prototype as unknown as {
        fetch(query: string, params: object): Promise<number>
      },
      "fetch",
    ).mockResolvedValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("writes a Page that validates against the schema", async () => {
    const { _type, ...fields } = codeOfConductToPage()

    expect(_type).toBe("page")
    expect(await validateDocumentOf(_type, fields)).toEqual([])
  })

  it("writes the Page at /codigo-de-conduta with its fixed id and title", () => {
    expect(codeOfConductToPage()).toMatchObject({
      _id: CODE_OF_CONDUCT_PAGE_ID,
      title: "Código de Conduta",
      address: "/codigo-de-conduta",
    })
  })

  it("opens the Page with a Title header carrying the introduction", () => {
    const { header } = codeOfConductToPage()

    expect(header).toHaveLength(1)
    expect(header[0]).toMatchObject({
      _type: "pageTitle",
      _key: "header",
      title: "Código de Conduta",
    })
    expect(header[0].intro).toMatch(/^Na Positiv/)
  })

  it("holds one Rich Text Section whose body validates as long rich text", async () => {
    const { sections } = codeOfConductToPage()

    expect(sections).toHaveLength(1)
    expect(sections[0]._type).toBe("richTextSection")
    expect(await validateValueOf("longRichText", sections[0].body)).toEqual([])
  })

  it("converts each numbered heading to an h2 and keeps the WhatsApp link", () => {
    const [section] = codeOfConductToPage().sections
    const headings = section.body
      .filter((block) => block.style === "h2")
      .map((block) => block.children.map((span) => span.text).join(""))

    expect(headings[0]).toMatch(/^1\. Tolerância zero/)
    expect(headings).toHaveLength(5)

    const links = section.body.flatMap((block) => block.markDefs)
    expect(links).toContainEqual(
      expect.objectContaining({ href: "https://wa.me/5511945970336" }),
    )
  })

  it("sets the SEO description and leaves the Page indexable", () => {
    expect(codeOfConductToPage().seo).toEqual({
      _type: "seo",
      description: "Código de conduta da Positiv",
      noIndex: false,
    })
  })

  it("writes the same Page every time", () => {
    expect(codeOfConductToPage()).toEqual(codeOfConductToPage())
  })
})
