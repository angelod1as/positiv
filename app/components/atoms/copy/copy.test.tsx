import { describe, expect, it } from "vitest"
import { renderWithRouter, screen } from "~/test/test-utils"
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

  it("renders a markdown list with the site's list classes", () => {
    const { container } = renderWithRouter(
      <Copy>{"- Beber água;\n- Seguir as regras;"}</Copy>,
    )

    const list = container.querySelector("ul")
    expect(list).toHaveClass("list-inside", "list-disc")
    expect(container.querySelectorAll("li")).toHaveLength(2)
  })

  it("renders a sub-heading as h4", () => {
    const { container } = renderWithRouter(
      <Copy>{"#### Claro, há excessões:"}</Copy>,
    )

    expect(container.querySelector("h4")).toHaveTextContent(
      "Claro, há excessões:",
    )
  })

  it("routes an internal link through the client-side router", () => {
    const { container } = renderWithRouter(
      <Copy>{"Dúvidas? [Fale com a gente](/feedback)."}</Copy>,
    )

    const link = container.querySelector("a")
    expect(link).toHaveAttribute("href", "/feedback")
    expect(link).not.toHaveAttribute("target")
  })

  it("opens an external link in a new tab", () => {
    const { container } = renderWithRouter(
      <Copy>{"[Instagram](https://instagram.com/positivparty)"}</Copy>,
    )

    const link = container.querySelector("a")
    expect(link).toHaveAttribute("href", "https://instagram.com/positivparty")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"))
  })

  it("emits no paragraph wrapper when inline", () => {
    const { container } = renderWithRouter(<Copy inline>Como **assim**?</Copy>)

    expect(container.querySelector("p")).not.toBeInTheDocument()
    expect(container.querySelector("strong")).toHaveTextContent("assim")
  })
})
