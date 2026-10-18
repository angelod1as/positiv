import { describe, expect, it } from "vitest"
import {
  renderInlineBlocks,
  unknownBlockVariables,
} from "./render-inline-portable-text"

const block = (...spans: { text: string; marks?: string[] }[]) => ({
  _type: "block",
  _key: "b",
  children: spans.map((span, index) => ({
    _type: "span",
    _key: `s${index}`,
    text: span.text,
    marks: span.marks ?? [],
  })),
})

describe("renderInlineBlocks", () => {
  it("returns one inline string per block", () => {
    expect(
      renderInlineBlocks([block({ text: "um" }), block({ text: "dois" })]),
    ).toEqual(["um", "dois"])
  })

  it("wraps a strong span in <strong>", () => {
    expect(
      renderInlineBlocks([
        block({ text: "na " }, { text: "Festa", marks: ["strong"] }, { text: "!" }),
      ]),
    ).toEqual(["na <strong>Festa</strong>!"])
  })

  it("wraps an em span in <em>", () => {
    expect(
      renderInlineBlocks([block({ text: "muito", marks: ["em"] })]),
    ).toEqual(["<em>muito</em>"])
  })

  it("escapes HTML special characters in span text", () => {
    expect(renderInlineBlocks([block({ text: "a & <b>" })])).toEqual([
      "a &amp; &lt;b&gt;",
    ])
  })

  it("leaves a {{token}} untouched for the renderer to fill", () => {
    expect(renderInlineBlocks([block({ text: "{{nome}}" })])).toEqual([
      "{{nome}}",
    ])
  })

  it("ignores a mark it does not know, keeping the text", () => {
    expect(
      renderInlineBlocks([block({ text: "site", marks: ["a1b2"] })]),
    ).toEqual(["site"])
  })

  it("returns an empty array for missing blocks", () => {
    expect(renderInlineBlocks(undefined)).toEqual([])
  })
})

describe("unknownBlockVariables", () => {
  it("accepts tokens inside the whitelist", () => {
    expect(unknownBlockVariables([block({ text: "{{nome}}" })], ["nome"])).toEqual(
      [],
    )
  })

  it("flags a token split across spans with a mark, matching the rendered HTML", () => {
    const split = block(
      { text: "{{" },
      { text: "nome", marks: ["strong"] },
      { text: "}}" },
    )

    expect(unknownBlockVariables([split], ["nome"])).toContain(
      "<strong>nome</strong>",
    )
  })
})
