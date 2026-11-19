import { describe, expect, it } from "vitest"
import {
  type PageSection,
  pageSectionDocumentSchema,
} from "~/business/cms/page.schema"
import { sections } from "~/test/page-documents"
import { renderWithRouter, screen } from "~/test/test-utils"
import { SideBySideSection } from "./side-by-side-section"

type Content = Extract<PageSection, { _type: "sideBySide" }>

const sideBySide = (fields: Record<string, unknown> = {}) => {
  const parsed = pageSectionDocumentSchema.parse({
    ...sections.sideBySide,
    ...fields,
  })
  if (parsed._type !== "sideBySide") throw new Error("Not a sideBySide")
  return parsed satisfies Content
}

const items = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...sections.callout,
    _key: `item-${index}`,
    title: `Bloco ${index + 1}`,
  }))

describe("SideBySideSection", () => {
  it("renders the section title above every callout", () => {
    renderWithRouter(<SideBySideSection content={sideBySide()} />)

    expect(
      screen.getByRole("heading", { level: 2, name: "Antes de ir" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { level: 3, name: "Ingresso" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("note")).toHaveLength(2)
  })

  it("lifts the callout titles to level 2 when there is no section title", () => {
    renderWithRouter(
      <SideBySideSection
        content={sideBySide({ title: null, items: items(2) })}
      />,
    )

    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(["Bloco 1", "Bloco 2"])
  })

  it.each([
    [2, "lg:grid-cols-2"],
    [3, "lg:grid-cols-3"],
    [4, "lg:grid-cols-4"],
  ])("puts %s callouts in one row on a wide screen", (count, columns) => {
    renderWithRouter(
      <SideBySideSection content={sideBySide({ items: items(count) })} />,
    )

    const list = screen.getByRole("list")
    expect(list).toHaveClass(columns)
    expect(list).toHaveClass("grid-cols-1", "sm:grid-cols-2")
    expect(screen.getAllByRole("listitem")).toHaveLength(count)
  })
})
