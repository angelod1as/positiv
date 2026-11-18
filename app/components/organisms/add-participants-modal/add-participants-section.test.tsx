import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import type { EventStatus } from "~types/database/entities.types"
import { adminAddParticipantsCopy } from "~/copy/admin/add-participants"
import { AddParticipantsSection } from "./add-participants-section"

const renderSection = (eventStatus: EventStatus, canAdd = true) =>
  render(
    <MemoryRouter>
      <AddParticipantsSection
        eventId="e1"
        eventStatus={eventStatus}
        canAdd={canAdd}
        onAdded={() => {}}
      />
    </MemoryRouter>,
  )

const trigger = () =>
  screen.queryByRole("button", { name: adminAddParticipantsCopy.trigger })

describe("the add participants section on an event page", () => {
  it.each<EventStatus>([
    "Scheduled",
    "Registration Open",
    "Registration Closed",
    "Completed",
  ])("offers the button while the event is %s", (eventStatus) => {
    renderSection(eventStatus)

    expect(trigger()).toBeVisible()
  })

  it.each<EventStatus>(["Draft", "Cancelled"])(
    "offers nothing while the event is %s",
    (eventStatus) => {
      renderSection(eventStatus)

      expect(trigger()).not.toBeInTheDocument()
    },
  )

  it("offers nothing to someone without the permission", () => {
    renderSection("Registration Open", false)

    expect(trigger()).not.toBeInTheDocument()
  })
})
