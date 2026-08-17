import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import type { Event } from "~types/database/entities.types"
import { EventsContent } from "./dashboard-page"

const makeEvent = (overrides: Partial<Event>): Event =>
  ({
    id: "event-id",
    title: "Evento",
    description: "Uma festa",
    emoji: "🎉",
    event_status: "Registration Open",
    event_type: "regular",
    location: "São Paulo",
    ticket_price: 120,
    time_event_start: new Date("2030-08-23T22:00:00.000Z").toISOString(),
    is_applied: false,
    ...overrides,
  }) as Event

const renderContent = (props: {
  events: Event[]
  hasEverApplied: boolean
}) => {
  const router = createMemoryRouter(
    [
      {
        path: "/dashboard",
        element: (
          <EventsContent
            events={props.events}
            hasEverApplied={props.hasEverApplied}
          />
        ),
      },
    ],
    { initialEntries: ["/dashboard"] },
  )

  return render(<RouterProvider router={router} />)
}

describe("Dashboard sections", () => {
  it("shows the banner to someone who never applied to an event", () => {
    renderContent({ events: [], hasEverApplied: false })

    expect(
      screen.getByText(
        "Sua conta está pronta — mas ter conta não te coloca em nenhuma festa.",
      ),
    ).toBeInTheDocument()
  })

  it("hides the banner from someone who has applied before", () => {
    renderContent({ events: [], hasEverApplied: true })

    expect(
      screen.queryByText(
        "Sua conta está pronta — mas ter conta não te coloca em nenhuma festa.",
      ),
    ).not.toBeInTheDocument()
  })

  it("always renders the applied section, with an empty state", () => {
    renderContent({ events: [], hasEverApplied: true })

    expect(
      screen.getByRole("heading", { name: "Eventos em que você se inscreveu" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Você não tem nenhuma inscrição no momento."),
    ).toBeInTheDocument()
  })

  it("lists an applied event only in the applied section", () => {
    renderContent({
      events: [
        makeEvent({ id: "applied-event", title: "Festa Inscrita", is_applied: true }),
        makeEvent({ id: "other-event", title: "Festa Disponível" }),
      ],
      hasEverApplied: true,
    })

    expect(screen.getAllByText("Festa Inscrita")).toHaveLength(1)
    expect(screen.getByTestId("event-card-applied")).toHaveTextContent(
      "Festa Inscrita",
    )
    expect(screen.getByTestId("event-card-available")).toHaveTextContent(
      "Festa Disponível",
    )
  })

  it("shows an empty state when there are no available events", () => {
    renderContent({
      events: [makeEvent({ id: "applied-event", is_applied: true })],
      hasEverApplied: true,
    })

    expect(
      screen.getByText("Nenhum evento por aqui no momento."),
    ).toBeInTheDocument()
  })
})
