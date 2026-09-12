import { describe, expect, it, vi } from "vitest"
import { render, screen } from "~/test/test-utils"
import { eventCardCopy } from "~/copy/events"
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
  ticket_price: 5000,
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
  it("shows the price formatted from cents", () => {
    const { getByText } = render(
      <EventCard event={mockEvent} data-testid="test-card" />,
    )

    expect(getByText("R$ 50,00")).toBeInTheDocument()
  })

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

  it("should not badge a legacy BDSM event", () => {
    const bdsmEvent = { ...mockEvent, event_type: "bdsm" as const }
    render(<EventCard event={bdsmEvent} data-testid="test-card" />)

    expect(screen.queryByText("Edição BDSM")).not.toBeInTheDocument()
  })

  it("shows the registration status of an open event", () => {
    render(<EventCard event={mockEvent} data-testid="test-card" />)

    expect(screen.getByText("Candidaturas abertas")).toBeInTheDocument()
  })

  // The ledger, not the card, decides these: has_paid and active_payment_id
  // both come from event_participant_payments.
  it("says so once the participant has paid", () => {
    render(
      <EventCard
        event={{ ...mockEvent, is_applied: true, has_paid: true }}
        data-testid="test-card"
      />,
    )

    expect(screen.getByText(eventCardCopy.payment.paid)).toBeInTheDocument()
    expect(
      screen.queryByText(eventCardCopy.payment.pending),
    ).not.toBeInTheDocument()
  })

  it("says a charge is waiting when one is open", () => {
    render(
      <EventCard
        event={{ ...mockEvent, is_applied: true, active_payment_id: "pay-1" }}
        data-testid="test-card"
      />,
    )

    expect(screen.getByText(eventCardCopy.payment.pending)).toBeInTheDocument()
    expect(
      screen.queryByText(eventCardCopy.payment.paid),
    ).not.toBeInTheDocument()
  })

  it("says nothing about money when nothing has been charged", () => {
    render(<EventCard event={mockEvent} data-testid="test-card" />)

    expect(
      screen.queryByText(eventCardCopy.payment.pending),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(eventCardCopy.payment.paid),
    ).not.toBeInTheDocument()
  })

  it("shows the registration status of a closed event", () => {
    const closedEvent = {
      ...mockEvent,
      event_status: "Registration Closed" as const,
    }
    render(<EventCard event={closedEvent} data-testid="test-card" />)

    expect(screen.getByText("Candidaturas encerradas")).toBeInTheDocument()
  })
})
