import { describe, expect, it } from "vitest"
import type { LongPortableText } from "~/business/cms/homepage-content.schema"
import { renderWithRouter, screen } from "~/test/test-utils"
import { LongRichText } from "./rich-text"

type Block = LongPortableText[number]

const block = (
  key: string,
  text: string,
  extra: Partial<Pick<Block, "style" | "listItem" | "level">> = {},
): Block => ({
  _type: "block",
  _key: key,
  style: "normal",
  markDefs: [],
  children: [{ _type: "span", _key: `${key}-s`, text, marks: [] }],
  ...extra,
})

describe("LongRichText", () => {
  it("renders headings at the levels the Editor chose", () => {
    renderWithRouter(
      <LongRichText
        value={[
          block("h2", "Consentimento", { style: "h2" }),
          block("h3", "Antes do evento", { style: "h3" }),
        ]}
      />,
    )

    expect(
      screen.getByRole("heading", { level: 2, name: "Consentimento" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 3, name: "Antes do evento" }),
    ).toBeInTheDocument()
  })

  it("renders paragraphs and quotes", () => {
    const { container } = renderWithRouter(
      <LongRichText
        value={[
          block("p", "Um parágrafo."),
          block("q", "Uma citação.", { style: "blockquote" }),
        ]}
      />,
    )

    expect(container.querySelector("p")).toHaveTextContent("Um parágrafo.")
    expect(container.querySelector("blockquote")).toHaveTextContent(
      "Uma citação.",
    )
  })

  it("renders bullet and numbered lists", () => {
    renderWithRouter(
      <LongRichText
        value={[
          block("b1", "Pergunte antes de tocar.", {
            listItem: "bullet",
            level: 1,
          }),
          block("b2", "Não é não.", { listItem: "bullet", level: 1 }),
          block("n1", "Chegue no horário.", { listItem: "number", level: 1 }),
        ]}
      />,
    )

    const [bullets, numbers] = screen.getAllByRole("list")
    expect(bullets.tagName).toBe("UL")
    expect(bullets.querySelectorAll("li")).toHaveLength(2)
    expect(numbers.tagName).toBe("OL")
    expect(numbers).toHaveTextContent("Chegue no horário.")
  })

  it("renders bold text and links as short text does", () => {
    renderWithRouter(
      <LongRichText
        value={[
          {
            ...block("p", ""),
            markDefs: [{ _type: "link", _key: "l1", href: "/eventos" }],
            children: [
              { _type: "span", _key: "s1", text: "negrito", marks: ["strong"] },
              { _type: "span", _key: "s2", text: "os eventos", marks: ["l1"] },
            ],
          },
        ]}
      />,
    )

    expect(screen.getByText("negrito").tagName).toBe("STRONG")
    expect(screen.getByRole("link", { name: "os eventos" })).toHaveAttribute(
      "href",
      "/eventos",
    )
  })
})
