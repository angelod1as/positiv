import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { rulesFixture } from "~/test/rules-documents"
import { renderWithRouter } from "~/test/test-utils"
import { RulesAndAgreements } from "./rules-and-agreements"

const headings = (level: number) =>
  screen.getAllByRole("heading", { level }).map((h) => h.textContent)

describe("RulesAndAgreements", () => {
  it("is titled Regras e Acordos", () => {
    renderWithRouter(<RulesAndAgreements rules={rulesFixture} />)

    expect(headings(1)).toEqual(["Regras e Acordos"])
  })

  it("puts the general and private rules under Regras and the agreements under Acordos", () => {
    renderWithRouter(<RulesAndAgreements rules={rulesFixture} />)

    expect(headings(2)).toEqual(["Regras", "Acordos"])
    expect(headings(3)).toEqual([
      "👍 Apenas SIM é SIM 👍",
      "🥡 A Positiv não é marmitaria 🥡",
      "⏰ Pontualidade 🕐",
    ])
  })

  it("leaves out a section with no rules", () => {
    renderWithRouter(
      <RulesAndAgreements
        rules={{
          ...rulesFixture,
          agreements: [],
        }}
      />,
    )

    expect(headings(2)).toEqual(["Regras"])
  })

  it("says the rules could not be loaded without them", () => {
    renderWithRouter(<RulesAndAgreements rules={null} />)

    expect(headings(1)).toEqual(["Regras e Acordos"])
    expect(
      screen.getByText(
        "Não conseguimos carregar as regras agora. Recarregue a página em alguns minutos.",
      ),
    ).toBeInTheDocument()
  })
})
