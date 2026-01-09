import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ICellRendererParams } from "ag-grid-community"
import { describe, expect, it, vi } from "vitest"
import { TextModalEditor } from "./text-modal-editor"

interface RowData {
  id: string
  notes?: string | null
}

interface TextModalEditorContext {
  onSave?: (id: string, field: string, value: string) => Promise<void>
}

function createMockParams(
  value: string | null | undefined,
  context: TextModalEditorContext = {},
  label?: string
): ICellRendererParams {
  return {
    value,
    valueFormatted: String(value ?? ""),
    data: { id: "row-123", notes: value } as RowData,
    node: {} as ICellRendererParams["node"],
    colDef: { field: "notes", headerName: label },
    column: {} as ICellRendererParams["column"],
    api: {} as ICellRendererParams["api"],
    context,
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

describe("TextModalEditor", () => {
  describe("text display", () => {
    it("renders truncated text when text is long", () => {
      const longText = "This is a very long text that should be truncated"
      const params = createMockParams(longText)

      render(<TextModalEditor {...params} />)

      expect(screen.getByText(/This is a very long text .../)).toBeInTheDocument()
    })

    it("renders full text when text is short", () => {
      const params = createMockParams("Short text")

      render(<TextModalEditor {...params} />)

      expect(screen.getByText("Short text")).toBeInTheDocument()
    })

    it("renders empty when value is null", () => {
      const params = createMockParams(null)

      const { container } = render(<TextModalEditor {...params} />)

      expect(screen.getByRole("button", { name: "Edit text" })).toBeInTheDocument()
      expect(container.querySelector(".truncate")?.textContent).toBe("")
    })
  })

  describe("edit functionality", () => {
    it("shows edit button", () => {
      const params = createMockParams("Some text")

      render(<TextModalEditor {...params} />)

      expect(screen.getByRole("button", { name: "Edit text" })).toBeInTheDocument()
    })

    it("opens modal when edit button is clicked", async () => {
      const user = userEvent.setup()
      const params = createMockParams("Some text", {}, "Notas")

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))

      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "Notas" })).toBeInTheDocument()
    })

    it("shows current value in textarea when modal opens", async () => {
      const user = userEvent.setup()
      const params = createMockParams("Current value")

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))

      expect(screen.getByRole("textbox")).toHaveValue("Current value")
    })

    it("calls onSave from context when save button is clicked", async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn().mockResolvedValue(undefined)
      const params = createMockParams("Original", { onSave: mockOnSave })

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      await user.clear(screen.getByRole("textbox"))
      await user.type(screen.getByRole("textbox"), "New value")
      await user.click(screen.getByRole("button", { name: "Save" }))

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith("row-123", "notes", "New value")
      })
    })

    it("closes modal after saving", async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn().mockResolvedValue(undefined)
      const params = createMockParams("Original", { onSave: mockOnSave })

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      await user.clear(screen.getByRole("textbox"))
      await user.type(screen.getByRole("textbox"), "New value")
      await user.click(screen.getByRole("button", { name: "Save" }))

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      })
    })

    it("closes modal when cancel button is clicked without saving", async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn()
      const params = createMockParams("Original", { onSave: mockOnSave })

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      await user.clear(screen.getByRole("textbox"))
      await user.type(screen.getByRole("textbox"), "Modified")
      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(mockOnSave).not.toHaveBeenCalled()
    })
  })
})
