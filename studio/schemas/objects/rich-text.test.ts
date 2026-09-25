import { describe, expect, it } from "vitest"

import { validateValueOf } from "../../test/validate"

function paragraph(markDefs: object[], marks: string[] = [], style = "normal") {
  return {
    _type: "block",
    _key: "p1",
    style,
    markDefs,
    children: [{ _type: "span", _key: "s1", text: "Positiv", marks }],
  }
}

function linkTo(href: string) {
  return [paragraph([{ _type: "link", _key: "l1", href }], ["l1"])]
}

describe("richText", () => {
  it("accepts a paragraph with bold and italic text", async () => {
    expect(
      await validateValueOf("richText", [paragraph([], ["strong", "em"])]),
    ).toEqual([])
  })

  it("accepts a link to a page of the site", async () => {
    expect(await validateValueOf("richText", linkTo("/eventos"))).toEqual([])
  })

  it("accepts an https link", async () => {
    expect(
      await validateValueOf(
        "richText",
        linkTo("https://www.instagram.com/positiv"),
      ),
    ).toEqual([])
  })

  it.each([
    ["an http link", "http://example.com"],
    ["a javascript: link", "javascript:alert(1)"],
    ["a path without the leading slash", "eventos"],
    ["a protocol-relative link", "//example.com"],
  ])("rejects %s", async (_, href) => {
    expect(await validateValueOf("richText", linkTo(href))).toContainEqual(
      expect.objectContaining({ path: "richText.p1.markDefs.l1.href" }),
    )
  })

  it("rejects a link without an address", async () => {
    expect(
      await validateValueOf("richText", [
        paragraph([{ _type: "link", _key: "l1" }], ["l1"]),
      ]),
    ).toContainEqual(
      expect.objectContaining({ path: "richText.p1.markDefs.l1.href" }),
    )
  })

  it("rejects a heading", async () => {
    expect(
      await validateValueOf("richText", [paragraph([], [], "h2")]),
    ).not.toEqual([])
  })

  it("rejects a decorator other than bold and italic", async () => {
    expect(
      await validateValueOf("richText", [paragraph([], ["underline"])]),
    ).not.toEqual([])
  })

  it("rejects an annotation other than a link", async () => {
    expect(
      await validateValueOf("richText", [
        paragraph(
          [{ _type: "comment", _key: "c1", href: "https://example.com" }],
          ["c1"],
        ),
      ]),
    ).not.toEqual([])
  })

  it("rejects an image", async () => {
    expect(
      await validateValueOf("richText", [
        {
          _type: "image",
          _key: "i1",
          asset: { _type: "reference", _ref: "image-abc-1x1-jpg" },
        },
      ]),
    ).not.toEqual([])
  })
})
