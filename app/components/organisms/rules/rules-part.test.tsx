import { describe, expect, it } from "vitest"
import type { Rule } from "~/business/cms/rules.schema"
import { renderWithRouter, screen } from "~/test/test-utils"
import { RulesPart } from "./rules-part"

const paragraph = (text: string) => [
  {
    _type: "block" as const,
    _key: text,
    style: "normal" as const,
    markDefs: [],
    children: [{ _type: "span" as const, _key: "s", text, marks: [] }],
  },
]

const rules: Rule[] = [
  {
    _key: "sim",
    title: "👍 Apenas SIM é SIM 👍",
    body: paragraph("Essa é nossa regra de ouro do rolê."),
    highlight: {
      title: "👀 Olhar tira pedaço, sim! 👀",
      body: paragraph("Ser encarade pode ser muito ruim."),
    },
  },
  {
    _key: "celular",
    title: "📸 Sem celular e sem fotos 📸",
    body: paragraph("Usar o celular é expressamente proibido."),
    highlight: null,
  },
]

describe("RulesPart", () => {
  it("shows the title and the subtitle the Editor wrote above the rules", () => {
    renderWithRouter(
      <RulesPart title="Acordos" subtitle="Para todo mundo" rules={rules} />,
    )

    expect(
      screen.getByRole("heading", { level: 2, name: "Acordos" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Para todo mundo")).toBeInTheDocument()
  })

  it("shows the rules without a heading when the Editor left the title out", () => {
    renderWithRouter(
      <RulesPart title={null} subtitle={null} rules={rules} />,
    )

    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2)
  })

  it("shows every rule's title and text, in order", () => {
    renderWithRouter(<RulesPart title="Regras Gerais" rules={rules} />)

    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["👍 Apenas SIM é SIM 👍", "📸 Sem celular e sem fotos 📸"])
    expect(
      screen.getByText("Usar o celular é expressamente proibido."),
    ).toBeInTheDocument()
  })

  it("divides the rules from each other, leaving the heading's own rule as the only line above the first", () => {
    const { container } = renderWithRouter(
      <RulesPart title="Regras Gerais" rules={rules} />,
    )

    expect(
      container.querySelectorAll('[data-slot="separator-root"]'),
    ).toHaveLength(rules.length - 1)
  })

  it("shows a rule's highlight in an alert", () => {
    renderWithRouter(<RulesPart title="Regras Gerais" rules={rules} />)

    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("👀 Olhar tira pedaço, sim! 👀")
    expect(alert).toHaveTextContent("Ser encarade pode ser muito ruim.")
  })
})
