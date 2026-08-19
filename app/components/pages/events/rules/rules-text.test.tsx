import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderWithRouter } from "~/test/test-utils"
import { RulesText } from "./rules-text"

const EXPECTED_HEADINGS = [
  "🚨 Nenhuma pessoa é obrigada a nada 🚨",
  "🤫 Você não fala sobre quem vai à Positiv 🤫",
  "👍 Apenas SIM é SIM 👍",
  "🥡 A Positiv não é marmitaria 🥡",
  "😷 Proteção e saúde 😷",
  "📸 Sem celular e sem fotos 📸",
  "💪 Experiência intensa 💪",
  "🗑️ Não deixe rastros 🧼🫧",
  "🕺 Não somos uma balada 🪩",
]

describe("RulesText", () => {
  it("renders no accidental code blocks", () => {
    const { container } = renderWithRouter(<RulesText />)

    expect(container.querySelector("pre")).toBeNull()
  })

  it("renders section headings in copy order", () => {
    renderWithRouter(<RulesText />)

    const renderedHeadings = screen
      .getAllByRole("heading", { level: 4 })
      .map((heading) => heading.textContent)
      .filter((text) => EXPECTED_HEADINGS.includes(text ?? ""))

    expect(renderedHeadings).toEqual(EXPECTED_HEADINGS)
  })
})
