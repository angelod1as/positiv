import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { PagePlaceholder } from "./page-placeholder"

describe("PagePlaceholder", () => {
  it("names the missing Section field in pt-BR", () => {
    render(<PagePlaceholder variant="section" missing={["title"]} />)

    expect(
      screen.getByText("Seção incompleta: falta o título"),
    ).toBeInTheDocument()
  })

  it("names the missing Header field in pt-BR", () => {
    render(<PagePlaceholder variant="header" missing={["subtitle"]} />)

    expect(
      screen.getByText("Cabeçalho incompleto: falta o subtítulo"),
    ).toBeInTheDocument()
  })

  it("joins several missing fields", () => {
    render(<PagePlaceholder variant="section" missing={["title", "cards"]} />)

    expect(
      screen.getByText("Seção incompleta: falta o título e os cartões"),
    ).toBeInTheDocument()
  })

  it("falls back to a generic label when nothing names the gap", () => {
    render(<PagePlaceholder variant="section" missing={[]} />)

    expect(
      screen.getByText("Seção incompleta: falta conteúdo obrigatório"),
    ).toBeInTheDocument()
  })
})
