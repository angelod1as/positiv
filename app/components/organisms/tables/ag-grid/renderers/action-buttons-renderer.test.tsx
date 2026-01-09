import type { ICellRendererParams } from "ag-grid-community"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { ActionButtonsRenderer } from "./action-buttons-renderer"

interface ActionButtonsRowData {
  profile_id?: string | null
}

interface ActionButtonsContext {
  eventId?: string
}

function createMockParams(
  data: ActionButtonsRowData,
  context: ActionButtonsContext = {},
): ICellRendererParams {
  return {
    value: null,
    valueFormatted: "",
    data,
    node: {} as ICellRendererParams["node"],
    colDef: { field: "actions" },
    column: {} as ICellRendererParams["column"],
    api: {} as ICellRendererParams["api"],
    context,
    getValue: () => null,
    setValue: () => {},
    formatValue: () => "",
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
      <ActionButtonsRenderer {...params} />
    </MemoryRouter>,
  )
}

describe("ActionButtonsRenderer", () => {
  describe("when eventId and profile_id are present", () => {
    it("renders eye icon as a link to participant view", () => {
      const params = createMockParams(
        { profile_id: "profile-456" },
        { eventId: "event-123" },
      )

      renderWithRouter(params)

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute(
        "href",
        "/admin/eventos/event-123/participantes/profile-456",
      )
    })

    it("renders with accessible title", () => {
      const params = createMockParams(
        { profile_id: "profile-456" },
        { eventId: "event-123" },
      )

      renderWithRouter(params)

      expect(screen.getByRole("link")).toHaveAttribute(
        "title",
        "Ver participante",
      )
    })
  })

  describe("when required data is missing", () => {
    it("renders nothing when eventId is missing from context", () => {
      const params = createMockParams({ profile_id: "profile-456" }, {})

      const { container } = renderWithRouter(params)

      expect(container.textContent).toBe("")
      expect(screen.queryByRole("link")).not.toBeInTheDocument()
    })

    it("renders nothing when profile_id is missing from data", () => {
      const params = createMockParams(
        { profile_id: null },
        { eventId: "event-123" },
      )

      const { container } = renderWithRouter(params)

      expect(container.textContent).toBe("")
      expect(screen.queryByRole("link")).not.toBeInTheDocument()
    })
  })
})
