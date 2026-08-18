import { describe, expect, it } from "vitest"
import { renderWithRouter, screen } from "~/test/test-utils"
import type { Event } from "~types/database/entities.types"
import { HomePageNextEvents } from "./next-events"

const baseEvent: Event = {
  id: "test-event-id",
  title: "Test Event",
  description: "A cool event",
  emoji: "🎉",
  time_event_start: "2025-12-25T20:00:00-03:00",
  time_event_end: "2025-12-26T04:00:00-03:00",
  time_application_start: "2025-12-01T10:00:00-03:00",
  time_group_start: null,
  time_group_end: null,
  time_payment_start: null,
  time_payment_end: null,
  location: "Test Location",
  ticket_price: null,
  event_status: "Registration Open",
  event_type: "regular",
  auto_publish: false,
  created_at: "2025-01-01T00:00:00Z",
  total_spots: null,
  listmonk_list_id: null,
  listmonk_list_synced_at: null,
}

describe("HomePageNextEvents", () => {
  it("should render event title and description", () => {
    renderWithRouter(<HomePageNextEvents events={[baseEvent]} />)

    expect(screen.getByText("Test Event")).toBeInTheDocument()
    expect(screen.getByText("A cool event")).toBeInTheDocument()
  })

  it("should show open registration message when event is open", () => {
    renderWithRouter(<HomePageNextEvents events={[baseEvent]} />)

    expect(screen.getByText("Candidaturas abertas!")).toBeInTheDocument()
  })

  it("should show scheduled message when event is not open", () => {
    const scheduledEvent = { ...baseEvent, event_status: "Scheduled" as const }
    renderWithRouter(<HomePageNextEvents events={[scheduledEvent]} />)

    expect(screen.getByText("Abertura das candidaturas:")).toBeInTheDocument()
  })

  it("should not badge a legacy BDSM event", () => {
    const bdsmEvent = { ...baseEvent, event_type: "bdsm" as const }
    renderWithRouter(<HomePageNextEvents events={[bdsmEvent]} />)

    expect(screen.queryByText("Edição BDSM")).not.toBeInTheDocument()
  })

  it("should render multiple events", () => {
    const events = [
      baseEvent,
      { ...baseEvent, id: "event-2", title: "Second Event" },
    ]
    renderWithRouter(<HomePageNextEvents events={events} />)

    expect(screen.getByText("Test Event")).toBeInTheDocument()
    expect(screen.getByText("Second Event")).toBeInTheDocument()
  })
})
