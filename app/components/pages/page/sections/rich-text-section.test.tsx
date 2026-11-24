import { describe, expect, it } from "vitest"
import { renderWithRouter, screen } from "~/test/test-utils"
import { RichTextSection } from "./rich-text-section"

const content = {
  _type: "richTextSection" as const,
  _key: "rich-text",
  title: "Código de conduta",
  body: [
    {
      _type: "block" as const,
      _key: "h",
      style: "h3" as const,
      markDefs: [],
      children: [
        { _type: "span" as const, _key: "s", text: "Consentimento", marks: [] },
      ],
    },
  ],
}

describe("RichTextSection", () => {
  it("renders the Editor's title above the long text", () => {
    renderWithRouter(<RichTextSection content={content} />)

    expect(
      screen.getByRole("heading", { level: 2, name: "Código de conduta" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 3, name: "Consentimento" }),
    ).toBeInTheDocument()
  })

  it("leads the body with its first heading, below the title", () => {
    renderWithRouter(<RichTextSection content={content} />)

    const heading = screen.getByRole("heading", {
      level: 3,
      name: "Consentimento",
    })
    expect(heading.parentElement?.firstElementChild).toBe(heading)
  })

  it("renders no title when the Editor left it empty", () => {
    renderWithRouter(<RichTextSection content={{ ...content, title: null }} />)

    expect(screen.queryByRole("heading", { level: 2 })).toBeNull()
  })
})

describe("RichTextSection paragraph spacing", () => {
  it("spaces paragraphs twice as far apart as the base gap", () => {
    renderWithRouter(
      <RichTextSection
        content={{
          ...content,
          body: [
            {
              _type: "block",
              _key: "p",
              style: "normal",
              markDefs: [],
              children: [
                { _type: "span", _key: "s", text: "Um parágrafo.", marks: [] },
              ],
            },
          ],
        }}
      />,
    )

    expect(screen.getByText("Um parágrafo.").parentElement).toHaveClass(
      "gap-8",
    )
  })
})
