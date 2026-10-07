import { describe, expect, it } from "vitest"
import {
  longPortableTextSchema,
  portableTextSchema,
} from "./content.schema"

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

  it("rejects a span with a decorator other than bold or italic", () => {
    const result = portableTextSchema.safeParse([
      block([{ text: "sublinhado", marks: ["underline"] }]),
    ])

    expect(result.success).toBe(false)
  })

  it("rejects a span that points at a mark definition the block lacks", () => {
    const result = portableTextSchema.safeParse([
      block([{ text: "Veja", marks: ["l1"] }]),
    ])

    expect(result.success).toBe(false)
  })

  it("rejects a mark definition other than a link", () => {
    const result = portableTextSchema.safeParse([
      block([{ text: "Veja", marks: ["c1"] }], {
        markDefs: [{ _key: "c1", _type: "comment" }],
      }),
    ])

    expect(result.success).toBe(false)
  })

  const linked = (markDef: Omit<MarkDef, "_key">) => [
    block([{ text: "Veja", marks: ["l1"] }], {
      markDefs: [{ _key: "l1", ...markDef }],
    }),
  ]

  it.each(["/", "/eventos", "/sobre/equipe", "https://instagram.com/positiv"])(
    "accepts a link to %s",
    (href) => {
      const value = linked({ _type: "link", href })

      expect(portableTextSchema.parse(value)).toEqual(value)
    },
  )

  it("rejects a link without an address", () => {
    const result = portableTextSchema.safeParse(linked({ _type: "link" }))

    expect(result.success).toBe(false)
  })

  it.each([
    "http://instagram.com/positiv",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/eventos futuros",
    "javascript:alert(1)",
    "mailto:oi@positiv.party",
    "eventos",
    "https://",
    "",
  ])("rejects a link to %j", (href) => {
    const result = portableTextSchema.safeParse(linked({ _type: "link", href }))

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

describe("longPortableTextSchema", () => {
  it.each(["normal", "h2", "h3", "blockquote"])(
    "accepts a %s block",
    (style) => {
      const value = [block([{ text: "Consentimento" }], { style })]

      expect(longPortableTextSchema.parse(value)).toEqual(value)
    },
  )

  it.each(["h1", "h4"])("rejects a %s block", (style) => {
    const result = longPortableTextSchema.safeParse([
      block([{ text: "Consentimento" }], { style }),
    ])

    expect(result.success).toBe(false)
  })

  it.each(["bullet", "number"])("accepts a %s list item", (listItem) => {
    const value = [{ ...block([{ text: "Não é não." }]), listItem, level: 1 }]

    expect(longPortableTextSchema.parse(value)).toEqual(value)
  })

  it("rejects a list other than bullet or number", () => {
    const result = longPortableTextSchema.safeParse([
      { ...block([{ text: "Item" }]), listItem: "check", level: 1 },
    ])

    expect(result.success).toBe(false)
  })

  it("keeps the bold, italic and link rule of short text", () => {
    const value = [
      block(
        [
          { text: "negrito", marks: ["strong"] },
          { text: "os eventos", marks: ["em", "l1"] },
        ],
        { markDefs: [{ _key: "l1", _type: "link", href: "/eventos" }] },
      ),
    ]

    expect(longPortableTextSchema.parse(value)).toEqual(value)
    expect(
      longPortableTextSchema.safeParse([
        block([{ text: "sublinhado", marks: ["underline"] }]),
      ]).success,
    ).toBe(false)
    expect(
      longPortableTextSchema.safeParse([
        block([{ text: "Veja", marks: ["l1"] }], {
          markDefs: [{ _key: "l1", _type: "link", href: "//evil.example" }],
        }),
      ]).success,
    ).toBe(false)
  })

  it("rejects a member that is not a text block", () => {
    const result = longPortableTextSchema.safeParse([
      { _type: "image", _key: "i1", asset: { _ref: "image-1" } },
    ])

    expect(result.success).toBe(false)
  })

  it("rejects empty text", () => {
    expect(longPortableTextSchema.safeParse([]).success).toBe(false)
  })
})
