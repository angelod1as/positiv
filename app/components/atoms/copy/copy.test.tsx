import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it } from "vitest"
import { render, renderWithRouter, screen } from "~/test/test-utils"
import { Copy } from "./copy"

describe("Copy", () => {
  it("renders plain text unchanged", () => {
    renderWithRouter(<Copy>Salvar</Copy>)

    expect(screen.getByText("Salvar")).toBeInTheDocument()
  })

  it("renders bold markdown as strong", () => {
    const { container } = renderWithRouter(
      <Copy>Somos **muito** diferentes</Copy>,
    )

    expect(container.querySelector("strong")).toHaveTextContent("muito")
  })

  it("renders italic markdown as em", () => {
    const { container } = renderWithRouter(
      <Copy>_organizador de suruba_</Copy>,
    )

    expect(container.querySelector("em")).toHaveTextContent(
      "organizador de suruba",
    )
  })

  it("renders a blank-line-separated block as separate paragraphs", () => {
    const { container } = renderWithRouter(
      <Copy>{"Primeiro parágrafo.\n\nSegundo parágrafo."}</Copy>,
    )

    expect(container.querySelectorAll("p")).toHaveLength(2)
  })

  it("renders a markdown list without imposing a marker style", () => {
    renderWithRouter(<Copy>{"- Beber água;\n- Seguir as regras;"}</Copy>)

    const list = screen.getByRole("list")
    expect(list.className).toBe("")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  it("renders an ordered list as ol", () => {
    renderWithRouter(<Copy>{"1. Primeiro item\n2. Segundo item"}</Copy>)

    expect(screen.getByRole("list").tagName).toBe("OL")
  })

  it("renders a sub-heading as h4", () => {
    renderWithRouter(<Copy>{"#### Claro, há excessões:"}</Copy>)

    expect(
      screen.getByRole("heading", { level: 4, name: "Claro, há excessões:" }),
    ).toBeInTheDocument()
  })

  it("routes an internal link through the client-side router", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={<Copy>{"Dúvidas? [Fale com a gente](/feedback)."}</Copy>}
          />
          <Route path="/feedback" element={<p>Formulário de feedback</p>} />
        </Routes>
      </MemoryRouter>,
    )

    const link = screen.getByRole("link", { name: "Fale com a gente" })
    expect(link).toHaveAttribute("href", "/feedback")
    expect(link).not.toHaveAttribute("target")
    expect(link).toHaveClass("underline")

    await user.click(link)

    expect(screen.getByText("Formulário de feedback")).toBeInTheDocument()
  })

  it("opens an external link in a new tab", () => {
    renderWithRouter(
      <Copy>{"[Instagram](https://instagram.com/positivparty)"}</Copy>,
    )

    const link = screen.getByRole("link", { name: "Instagram" })
    expect(link).toHaveAttribute("href", "https://instagram.com/positivparty")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
    expect(link).toHaveClass("underline")
  })

  it("emits no paragraph wrapper when inline", () => {
    const { container } = renderWithRouter(<Copy inline>Como **assim**?</Copy>)

    expect(container.querySelector("p")).not.toBeInTheDocument()
    expect(container.querySelector("strong")).toHaveTextContent("assim")
  })

  it("renders a link when inline", () => {
    renderWithRouter(<Copy inline>{"[Site](/sobre)"}</Copy>)

    expect(screen.getByRole("link", { name: "Site" })).toHaveAttribute(
      "href",
      "/sobre",
    )
  })
})
