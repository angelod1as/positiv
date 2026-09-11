import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import type { EventStatus } from "~types/database/entities.types"
import { adminInvitesCopy } from "~/copy/admin/invites"
import { InviteParticipantSection } from "./invite-participant-section"

const renderSection = (event_status: EventStatus) =>
  render(
    <MemoryRouter>
      <InviteParticipantSection
        eventId="e1"
        eventStatus={event_status}
        invites={[]}
        participants={[]}
      />
    </MemoryRouter>,
  )

describe("the invite section on an event page", () => {
  it("offers the invite once registrations are closed", () => {
    renderSection("Registration Closed")

    expect(
      screen.getByRole("button", { name: adminInvitesCopy.trigger }),
    ).toBeVisible()
  })

  // An invite is consulted only while the event is closed, so anywhere else it
  // is a link that leads nowhere and says nothing about why.
  it.each<EventStatus>([
    "Draft",
    "Scheduled",
    "Registration Open",
    "Completed",
    "Cancelled",
  ])("offers nothing while the event is %s", (event_status) => {
    renderSection(event_status)

    expect(
      screen.queryByRole("button", { name: adminInvitesCopy.trigger }),
    ).not.toBeInTheDocument()
  })
})
