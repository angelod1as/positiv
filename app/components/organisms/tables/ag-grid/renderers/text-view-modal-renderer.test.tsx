import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ICellRendererParams } from "ag-grid-community"
import { describe, expect, it } from "vitest"
import { TextViewModalRenderer } from "./text-view-modal-renderer"

function createMockParams(
  value: string | null | undefined,
  label?: string
): ICellRendererParams {
  return {
    value,
    valueFormatted: String(value ?? ""),
    data: { some_field: value },
    node: {} as ICellRendererParams["node"],
    colDef: { field: "some_field", headerName: label },
    column: {} as ICellRendererParams["column"],
    api: {} as ICellRendererParams["api"],
    context: {},
    getValue: () => value,
    setValue: () => {},
    formatValue: () => String(value ?? ""),
    refreshCell: () => {},
    eGridCell: document.createElement("div"),
    eParentOfValue: document.createElement("div"),
    registerRowDragger: () => {},
    setTooltip: () => {},
  }
}

describe("TextViewModalRenderer", () => {
  describe("when text is short", () => {
    it("renders full text without eye icon", () => {
      const params = createMockParams("Short text")

      render(<TextViewModalRenderer {...params} />)

      expect(screen.getByText("Short text")).toBeInTheDocument()
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })
  })

  describe("when text is long", () => {
    it("renders truncated text with ellipsis", () => {
      const longText = "This is a very long text that should be truncated because it exceeds the maximum length"
      const params = createMockParams(longText)

      render(<TextViewModalRenderer {...params} />)

      expect(screen.getByText(/This is a very long text .../)).toBeInTheDocument()
    })

    it("shows eye icon button when text is long", () => {
      const longText = "This is a very long text that should be truncated because it exceeds the maximum length"
      const params = createMockParams(longText)

      render(<TextViewModalRenderer {...params} />)

      expect(screen.getByRole("button", { name: "View full text" })).toBeInTheDocument()
    })

    it("opens modal with full text when eye icon is clicked", async () => {
      const user = userEvent.setup()
      const longText = "This is a very long text that should be truncated because it exceeds the maximum length"
      const params = createMockParams(longText, "Acompanhantes")

      render(<TextViewModalRenderer {...params} />)

      await user.click(screen.getByRole("button", { name: "View full text" }))

      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByText(longText)).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "Acompanhantes" })).toBeInTheDocument()
    })
  })

  describe("when value is null or empty", () => {
    it("renders empty when value is null", () => {
      const params = createMockParams(null)

      const { container } = render(<TextViewModalRenderer {...params} />)

      expect(container.textContent).toBe("")
    })

    it("renders empty when value is empty string", () => {
      const params = createMockParams("")

      const { container } = render(<TextViewModalRenderer {...params} />)

      expect(container.textContent).toBe("")
    })
  })
})
