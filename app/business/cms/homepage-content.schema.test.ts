import { describe, expect, it } from "vitest"
import { portableTextSchema } from "./homepage-content.schema"

type Span = { text: string; marks?: string[] }
type MarkDef = { _key: string; _type: string; href?: string }

const block = (
  spans: Span[],
  {
    style = "normal",
    markDefs = [],
  }: { style?: string; markDefs?: MarkDef[] } = {},
) => ({
  _type: "block",
  _key: "b1",
  style,
  markDefs,
  children: spans.map((span, index) => ({
    _type: "span",
    _key: `s${index}`,
    text: span.text,
    marks: span.marks ?? [],
  })),
})

describe("portableTextSchema", () => {
  it("accepts paragraphs with bold and italic text", () => {
    const value = [
      block([
        { text: "Somos " },
        { text: "muito", marks: ["strong"] },
        { text: " diferentes", marks: ["em"] },
      ]),
    ]

    expect(portableTextSchema.parse(value)).toEqual(value)
  })

  it("rejects a block with a style other than a paragraph", () => {
    const result = portableTextSchema.safeParse([
      block([{ text: "Título" }], { style: "h1" }),
    ])

    expect(result.success).toBe(false)
  })

  it("rejects a list item", () => {
    const result = portableTextSchema.safeParse([
      { ...block([{ text: "Item" }]), listItem: "bullet", level: 1 },
    ])

    expect(result.success).toBe(false)
  })

  it("rejects a member that is not a text block", () => {
    const result = portableTextSchema.safeParse([
      { _type: "image", _key: "i1", asset: { _ref: "image-1" } },
    ])

    expect(result.success).toBe(false)
  })

  it("rejects a child that is not a span", () => {
    const result = portableTextSchema.safeParse([
      {
        ...block([]),
        children: [{ _type: "inlineImage", _key: "c1" }],
      },
    ])

    expect(result.success).toBe(false)
  })
})
