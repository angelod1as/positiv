import userEvent from "@testing-library/user-event"
import type { ICellRendererParams, IRowNode } from "ag-grid-community"
import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "~/test/test-utils"
import { TextModalEditor } from "./text-modal-editor"

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}))

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
  label?: string,
  nodeOverrides: Partial<IRowNode> = {},
): ICellRendererParams {
  const mockNode = {
    setDataValue: vi.fn(),
    data: { id: "row-123", notes: value },
    ...nodeOverrides,
  } as unknown as IRowNode

  return {
    value,
    valueFormatted: String(value ?? ""),
    data: { id: "row-123", notes: value } as RowData,
    node: mockNode,
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

      expect(
        screen.getByText(/This is a very long text .../),
      ).toBeInTheDocument()
    })

    it("renders full text when text is short", () => {
      const params = createMockParams("Short text")

      render(<TextModalEditor {...params} />)

      expect(screen.getByText("Short text")).toBeInTheDocument()
    })

    it("renders empty when value is null", () => {
      const params = createMockParams(null)

      const { container } = render(<TextModalEditor {...params} />)

      expect(
        screen.getByRole("button", { name: "Edit text" }),
      ).toBeInTheDocument()
      expect(container.querySelector(".truncate")?.textContent).toBe("")
    })
  })

  describe("edit functionality", () => {
    it("shows edit button", () => {
      const params = createMockParams("Some text")

      render(<TextModalEditor {...params} />)

      expect(
        screen.getByRole("button", { name: "Edit text" }),
      ).toBeInTheDocument()
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

    it("calls node.setDataValue when save button is clicked", async () => {
      const user = userEvent.setup()
      const params = createMockParams("Original")

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      await user.clear(screen.getByRole("textbox"))
      await user.type(screen.getByRole("textbox"), "New value")
      await user.click(screen.getByRole("button", { name: "Save" }))

      await waitFor(() => {
        expect(params.node.setDataValue).toHaveBeenCalledWith("notes", "New value")
      })
    })

    it("closes modal after saving", async () => {
      const user = userEvent.setup()
      const params = createMockParams("Original")

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      await user.clear(screen.getByRole("textbox"))
      await user.type(screen.getByRole("textbox"), "New value")
      await user.click(screen.getByRole("button", { name: "Save" }))

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      })
    })

    it("closes modal when cancel button is clicked without making changes", async () => {
      const user = userEvent.setup()
      const params = createMockParams("Original")

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      // Don't make any changes
      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(params.node.setDataValue).not.toHaveBeenCalled()
    })
  })

  describe("auto-save integration", () => {
    it("uses node.setDataValue to trigger auto-save system", async () => {
      const user = userEvent.setup()
      const params = createMockParams("Original")

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      await user.clear(screen.getByRole("textbox"))
      await user.type(screen.getByRole("textbox"), "New value")
      await user.click(screen.getByRole("button", { name: "Save" }))

      await waitFor(() => {
        expect(params.node.setDataValue).toHaveBeenCalledWith("notes", "New value")
      })
    })

    it("does not call setDataValue when value is unchanged", async () => {
      const user = userEvent.setup()
      const params = createMockParams("Original")

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      // Don't change the text
      await user.click(screen.getByRole("button", { name: "Save" }))

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      })
      expect(params.node.setDataValue).not.toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("shows error toast when setDataValue throws", async () => {
      const { toast } = await import("sonner")
      const user = userEvent.setup()
      const mockSetDataValue = vi.fn().mockImplementation(() => {
        throw new Error("Save failed")
      })
      const params = createMockParams("Original", {}, "Notas", {
        setDataValue: mockSetDataValue,
      })

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      await user.clear(screen.getByRole("textbox"))
      await user.type(screen.getByRole("textbox"), "New value")
      await user.click(screen.getByRole("button", { name: "Save" }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })

    it("keeps modal open when save fails", async () => {
      const user = userEvent.setup()
      const mockSetDataValue = vi.fn().mockImplementation(() => {
        throw new Error("Save failed")
      })
      const params = createMockParams("Original", {}, "Notas", {
        setDataValue: mockSetDataValue,
      })

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      await user.clear(screen.getByRole("textbox"))
      await user.type(screen.getByRole("textbox"), "New value")
      await user.click(screen.getByRole("button", { name: "Save" }))

      // Modal should stay open
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument()
      })
    })
  })

  describe("dirty state warning", () => {
    it("shows confirmation when closing with unsaved changes", async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
      const user = userEvent.setup()
      const params = createMockParams("Original")

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      await user.clear(screen.getByRole("textbox"))
      await user.type(screen.getByRole("textbox"), "Modified")
      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(confirmSpy).toHaveBeenCalledWith(
        "Você tem alterações não salvas. Deseja descartá-las?",
      )
      confirmSpy.mockRestore()
    })

    it("does not close modal when user rejects confirmation", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
      const user = userEvent.setup()
      const params = createMockParams("Original")

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      await user.clear(screen.getByRole("textbox"))
      await user.type(screen.getByRole("textbox"), "Modified")
      await user.click(screen.getByRole("button", { name: "Cancel" }))

      // Modal should stay open
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      confirmSpy.mockRestore()
    })

    it("closes modal when user confirms discarding changes", async () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
      const user = userEvent.setup()
      const params = createMockParams("Original")

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      await user.clear(screen.getByRole("textbox"))
      await user.type(screen.getByRole("textbox"), "Modified")
      await user.click(screen.getByRole("button", { name: "Cancel" }))

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      })
      confirmSpy.mockRestore()
    })

    it("does not show confirmation when no changes were made", async () => {
      const confirmSpy = vi.spyOn(window, "confirm")
      const user = userEvent.setup()
      const params = createMockParams("Original")

      render(<TextModalEditor {...params} />)

      await user.click(screen.getByRole("button", { name: "Edit text" }))
      // Don't make any changes
      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(confirmSpy).not.toHaveBeenCalled()
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      confirmSpy.mockRestore()
    })
  })
})
