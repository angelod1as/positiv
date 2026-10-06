import { describe, expect, it } from "vitest"

import { validateValueOf } from "../../test/validate"
import { markdownToLongPortableText } from "./markdown"

describe("markdownToLongPortableText", () => {
  it("turns a plain line into a normal paragraph", () => {
    expect(markdownToLongPortableText("Olá mundo")).toEqual([
      {
        _type: "block",
        _key: "b0",
        style: "normal",
        markDefs: [],
        children: [{ _type: "span", _key: "b0s0", text: "Olá mundo", marks: [] }],
      },
    ])
  })

  it("reads ## as a Título and ### as a Subtítulo", () => {
    const blocks = markdownToLongPortableText("## Título\n\n### Subtítulo")

    expect(blocks.map((block) => block.style)).toEqual(["h2", "h3"])
    expect(blocks[0].children[0].text).toBe("Título")
    expect(blocks[1].children[0].text).toBe("Subtítulo")
  })

  it("reads > as a blockquote", () => {
    const [block] = markdownToLongPortableText("> Uma citação")

    expect(block.style).toBe("blockquote")
    expect(block.children[0].text).toBe("Uma citação")
  })

  it("reads - as a bullet list and 1. as a numbered list, each item at level 1", () => {
    const bullets = markdownToLongPortableText("- um\n- dois")
    const numbers = markdownToLongPortableText("1. um\n2. dois")

    expect(bullets).toMatchObject([
      { style: "normal", listItem: "bullet", level: 1 },
      { style: "normal", listItem: "bullet", level: 1 },
    ])
    expect(bullets.map((block) => block.children[0].text)).toEqual(["um", "dois"])
    expect(numbers).toMatchObject([
      { listItem: "number", level: 1 },
      { listItem: "number", level: 1 },
    ])
  })

  it("marks **bold** as strong and *italic* as em", () => {
    const [block] = markdownToLongPortableText("um **negrito** e *itálico* aqui")

    expect(block.children).toEqual([
      { _type: "span", _key: "b0s0", text: "um ", marks: [] },
      { _type: "span", _key: "b0s1", text: "negrito", marks: ["strong"] },
      { _type: "span", _key: "b0s2", text: " e ", marks: [] },
      { _type: "span", _key: "b0s3", text: "itálico", marks: ["em"] },
      { _type: "span", _key: "b0s4", text: " aqui", marks: [] },
    ])
  })

  it("turns [text](href) into a link annotation for https and internal paths", () => {
    const [block] = markdownToLongPortableText(
      "fale no [WhatsApp](https://wa.me/5511945970336) ou veja os [eventos](/eventos)",
    )

    expect(block.markDefs).toEqual([
      { _type: "link", _key: "b0l0", href: "https://wa.me/5511945970336" },
      { _type: "link", _key: "b0l1", href: "/eventos" },
    ])
    expect(block.children).toEqual([
      { _type: "span", _key: "b0s0", text: "fale no ", marks: [] },
      { _type: "span", _key: "b0s1", text: "WhatsApp", marks: ["b0l0"] },
      { _type: "span", _key: "b0s2", text: " ou veja os ", marks: [] },
      { _type: "span", _key: "b0s3", text: "eventos", marks: ["b0l1"] },
    ])
  })

  it("separates blocks on blank lines and keys them in order", () => {
    const blocks = markdownToLongPortableText(
      "## Título\n\nUm parágrafo.\n\n- um item",
    )

    expect(blocks.map((block) => block._key)).toEqual(["b0", "b1", "b2"])
    expect(blocks.map((block) => block.style)).toEqual([
      "h2",
      "normal",
      "normal",
    ])
    expect(blocks[2].listItem).toBe("bullet")
  })

  it("is deterministic: the same Markdown converts to the same blocks", () => {
    const markdown = "## Título\n\nUm **texto** com [link](/eventos).\n\n- item"

    expect(markdownToLongPortableText(markdown)).toEqual(
      markdownToLongPortableText(markdown),
    )
  })

  it("produces blocks that validate against the longRichText schema", async () => {
    const markdown =
      "## Título\n\n### Subtítulo\n\nUm **parágrafo** com *ênfase* e um [link](https://positivparty.com) e um [interno](/eventos).\n\n> Citação\n\n- bullet um\n- bullet dois\n\n1. número um\n2. número dois"

    expect(
      await validateValueOf("longRichText", markdownToLongPortableText(markdown)),
    ).toEqual([])
  })
})
