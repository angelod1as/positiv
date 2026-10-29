import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { portableTextSchema } from "~/business/cms/content.schema"
import type { PageSection } from "~/business/cms/page.schema"
import { homepageCopy } from "~/copy/homepage"
import { paragraph } from "~/test/page-documents"
import { pageFixture } from "~/test/pages-snapshot-fixture"
import { renderWithRouter, screen, waitFor } from "~/test/test-utils"
import type { Event } from "~types/database/entities.types"
import { PageSections } from "./page-sections"

const { mockTrack } = vi.hoisted(() => ({ mockTrack: vi.fn() }))

vi.mock("~/lib/hooks/use-analytics", () => ({
  useAnalytics: () => ({ track: mockTrack }),
}))

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
        page={page.address}
        sections={page.sections}
        events={Promise.resolve([])}
        isLoggedIn={false}
      />,
    )

    await waitFor(() => {
      expect(screen.queryByTestId("homepage-next-events-skeleton")).toBeNull()
    })
    expect(renderedSectionTitles(page)).toEqual(sectionTitles(page))
    expect(
      screen.getByRole("img", {
        name: "Imagem de exemplo do ambiente de desenvolvimento",
      }),
    ).toBeInTheDocument()
  })

  it("shows the coming-soon notice when no events are open", async () => {
    const page = await pageFixture("/")

    renderWithRouter(
      <PageSections
        page={page.address}
        sections={page.sections}
        events={Promise.resolve([])}
        isLoggedIn={false}
      />,
    )

    expect(
      await screen.findByText(homepageCopy.nextEvents.empty),
    ).toBeInTheDocument()
  })

  it("hides the Next Events Section when the events fail to load", async () => {
    const page = await pageFixture("/")

    renderWithRouter(
      <PageSections
        page={page.address}
        sections={page.sections}
        events={Promise.resolve(undefined)}
        isLoggedIn={false}
      />,
    )

    await waitFor(() => {
      expect(screen.queryByTestId("homepage-next-events-skeleton")).toBeNull()
    })
    expect(screen.queryByText(homepageCopy.nextEvents.empty)).toBeNull()
    expect(
      screen.queryByRole("heading", { level: 2, name: "Próximos eventos" }),
    ).toBeNull()
  })

  it("streams the Next Events into their Section", async () => {
    const page = await pageFixture("/")

    renderWithRouter(
      <PageSections
        page={page.address}
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
        page={page.address}
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
        page={page.address}
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

  describe("click tracking", () => {
    beforeEach(() => {
      mockTrack.mockClear()
    })

    const ctaBanner: PageSection = {
      _type: "ctaBanner",
      _key: "cta-banner",
      title: "Não perca nossos próximos eventos",
      body: portableTextSchema.parse(
        paragraph("Faça login para se inscrever."),
      ),
    }

    const richTextWithLink: PageSection = {
      _type: "richTextSection",
      _key: "rich-text",
      title: "Código de conduta",
      body: [
        {
          _type: "block",
          _key: "b1",
          style: "normal",
          markDefs: [{ _type: "link", _key: "m1", href: "/eventos" }],
          children: [
            { _type: "span", _key: "s1", text: "Veja ", marks: [] },
            { _type: "span", _key: "s2", text: "os eventos", marks: ["m1"] },
          ],
        },
      ],
    }

    const renderSections = (sections: PageSection[]) =>
      renderWithRouter(
        <PageSections
          page="/sobre"
          sections={sections}
          events={undefined}
          isLoggedIn={false}
        />,
      )

    it("records a click on a Section's CTA with the Page and its label", async () => {
      const user = userEvent.setup()
      renderSections([ctaBanner])

      await user.click(
        screen.getByRole("link", { name: homepageCopy.ctaBanner.loggedOutCta }),
      )

      expect(mockTrack).toHaveBeenCalledWith("page_cta_clicked", {
        page: "/sobre",
        section: "ctaBanner",
        label: homepageCopy.ctaBanner.loggedOutCta,
      })
    })

    it("records a link an Editor adds to a Section with no code change", async () => {
      const user = userEvent.setup()
      renderSections([richTextWithLink])

      await user.click(screen.getByRole("link", { name: "os eventos" }))

      expect(mockTrack).toHaveBeenCalledWith("page_cta_clicked", {
        page: "/sobre",
        section: "richTextSection",
        label: "os eventos",
      })
    })

    it("records nothing for a click outside a link", async () => {
      const user = userEvent.setup()
      renderSections([richTextWithLink])

      await user.click(screen.getByText("Código de conduta"))

      expect(mockTrack).not.toHaveBeenCalled()
    })
  })
})
