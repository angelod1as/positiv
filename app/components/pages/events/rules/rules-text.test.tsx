import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { rulesCopy } from "~/copy/events"
import { rulesFixture } from "~/test/rules-documents"
import { renderWithRouter } from "~/test/test-utils"
import { RulesText } from "./rules-text"

describe("RulesText", () => {
  it("renders no accidental code blocks", () => {
    const { container } = renderWithRouter(<RulesText rules={rulesFixture} />)

    expect(container.querySelector("pre")).toBeNull()
  })

  it("shows Regras Gerais, Acordos and Regras Privadas, in that order", () => {
    renderWithRouter(<RulesText rules={rulesFixture} />)

    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(["Regras Gerais", "Acordos", "Regras Privadas"])
    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "👍 Apenas SIM é SIM 👍",
      "⏰ Pontualidade 🕐",
      "🥡 A Positiv não é marmitaria 🥡",
    ])
  })

  it("keeps the introduction and says the rules are missing without them", () => {
    renderWithRouter(<RulesText rules={null} />)

    expect(
      screen.getByRole("heading", { level: 1, name: rulesCopy.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(rulesCopy.unavailable)).toBeInTheDocument()
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
  })
})
