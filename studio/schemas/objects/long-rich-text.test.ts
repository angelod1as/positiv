import { describe, expect, it } from "vitest"

import { validateValueOf } from "../../test/validate"

function block(
  fields: object = {},
  markDefs: object[] = [],
  marks: string[] = [],
) {
  return {
    _type: "block",
    _key: "b1",
    style: "normal",
    markDefs,
    children: [{ _type: "span", _key: "s1", text: "Positiv", marks }],
    ...fields,
  }
}

function linkTo(href: string) {
  return [block({}, [{ _type: "link", _key: "l1", href }], ["l1"])]
}

describe("longRichText", () => {
  it.each(["normal", "h2", "h3", "blockquote"])(
    "accepts the %s style",
    async (style) => {
      expect(await validateValueOf("longRichText", [block({ style })])).toEqual(
        [],
      )
    },
  )

  it.each(["bullet", "number"])("accepts a %s list", async (listItem) => {
    expect(
      await validateValueOf("longRichText", [block({ listItem, level: 1 })]),
    ).toEqual([])
  })

  it("accepts bold and italic text", async () => {
    expect(
      await validateValueOf("longRichText", [block({}, [], ["strong", "em"])]),
    ).toEqual([])
  })

  it.each([
    ["a link to a page of the site", "/eventos"],
    ["an https link", "https://www.instagram.com/positiv"],
  ])("accepts %s", async (_, href) => {
    expect(await validateValueOf("longRichText", linkTo(href))).toEqual([])
  })

  it.each([
    ["an http link", "http://example.com"],
    ["a javascript: link", "javascript:alert(1)"],
    ["a path without the leading slash", "eventos"],
    ["a protocol-relative link", "//example.com"],
    ["a protocol-relative link with a backslash", "/\\example.com"],
    ["a protocol-relative link hidden by a tab", "/\t/example.com"],
    ["a protocol-relative link hidden by a newline", "/\n/example.com"],
    ["a path with a space", "/eventos futuros"],
  ])("rejects %s", async (_, href) => {
    expect(await validateValueOf("longRichText", linkTo(href))).toContainEqual(
      expect.objectContaining({ path: "longRichText.b1.markDefs.l1.href" }),
    )
  })

  it("rejects a link without an address", async () => {
    expect(
      await validateValueOf("longRichText", [
        block({}, [{ _type: "link", _key: "l1" }], ["l1"]),
      ]),
    ).toContainEqual(
      expect.objectContaining({ path: "longRichText.b1.markDefs.l1.href" }),
    )
  })

  it.each(["h1", "h4"])("rejects the %s style", async (style) => {
    expect(
      await validateValueOf("longRichText", [block({ style })]),
    ).not.toEqual([])
  })

  it("rejects a list type other than bullet and number", async () => {
    expect(
      await validateValueOf("longRichText", [
        block({ listItem: "check", level: 1 }),
      ]),
    ).not.toEqual([])
  })

  it("rejects a decorator other than bold and italic", async () => {
    expect(
      await validateValueOf("longRichText", [block({}, [], ["underline"])]),
    ).not.toEqual([])
  })

  it("rejects an annotation other than a link", async () => {
    expect(
      await validateValueOf("longRichText", [
        block(
          {},
          [{ _type: "comment", _key: "c1", href: "https://example.com" }],
          ["c1"],
        ),
      ]),
    ).not.toEqual([])
  })

  it("rejects an image", async () => {
    expect(
      await validateValueOf("longRichText", [
        {
          _type: "image",
          _key: "i1",
          asset: { _type: "reference", _ref: "image-abc-1x1-jpg" },
        },
      ]),
    ).not.toEqual([])
  })
})
