import { describe, expect, it } from "vitest"
import {
  type PageSection,
  pageSectionDocumentSchema,
} from "~/business/cms/page.schema"
import { paragraph, sections } from "~/test/page-documents"
import { renderWithRouter, screen, within } from "~/test/test-utils"
import { CalloutSection } from "./callout-section"

type Content = Extract<PageSection, { _type: "callout" }>

const callout = (fields: Record<string, unknown> = {}) => {
  const parsed = pageSectionDocumentSchema.parse({
    ...sections.callout,
    ...fields,
  })
  if (parsed._type !== "callout") throw new Error("Not a callout")
  return parsed satisfies Content
}

describe("CalloutSection", () => {
  it("renders the emoji before the title, then the text", () => {
    renderWithRouter(<CalloutSection content={callout()} />)

    const note = screen.getByRole("note")
    const heading = within(note).getByRole("heading", {
      level: 2,
      name: "Inscrições abertas",
    })
    expect(heading.textContent).toBe("Inscrições abertas")
    expect(heading.previousElementSibling).toHaveTextContent("📣")
    expect(within(note).getByText("Garanta sua vaga até sexta.")).toBeVisible()
  })

  it("keeps the emoji out of the title's accessible name", () => {
    renderWithRouter(<CalloutSection content={callout()} />)

    expect(screen.getByText("📣")).toHaveAttribute("aria-hidden", "true")
  })

  it("puts the emoji before the text when there is no title", () => {
    renderWithRouter(<CalloutSection content={callout({ title: null })} />)

    const note = screen.getByRole("note")
    expect(within(note).queryByRole("heading")).toBeNull()
    expect(note.textContent).toBe("📣Garanta sua vaga até sexta.")
  })

  it("renders the text alone", () => {
    renderWithRouter(
      <CalloutSection content={callout({ title: null, emoji: null })} />,
    )

    expect(screen.getByRole("note").textContent).toBe(
      "Garanta sua vaga até sexta.",
    )
  })

  it("renders a list in the text", () => {
    renderWithRouter(
      <CalloutSection
        content={callout({
          body: [
            { ...paragraph("Leve documento")[0], listItem: "bullet", level: 1 },
          ],
        })}
      />,
    )

    expect(
      within(screen.getByRole("list")).getByRole("listitem"),
    ).toHaveTextContent("Leve documento")
  })

  it.each([
    ["purple", "border-purple"],
    ["blue", "border-blue"],
    ["green", "border-green"],
    ["lightgreen", "border-lightgreen"],
    ["yellow", "border-yellow"],
    ["red", "border-red"],
    ["neutral", "border-border"],
  ])("draws the %s colour", (color, border) => {
    renderWithRouter(<CalloutSection content={callout({ color })} />)

    expect(screen.getByRole("note")).toHaveClass(border)
  })

  it("lets a heading level come from where the callout sits", () => {
    renderWithRouter(
      <CalloutSection content={callout()} headingLevel={3} />,
    )

    expect(
      screen.getByRole("heading", { level: 3, name: "Inscrições abertas" }),
    ).toBeInTheDocument()
  })
})
