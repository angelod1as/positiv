import { describe, expect, it } from "vitest"
import type { PageSection } from "~/business/cms/page.schema"
import type { Rule } from "~/business/cms/rules.schema"
import { paragraph } from "~/test/page-documents"
import { renderWithRouter, screen } from "~/test/test-utils"
import { RulesSection } from "./rules-section"

type Content = Extract<PageSection, { _type: "rulesSection" }>

const rule = (title: string): Rule => ({
  _key: title,
  title,
  body: paragraph("Texto.") as Rule["body"],
  highlight: null,
})

const content = (fields: Partial<Content>): Content => ({
  _type: "rulesSection",
  _key: "rules",
  part: "generalRules",
  rules: [rule("👍 Apenas SIM é SIM 👍")],
  ...fields,
})

describe("RulesSection", () => {
  it("shows the title and subtitle the Editor wrote on the block", () => {
    renderWithRouter(
      <RulesSection
        content={content({ title: "Regras da casa", subtitle: "Leia antes" })}
        privateRules={null}
      />,
    )

    expect(
      screen.getByRole("heading", { level: 2, name: "Regras da casa" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Leia antes")).toBeInTheDocument()
  })

  it("shows no heading when the block has no title", () => {
    renderWithRouter(
      <RulesSection content={content({})} privateRules={null} />,
    )

    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
  })

  it("shows the rules the snapshot joined for a public part", () => {
    renderWithRouter(
      <RulesSection content={content({})} privateRules={null} />,
    )

    expect(
      screen.getByRole("heading", { level: 3, name: "👍 Apenas SIM é SIM 👍" }),
    ).toBeInTheDocument()
  })

  it("shows the Regras Privadas the loader read for a signed-in visitor", () => {
    renderWithRouter(
      <RulesSection
        content={content({
          part: "privateRules",
          rules: null,
          title: "Regras Privadas",
        })}
        privateRules={[rule("🥡 A Positiv não é marmitaria 🥡")]}
      />,
    )

    expect(
      screen.getByRole("heading", { level: 2, name: "Regras Privadas" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "🥡 A Positiv não é marmitaria 🥡",
      }),
    ).toBeInTheDocument()
  })

  it("shows nothing of the Regras Privadas without rules from the loader", () => {
    const { container } = renderWithRouter(
      <RulesSection
        content={content({ part: "privateRules", rules: null })}
        privateRules={null}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("shows nothing before the Rules are first published", () => {
    const { container } = renderWithRouter(
      <RulesSection content={content({ rules: null })} privateRules={null} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
