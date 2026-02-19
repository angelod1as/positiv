import { describe, expect, it, vi } from "vitest"
import { render, screen } from "~/test/test-utils"
import type { Event } from "~types/database/entities.types"
import { EventCard } from "./event-card"

const mockEvent: Event = {
  id: "test-event-id",
  title: "Test Event",
  description: "Test Description",
  emoji: "🎉",
  time_event_start: "2025-12-25T10:00:00Z",
  time_event_end: "2025-12-25T12:00:00Z",
  time_application_start: "2025-12-01T00:00:00Z",
  time_group_start: null,
  time_group_end: null,
  time_payment_start: null,
  time_payment_end: null,
  location: "Test Location",
  ticket_price: 50,
  event_status: "Registration Open",
  is_applied: false,
  event_type: "regular",
  auto_publish: false,
  created_at: "2025-01-01T00:00:00Z",
  total_spots: null,
  listmonk_list_id: null,
  listmonk_list_synced_at: null,
}

vi.mock("./event-card-footer", () => ({
  EventCardFooter: ({
    isAdmin,
    eventId,
  }: {
    isAdmin?: boolean
    eventId: string
  }) => (
    <div
      data-testid="event-card-footer"
      data-is-admin={isAdmin}
      data-event-id={eventId}
    />
  ),
}))

describe("EventCard", () => {
  it("should pass isAdmin prop to EventCardFooter when isAdmin is true", () => {
    const { getByTestId } = render(
      <EventCard event={mockEvent} data-testid="test-card" isAdmin={true} />,
    )

    const footer = getByTestId("event-card-footer")
    expect(footer).toHaveAttribute("data-is-admin", "true")
  })

  it("should pass isAdmin as undefined to EventCardFooter when not provided", () => {
    const { getByTestId } = render(
      <EventCard event={mockEvent} data-testid="test-card" />,
    )

    const footer = getByTestId("event-card-footer")
    expect(footer).not.toHaveAttribute("data-is-admin")
  })

  it("should pass eventId to EventCardFooter", () => {
    const { getByTestId } = render(
      <EventCard event={mockEvent} data-testid="test-card" />,
    )

    const footer = getByTestId("event-card-footer")
    expect(footer).toHaveAttribute("data-event-id", "test-event-id")
  })

  it("should render BDSM badge when event_type is bdsm", () => {
    const bdsmEvent = { ...mockEvent, event_type: "bdsm" as const }
    render(<EventCard event={bdsmEvent} data-testid="test-card" />)

    expect(screen.getByText("Edição BDSM")).toBeInTheDocument()
  })

  it("should not render BDSM badge when event_type is regular", () => {
    render(<EventCard event={mockEvent} data-testid="test-card" />)

    expect(screen.queryByText("Edição BDSM")).not.toBeInTheDocument()
  })
})
