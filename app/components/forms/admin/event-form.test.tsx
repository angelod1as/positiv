import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { runtimeStorageKey } from "~/components/forms/runtime/persistence"
import { adminEventsCopy } from "~/copy/admin/events"
import paths from "~/lib/paths"
import type { Event } from "~types/database/entities.types"
import { EventForm } from "./event-form"

const navigate = vi.hoisted(() => vi.fn())
const success = vi.hoisted(() => vi.fn())

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()
  return { ...actual, useNavigate: () => navigate }
})

vi.mock("sonner", () => ({ toast: { success } }))

const {
  admin: {
    events: { ADMIN_EVENT_COMMIT, ADMIN_VIEW_EVENT },
  },
} = paths

const formCopy = adminEventsCopy.form
const { labels } = formCopy

const event: Event = {
  id: "event-1",
  title: "Rapa do Tacho",
  emoji: "🎉",
  description: "Para quem sobreviveu ao carnaval",
  location: "Motel Harmony",
  ticket_price: 200,
  total_spots: 60,
  event_type: "bdsm",
  event_status: "Draft",
  created_at: "2026-01-01",
  auto_publish: true,
  time_event_start: "2026-02-01T10:00:00",
  time_event_end: "2026-02-01T23:59:00",
  time_application_start: "2026-01-02T08:00:00",
  time_group_start: "2026-01-28T08:00:00",
  time_group_end: "2026-03-02T22:00:00",
  time_payment_start: "2026-01-11T08:00:00",
  time_payment_end: "2026-01-23T22:00:00",
  listmonk_list_id: null,
  listmonk_list_synced_at: null,
}

const answered = (response: unknown = { ok: true, id: "event-1" }) => {
  const fetchMock = vi.fn().mockResolvedValue({ json: async () => response })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

const bodyOf = (fetchMock: ReturnType<typeof vi.fn>) =>
  JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<
    string,
    unknown
  >

const save = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: formCopy.submit }))

