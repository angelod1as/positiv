import { describe, expect, it } from "vitest"

import { markdownToPortableText } from "./markdown-to-portable-text"

function textOf(blocks: ReturnType<typeof markdownToPortableText>) {
  return blocks.map((block) => block.children.map((span) => span.text).join(""))
}

describe("markdownToPortableText", () => {
  it("turns plain text into one paragraph", () => {
    expect(
      markdownToPortableText("Estamos sempre buscando melhorias."),
    ).toEqual([
      {
        _type: "block",
        _key: "b0",
        style: "normal",
        markDefs: [],
        children: [
          {
            _type: "span",
            _key: "b0s0",
            text: "Estamos sempre buscando melhorias.",
            marks: [],
          },
        ],
      },
    ])
  })

  it("starts a new paragraph at every blank line", () => {
    expect(
      textOf(markdownToPortableText("Primeiro.\n\nSegundo.\n\n\nTerceiro.")),
    ).toEqual(["Primeiro.", "Segundo.", "Terceiro."])
  })

  it("marks **bold** text as strong", () => {
    const [block] = markdownToPortableText(
      "para amantes de **não-mono**, e mais",
    )

    expect(block.children).toEqual([
      { _type: "span", _key: "b0s0", text: "para amantes de ", marks: [] },
      { _type: "span", _key: "b0s1", text: "não-mono", marks: ["strong"] },
      { _type: "span", _key: "b0s2", text: ", e mais", marks: [] },
    ])
  })

  it("marks _italic_ text as em", () => {
    const [block] = markdownToPortableText(
      "colocar _organizador de suruba_ no Linkedin",
    )

    expect(block.children[1]).toEqual({
      _type: "span",
      _key: "b0s1",
      text: "organizador de suruba",
      marks: ["em"],
    })
  })

  it("leaves underscores inside a word alone", () => {
    expect(textOf(markdownToPortableText("snake_case_name"))).toEqual([
      "snake_case_name",
    ])
  })

  it("leaves underscores between accented letters alone", () => {
    expect(textOf(markdownToPortableText("pé_de_água"))).toEqual([
      "pé_de_água",
    ])
  })

  it("turns a link into a link annotation", () => {
    const [block] = markdownToPortableText(
      "veja os [próximos eventos](/eventos) agora",
    )

    expect(block.markDefs).toEqual([
      { _type: "link", _key: "b0l0", href: "/eventos" },
    ])
    expect(block.children[1]).toEqual({
      _type: "span",
      _key: "b0s1",
      text: "próximos eventos",
      marks: ["b0l0"],
    })
  })

  it("keeps a paragraph that is entirely bold", () => {
    const [block] = markdownToPortableText(
      "**Não é sobre putaria, é sobre afeto.**",
    )

    expect(block.children).toEqual([
      {
        _type: "span",
        _key: "b0s0",
        text: "Não é sobre putaria, é sobre afeto.",
        marks: ["strong"],
      },
    ])
  })
})
