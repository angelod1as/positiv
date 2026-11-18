import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
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

  it("opens the modal afresh, without the last results", async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          results: [
            {
              id: "p1",
              full_name: "Maria Silva",
              social_name: null,
              is_participant: false,
            },
          ],
        }) as Response,
      )
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          outcomes: [{ profileId: "p1", outcome: "added" }],
        }) as Response,
      )
    renderSection("Registration Open")
    const { modal } = adminAddParticipantsCopy

    await user.click(trigger() as HTMLElement)
    await user.type(screen.getByLabelText(modal.searchLabel), "maria")
    await user.click(await screen.findByRole("button", { name: modal.select }))
    await user.click(screen.getByRole("button", { name: modal.submit(1) }))
    await screen.findByRole("region", { name: modal.resultsTitle })

    await user.keyboard("{Escape}")
    await user.click(trigger() as HTMLElement)

    expect(
      screen.queryByRole("region", { name: modal.resultsTitle }),
    ).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it("offers nothing to someone without the permission", () => {
    renderSection("Registration Open", false)

    expect(trigger()).not.toBeInTheDocument()
  })
})
