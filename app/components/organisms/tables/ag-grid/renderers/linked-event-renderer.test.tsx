import { render, screen } from "@testing-library/react"
import type { ICellRendererParams } from "ag-grid-community"
import { describe, expect, it } from "vitest"
import { MemoryRouter } from "react-router"
import { LinkedEventRenderer } from "./linked-event-renderer"

interface MockRowData {
  event_id?: string | null
  profile_id?: string | null
  event_emoji?: string | null
  event_title?: string | null
  time_event_start?: string | null
}

function createMockParams(rowData: MockRowData): ICellRendererParams {
  return {
    value: rowData.event_title,
    valueFormatted: String(rowData.event_title ?? ""),
    data: rowData,
    node: {} as ICellRendererParams["node"],
    colDef: { field: "event_title" },
    column: {} as ICellRendererParams["column"],
    api: {} as ICellRendererParams["api"],
    context: {},
    getValue: () => rowData.event_title ?? "",
    setValue: () => {},
    formatValue: () => String(rowData.event_title ?? ""),
    refreshCell: () => {},
    eGridCell: document.createElement("div"),
    eParentOfValue: document.createElement("div"),
    registerRowDragger: () => {},
    setTooltip: () => {},
  }
}

function renderWithRouter(component: React.ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>)
}

describe("LinkedEventRenderer", () => {
  describe("when event_id and profile_id are provided", () => {
    it("renders event title as link", () => {
      const params = createMockParams({
        event_id: "event-123",
        profile_id: "profile-456",
        event_emoji: "🎉",
        event_title: "Test Event",
        time_event_start: "2025-01-15T18:00:00Z",
      })

      renderWithRouter(<LinkedEventRenderer {...params} />)

      const link = screen.getByRole("link")
      expect(link).toBeInTheDocument()
      expect(link).toHaveTextContent("🎉 Test Event")
    })

    it("links to correct participant view path", () => {
      const params = createMockParams({
        event_id: "event-123",
        profile_id: "profile-456",
        event_emoji: "🎉",
        event_title: "Test Event",
        time_event_start: "2025-01-15T18:00:00Z",
      })

      renderWithRouter(<LinkedEventRenderer {...params} />)

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute(
        "href",
        "/admin/eventos/event-123/participantes/profile-456"
      )
    })

    it("displays formatted date", () => {
      const params = createMockParams({
        event_id: "event-123",
        profile_id: "profile-456",
        event_emoji: "🎉",
        event_title: "Test Event",
        time_event_start: "2025-01-15T18:00:00Z",
      })

      renderWithRouter(<LinkedEventRenderer {...params} />)

      expect(screen.getByText(/15 de janeiro de 2025/)).toBeInTheDocument()
    })
  })

  describe("when event_id or profile_id is missing", () => {
    it("renders text without link when event_id is missing", () => {
      const params = createMockParams({
        event_id: null,
        profile_id: "profile-456",
        event_emoji: "🎉",
        event_title: "Test Event",
        time_event_start: "2025-01-15T18:00:00Z",
      })

      renderWithRouter(<LinkedEventRenderer {...params} />)

      expect(screen.queryByRole("link")).not.toBeInTheDocument()
      expect(screen.getByText("🎉 Test Event")).toBeInTheDocument()
    })

    it("renders text without link when profile_id is missing", () => {
      const params = createMockParams({
        event_id: "event-123",
        profile_id: null,
        event_emoji: "🎉",
        event_title: "Test Event",
        time_event_start: "2025-01-15T18:00:00Z",
      })

      renderWithRouter(<LinkedEventRenderer {...params} />)

      expect(screen.queryByRole("link")).not.toBeInTheDocument()
      expect(screen.getByText("🎉 Test Event")).toBeInTheDocument()
    })
  })

  describe("title truncation", () => {
    it("truncates long titles to 20 characters", () => {
      const params = createMockParams({
        event_id: "event-123",
        profile_id: "profile-456",
        event_emoji: "🎉",
        event_title: "This is a very long event title that exceeds twenty characters",
        time_event_start: "2025-01-15T18:00:00Z",
      })

      renderWithRouter(<LinkedEventRenderer {...params} />)

      const link = screen.getByRole("link")
      expect(link).toHaveTextContent("🎉 This is a very long …")
    })

    it("does not truncate short titles", () => {
      const params = createMockParams({
        event_id: "event-123",
        profile_id: "profile-456",
        event_emoji: "🎉",
        event_title: "Short Title",
        time_event_start: "2025-01-15T18:00:00Z",
      })

      renderWithRouter(<LinkedEventRenderer {...params} />)

      const link = screen.getByRole("link")
      expect(link).toHaveTextContent("🎉 Short Title")
    })
  })

  describe("edge cases", () => {
    it("renders nothing when event_title is null", () => {
      const params = createMockParams({
        event_id: "event-123",
        profile_id: "profile-456",
        event_emoji: "🎉",
        event_title: null,
        time_event_start: "2025-01-15T18:00:00Z",
      })

      const { container } = renderWithRouter(<LinkedEventRenderer {...params} />)

      expect(container).toBeEmptyDOMElement()
    })

    it("handles missing emoji gracefully", () => {
      const params = createMockParams({
        event_id: "event-123",
        profile_id: "profile-456",
        event_emoji: null,
        event_title: "Test Event",
        time_event_start: "2025-01-15T18:00:00Z",
      })

      renderWithRouter(<LinkedEventRenderer {...params} />)

      const link = screen.getByRole("link")
      expect(link).toHaveTextContent("Test Event")
    })

    it("handles missing date gracefully", () => {
      const params = createMockParams({
        event_id: "event-123",
        profile_id: "profile-456",
        event_emoji: "🎉",
        event_title: "Test Event",
        time_event_start: null,
      })

      renderWithRouter(<LinkedEventRenderer {...params} />)

      expect(screen.getByRole("link")).toBeInTheDocument()
    })
  })
})
