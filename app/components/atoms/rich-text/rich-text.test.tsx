import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"
import type { PortableText } from "~/business/cms/homepage-content.schema"
import { render, renderWithRouter, screen } from "~/test/test-utils"
import { RichText } from "./rich-text"

type Span = { text: string; marks?: string[] }
type MarkDef = { _key: string; _type: string; href: string }

const block = (key: string, spans: Span[], markDefs: MarkDef[] = []) => ({
  _type: "block",
  _key: key,
  style: "normal",
  markDefs,
  children: spans.map((span, index) => ({
    _type: "span",
    _key: `${key}-${index}`,
    text: span.text,
    marks: span.marks ?? [],
  })),
})

const linkValue = (href: string, text: string): PortableText => [
  block(
    "b1",
    [{ text: "Veja " }, { text, marks: ["l1"] }],
    [{ _key: "l1", _type: "link", href }],
  ),
]

describe("RichText", () => {
  it("renders bold text as strong", () => {
    const { container } = renderWithRouter(
      <RichText
        value={[
          block("b1", [
            { text: "Somos " },
            { text: "muito", marks: ["strong"] },
            { text: " diferentes" },
          ]),
        ]}
      />,
    )

    expect(container.querySelector("strong")).toHaveTextContent("muito")
  })

  it("renders italic text as em", () => {
    const { container } = renderWithRouter(
      <RichText
        value={[
          block("b1", [{ text: "organizador de suruba", marks: ["em"] }]),
        ]}
      />,
    )

    expect(container.querySelector("em")).toHaveTextContent(
      "organizador de suruba",
    )
  })

  it("routes an internal link through the client-side router", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={<RichText value={linkValue("/eventos", "os eventos")} />}
          />
          <Route path="/eventos" element={<p>Lista de eventos</p>} />
        </Routes>
      </MemoryRouter>,
    )

    const link = screen.getByRole("link", { name: "os eventos" })
    expect(link).toHaveAttribute("href", "/eventos")
    expect(link).not.toHaveAttribute("target")

    await user.click(link)

    expect(screen.getByText("Lista de eventos")).toBeInTheDocument()
  })

  it("opens an external link in a new tab", () => {
    renderWithRouter(
      <RichText
        value={linkValue("https://instagram.com/positivparty", "Instagram")}
      />,
    )

    const link = screen.getByRole("link", { name: "Instagram" })
    expect(link).toHaveAttribute("href", "https://instagram.com/positivparty")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
  })

  it("renders each block as its own paragraph", () => {
    const { container } = renderWithRouter(
      <RichText
        value={[
          block("b1", [{ text: "Primeiro parágrafo." }]),
          block("b2", [{ text: "Segundo parágrafo." }]),
        ]}
      />,
    )

    const paragraphs = container.querySelectorAll("p")
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]).toHaveTextContent("Primeiro parágrafo.")
    expect(paragraphs[1]).toHaveTextContent("Segundo parágrafo.")
  })

  it("emits no paragraph wrapper when inline", () => {
    const { container } = renderWithRouter(
      <RichText
        inline
        value={[
          block("b1", [
            { text: "Como " },
            { text: "assim", marks: ["strong"] },
            { text: "?" },
          ]),
        ]}
      />,
    )

    expect(container.querySelector("p")).not.toBeInTheDocument()
    expect(container).toHaveTextContent("Como assim?")
    expect(container.querySelector("strong")).toHaveTextContent("assim")
  })
})
