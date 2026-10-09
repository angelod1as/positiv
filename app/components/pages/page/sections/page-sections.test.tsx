import { describe, expect, it } from "vitest"
import { pageFixture } from "~/test/pages-snapshot-fixture"
import { renderWithRouter, screen, waitFor } from "~/test/test-utils"
import type { Event } from "~types/database/entities.types"
import { PageSections } from "./page-sections"

const event = {
  id: "event-1",
  title: "Encontro de primavera",
  description: "Um evento",
  emoji: "🌸",
  time_event_start: "2026-12-25T20:00:00-03:00",
  time_event_end: "2026-12-26T04:00:00-03:00",
  time_application_start: "2026-12-01T10:00:00-03:00",
  time_group_start: null,
  time_group_end: null,
  time_payment_start: null,
  time_payment_end: null,
  location: "São Paulo",
  ticket_price: null,
  event_status: "Registration Open",
  event_type: "regular",
  auto_publish: false,
  created_at: "2026-01-01T00:00:00Z",
  total_spots: null,
  listmonk_list_id: null,
  listmonk_list_synced_at: null,
} satisfies Event

type Page = Awaited<ReturnType<typeof pageFixture>>

const sectionTitles = (page: Page) =>
  page.sections.flatMap((section) =>
    "title" in section && section.title && section._type !== "nextEvents"
      ? [section.title]
      : [],
  )

const renderedSectionTitles = (page: Page) => {
  const titles = sectionTitles(page)
  return screen
    .getAllByRole("heading", { level: 2 })
    .map((heading) => heading.textContent ?? "")
    .filter((text) => titles.includes(text))
}

describe("PageSections", () => {
  it("renders the Sections in the order the Editor placed them", async () => {
    const page = await pageFixture("/")

    renderWithRouter(
      <PageSections
        sections={page.sections}
        events={Promise.resolve([])}
        isLoggedIn={false}
      />,
    )

    await waitFor(() => {
      expect(screen.queryByText("Próximos eventos")).toBeNull()
    })
    expect(renderedSectionTitles(page)).toEqual(sectionTitles(page))
    expect(
      screen.getByRole("img", {
        name: "Imagem de exemplo do ambiente de desenvolvimento",
      }),
    ).toBeInTheDocument()
  })

  it("streams the Next Events into their Section", async () => {
    const page = await pageFixture("/")

    renderWithRouter(
      <PageSections
        sections={page.sections}
        events={Promise.resolve([event])}
        isLoggedIn={false}
      />,
    )

    expect(await screen.findByText(event.title)).toBeInTheDocument()
  })

  it("renders a Page without Next Events and without events to stream", async () => {
    const page = await pageFixture("/sobre/equipe")

    renderWithRouter(
      <PageSections
        sections={page.sections}
        events={undefined}
        isLoggedIn={false}
      />,
    )

    expect(renderedSectionTitles(page)).toEqual(sectionTitles(page))
  })

  it("renders a placeholder in place of an incomplete Section, keeping the valid ones", async () => {
    const page = await pageFixture("/sobre/equipe")

    renderWithRouter(
      <PageSections
        sections={[
          { _type: "placeholder", _key: "broken", missing: ["title"] },
          ...page.sections,
        ]}
        events={undefined}
        isLoggedIn={false}
      />,
    )

    expect(
      screen.getByText("Seção incompleta: falta o título"),
    ).toBeInTheDocument()
    expect(renderedSectionTitles(page)).toEqual(sectionTitles(page))
  })
})