describe("EventForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    answered()
  })

  describe("what it asks for", () => {
    it("asks for everything an event is described by", () => {
      render(<EventForm />)

      expect(screen.getByLabelText(labels.title)).toBeInTheDocument()
      expect(screen.getByLabelText(labels.emoji)).toBeInTheDocument()
      expect(screen.getByLabelText(labels.description)).toBeInTheDocument()
      expect(screen.getByLabelText(labels.location)).toBeInTheDocument()
      expect(screen.getByLabelText(labels.ticket_price)).toBeInTheDocument()
      expect(screen.getByLabelText(labels.total_spots)).toBeInTheDocument()
      expect(screen.getByLabelText(labels.auto_publish)).toBeInTheDocument()
    })

    it("tells the four times apart by name", () => {
      render(<EventForm />)

      expect(screen.getByLabelText(labels.time_group_start)).toBeInTheDocument()
      expect(screen.getByLabelText(labels.time_group_end)).toBeInTheDocument()
      expect(
        screen.getByLabelText(labels.time_payment_start),
      ).toBeInTheDocument()
      expect(screen.getByLabelText(labels.time_payment_end)).toBeInTheDocument()
    })

    it("asks for a date and an hour together", () => {
      render(<EventForm />)

      expect(screen.getByLabelText(labels.time_event_start)).toHaveAttribute(
        "type",
        "datetime-local",
      )
    })

    it("says what the price and the capacity are counted in", () => {
      render(<EventForm />)

      expect(screen.getByText(formCopy.ticketPricePrefix)).toBeInTheDocument()
      expect(screen.getByText(formCopy.totalSpotsSuffix)).toBeInTheDocument()
    })

    it("opens a new event publishing itself", () => {
      render(<EventForm />)

      expect(screen.getByLabelText(labels.auto_publish)).toBeChecked()
    })
  })

  describe("an event it was given", () => {
    it("opens holding what the event says about itself", () => {
      render(<EventForm event={event} />)

      expect(screen.getByLabelText(labels.title)).toHaveValue("Rapa do Tacho")
      expect(screen.getByLabelText(labels.location)).toHaveValue(
        "Motel Harmony",
      )
      expect(screen.getByLabelText(labels.ticket_price)).toHaveValue(200)
    })

    it("cuts the times down to what the control shows", () => {
      render(<EventForm event={event} />)

      expect(screen.getByLabelText(labels.time_event_start)).toHaveValue(
        "2026-02-01T10:00",
      )
    })
  })

  describe("working the dates out", () => {
    it("fills the rest in from the time the event starts", async () => {
      const user = userEvent.setup()
      render(<EventForm />)

      await user.type(
        screen.getByLabelText(labels.time_event_start),
        "2026-02-01T10:00",
      )
      await user.click(
        screen.getByRole("button", { name: formCopy.calculateDates }),
      )

      expect(screen.getByLabelText(labels.time_event_end)).toHaveValue(
        "2026-02-01T23:59",
      )
      expect(screen.getByLabelText(labels.time_application_start)).toHaveValue(
        "2026-01-02T08:00",
      )
      expect(screen.getByLabelText(labels.time_group_start)).toHaveValue(
        "2026-01-28T08:00",
      )
      expect(screen.getByLabelText(labels.time_group_end)).toHaveValue(
        "2026-03-03T22:00",
      )
      expect(screen.getByLabelText(labels.time_payment_start)).toHaveValue(
        "2026-01-11T08:00",
      )
      expect(screen.getByLabelText(labels.time_payment_end)).toHaveValue(
        "2026-01-23T22:00",
      )
    })

    it("asks for a starting time before it works anything out", async () => {
      const user = userEvent.setup()
      render(<EventForm />)

      await user.click(
        screen.getByRole("button", { name: formCopy.calculateDates }),
      )

      expect(screen.getByRole("alert")).toHaveTextContent(
        formCopy.startDateRequired,
      )
      expect(screen.getByLabelText(labels.time_event_end)).toHaveValue("")
    })
  })

  describe("saving", () => {
    it("sends the answers, and the event they belong to", async () => {
      const user = userEvent.setup()
      const fetchMock = answered()
      render(<EventForm event={event} />)

      await save(user)

      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(fetchMock.mock.calls[0][0]).toBe(ADMIN_EVENT_COMMIT)
      expect(bodyOf(fetchMock)).toMatchObject({
        id: "event-1",
        title: "Rapa do Tacho",
        ticket_price: "200",
        auto_publish: true,
      })
    })

    it("says it saved and goes to the event", async () => {
      const user = userEvent.setup()
      render(<EventForm event={event} />)

      await save(user)

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith(ADMIN_VIEW_EVENT("event-1")),
      )
      expect(success).toHaveBeenCalledWith(
        adminEventsCopy.createEdit.saved(true),
      )
    })

    it("goes to the event that was just created", async () => {
      const user = userEvent.setup()
      answered({ ok: true, id: "event-9" })
      render(<EventForm event={event} />)

      await save(user)

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith(ADMIN_VIEW_EVENT("event-9")),
      )
    })

    it("refuses to save what the questions refuse", async () => {
      const user = userEvent.setup()
      const fetchMock = answered()
      render(<EventForm />)

      await save(user)

      expect(fetchMock).not.toHaveBeenCalled()
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0)
    })

    it("shows a refusal under the question it belongs to", async () => {
      const user = userEvent.setup()
      answered({
        ok: false,
        errors: [{ questionId: "emoji", message: "Precisa ser um emoji" }],
      })
      render(<EventForm event={event} />)

      await save(user)

      expect(
        await screen.findByText("Precisa ser um emoji"),
      ).toBeInTheDocument()
      expect(navigate).not.toHaveBeenCalled()
    })
  })

  describe("a draft left half-written", () => {
    it("keeps a new event across a refresh", async () => {
      const user = userEvent.setup()
      render(<EventForm />)

      await user.type(screen.getByLabelText(labels.title), "Rapa do Tacho")

      await waitFor(() =>
        expect(
          sessionStorage.getItem(runtimeStorageKey("admin-event", "novo")),
        ).toContain("Rapa do Tacho"),
      )
    })

    it("keeps no draft of an event that already exists", async () => {
      const user = userEvent.setup()
      render(<EventForm event={event} />)

      await user.type(screen.getByLabelText(labels.title), "!")

      expect(
        Object.keys(sessionStorage).filter((key) =>
          key.startsWith("form-runtime:"),
        ),
      ).toEqual([])
    })
  })
})
