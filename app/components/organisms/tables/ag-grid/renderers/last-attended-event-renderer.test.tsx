import { render, screen } from "@testing-library/react"
import type { ICellRendererParams } from "ag-grid-community"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { LastAttendedEventRenderer } from "./last-attended-event-renderer"

interface LastAttendedEventData {
  last_attended_event_id?: string | null
  last_attended_event_title?: string | null
  last_attended_event_date?: string | null
  profile_id?: string | null
}

function createMockParams(data: LastAttendedEventData): ICellRendererParams {
  return {
    value: data.last_attended_event_title,
    valueFormatted: String(data.last_attended_event_title ?? ""),
    data,
    node: {} as ICellRendererParams["node"],
    colDef: { field: "last_attended_event" },
    column: {} as ICellRendererParams["column"],
    api: {} as ICellRendererParams["api"],
    context: {},
    getValue: () => data.last_attended_event_title,
    setValue: () => {},
    formatValue: () => String(data.last_attended_event_title ?? ""),
    refreshCell: () => {},
    eGridCell: document.createElement("div"),
    eParentOfValue: document.createElement("div"),
    registerRowDragger: () => {},
    setTooltip: () => {},
  }
}

function renderWithRouter(params: ICellRendererParams) {
  return render(
    <MemoryRouter>
      <LastAttendedEventRenderer {...params} />
    </MemoryRouter>
  )
}

describe("LastAttendedEventRenderer", () => {
  describe("when last attended event data is present", () => {
    it("renders the event title as a link with formatted date", () => {
      const params = createMockParams({
        last_attended_event_id: "event-123",
        last_attended_event_title: "Retiro de Verão",
        last_attended_event_date: "2024-06-15T10:00:00Z",
        profile_id: "profile-456",
      })

      renderWithRouter(params)

      expect(screen.getByText("Retiro de Verão")).toBeInTheDocument()
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/admin/eventos/event-123/participantes/profile-456"
      )
    })

    it("displays the formatted date below the title", () => {
      const params = createMockParams({
        last_attended_event_id: "event-123",
        last_attended_event_title: "Retiro de Verão",
        last_attended_event_date: "2024-06-15T10:00:00Z",
        profile_id: "profile-456",
      })

      renderWithRouter(params)

      expect(screen.getByText("15/06/24")).toBeInTheDocument()
    })

    it("truncates long titles to 20 characters with ellipsis", () => {
      const longTitle = "Retiro de Verão 2024 - Edição Especial de Aniversário"
      const params = createMockParams({
        last_attended_event_id: "event-123",
        last_attended_event_title: longTitle,
        last_attended_event_date: "2024-06-15T10:00:00Z",
        profile_id: "profile-456",
      })

      renderWithRouter(params)

      expect(screen.getByText("Retiro de Verão 2024…")).toBeInTheDocument()
      expect(screen.queryByText(longTitle)).not.toBeInTheDocument()
    })
  })

  describe("when last attended event data is missing", () => {
    it("returns dash when title is null", () => {
      const params = createMockParams({
        last_attended_event_id: "event-123",
        last_attended_event_title: null,
        last_attended_event_date: "2024-06-15T10:00:00Z",
        profile_id: "profile-456",
      })

      renderWithRouter(params)

      expect(screen.getByText("-")).toBeInTheDocument()
    })

    it("returns dash when date is null", () => {
      const params = createMockParams({
        last_attended_event_id: "event-123",
        last_attended_event_title: "Retiro de Verão",
        last_attended_event_date: null,
        profile_id: "profile-456",
      })

      renderWithRouter(params)

      expect(screen.getByText("-")).toBeInTheDocument()
    })

    it("returns dash when both title and date are missing", () => {
      const params = createMockParams({
        last_attended_event_id: null,
        last_attended_event_title: null,
        last_attended_event_date: null,
        profile_id: null,
      })

      renderWithRouter(params)

      expect(screen.getByText("-")).toBeInTheDocument()
    })
  })

  describe("when link data is incomplete", () => {
    it("renders title without link when event_id is missing", () => {
      const params = createMockParams({
        last_attended_event_id: null,
        last_attended_event_title: "Retiro de Verão",
        last_attended_event_date: "2024-06-15T10:00:00Z",
        profile_id: "profile-456",
      })

      renderWithRouter(params)

      expect(screen.getByText("Retiro de Verão")).toBeInTheDocument()
      expect(screen.queryByRole("link")).not.toBeInTheDocument()
    })

    it("renders title without link when profile_id is missing", () => {
      const params = createMockParams({
        last_attended_event_id: "event-123",
        last_attended_event_title: "Retiro de Verão",
        last_attended_event_date: "2024-06-15T10:00:00Z",
        profile_id: null,
      })

      renderWithRouter(params)

      expect(screen.getByText("Retiro de Verão")).toBeInTheDocument()
      expect(screen.queryByRole("link")).not.toBeInTheDocument()
    })
  })
})
