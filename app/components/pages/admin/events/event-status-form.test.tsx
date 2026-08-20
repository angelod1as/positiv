import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { adminEventsCopy } from "~/copy/admin/events"
import paths from "~/lib/paths"
import { EventStatusForm } from "./event-status-form"

const revalidate = vi.hoisted(() => vi.fn())
const navigate = vi.hoisted(() => vi.fn())
const success = vi.hoisted(() => vi.fn())
const error = vi.hoisted(() => vi.fn())

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return {
    ...actual,
    useNavigate: () => navigate,
    useRevalidator: () => ({ revalidate, state: "idle" }),
  }
})

vi.mock("sonner", () => ({ toast: { success, error } }))

const {
  admin: {
    events: { ADMIN_EVENT_STATUS_COMMIT },
  },
} = paths

const statusCopy = adminEventsCopy.statusForm
const toasts = adminEventsCopy.toasts

const answered = (response: unknown = { ok: true }) => {
  const fetchMock = vi.fn().mockResolvedValue({ json: async () => response })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const draw = (props: Partial<Parameters<typeof EventStatusForm>[0]> = {}) =>
  render(
    <EventStatusForm
      id="event-1"
      event_status="Draft"
      auto_publish={false}
      time_application_start={null}
      {...props}
    />,
  )

const choose = async (
  user: ReturnType<typeof userEvent.setup>,
  status: string,
) => user.selectOptions(screen.getByLabelText(statusCopy.label), status)

describe("EventStatusForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    answered()
  })

  it("opens on the status the event is in", () => {
    draw({ event_status: "Scheduled" })

    expect(screen.getByLabelText(statusCopy.label)).toHaveValue("Scheduled")
  })

  it("saves the moment another status is chosen", async () => {
    const user = userEvent.setup()
    const fetchMock = answered()
    draw()

    await choose(user, "Completed")

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toBe(ADMIN_EVENT_STATUS_COMMIT("event-1"))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      event_status: "Completed",
    })
  })

  it("says it saved and reads the event again", async () => {
    const user = userEvent.setup()
    draw()

    await choose(user, "Completed")

    await waitFor(() => expect(success).toHaveBeenCalledWith(toasts.statusUpdated))
    expect(revalidate).toHaveBeenCalled()
  })

  it("takes a second change, and a third", async () => {
    const user = userEvent.setup()
    const fetchMock = answered()
    draw()

    await choose(user, "Scheduled")
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    await choose(user, "Completed")
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it("says when the save was refused, in the words the server used", async () => {
    const user = userEvent.setup()
    answered({ ok: false, errors: [], message: "Evento não encontrado" })
    draw()

    await choose(user, "Completed")

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith("Evento não encontrado"),
    )
  })

  it("says when the save was refused for no reason it was given", async () => {
    const user = userEvent.setup()
    answered({ ok: false, errors: [] })
    draw()

    await choose(user, "Completed")

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(toasts.statusUpdateFailed),
    )
  })

  it("shows the status the event is in again, not the one that was refused", async () => {
    const user = userEvent.setup()
    answered({ ok: false, errors: [] })
    draw({ event_status: "Draft" })

    await choose(user, "Completed")

    await waitFor(() =>
      expect(screen.getByLabelText(statusCopy.label)).toHaveValue("Draft"),
    )
  })

  describe("what it says about publishing", () => {
    it("says when the event will publish itself", () => {
      draw({
        event_status: "Scheduled",
        auto_publish: true,
        time_application_start: "2099-01-01T08:00:00",
      })

      expect(screen.getByText(statusCopy.scheduledTitle)).toBeInTheDocument()
    })

    it("says when the event is only waiting to be published", () => {
      draw({
        event_status: "Scheduled",
        auto_publish: true,
        time_application_start: "2000-01-01T08:00:00",
      })

      expect(screen.getByText(statusCopy.awaitingTitle)).toBeInTheDocument()
    })

    it("says when publishing is somebody's job", () => {
      draw({ event_status: "Scheduled", auto_publish: false })

      expect(screen.getByText(statusCopy.manualTitle)).toBeInTheDocument()
    })

    it("says nothing about publishing while the event is a draft", () => {
      draw({ event_status: "Draft", auto_publish: true })

      expect(screen.queryByText(statusCopy.manualTitle)).not.toBeInTheDocument()
      expect(
        screen.queryByText(statusCopy.scheduledTitle),
      ).not.toBeInTheDocument()
    })
  })
})
