import type { ICellRendererParams } from "ag-grid-community"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { VeteranSelectCellRenderer } from "./veteran-select-cell-renderer"

function createMockParams(
  value: boolean | null | undefined,
): ICellRendererParams {
  return {
    value,
    valueFormatted: String(value ?? ""),
    data: { id: "1", is_veteran: value },
    node: {} as ICellRendererParams["node"],
    colDef: { field: "is_veteran" },
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

describe("VeteranSelectCellRenderer", () => {
  describe("when value is true (veteran)", () => {
    it("renders Veterane text", () => {
      const params = createMockParams(true)

      render(<VeteranSelectCellRenderer {...params} />)

      expect(screen.getByText("Veterane")).toBeInTheDocument()
    })

    it("applies veteran colors (purple background)", () => {
      const params = createMockParams(true)

      render(<VeteranSelectCellRenderer {...params} />)

      const element = screen.getByText("Veterane")
      expect(element).toHaveClass("bg-purple-700")
      expect(element).toHaveClass("text-white")
    })
  })

  describe("when value is false (rookie/novate)", () => {
    it("renders Novate text", () => {
      const params = createMockParams(false)

      render(<VeteranSelectCellRenderer {...params} />)

      expect(screen.getByText("Novate")).toBeInTheDocument()
    })

    it("applies rookie colors (violet background)", () => {
      const params = createMockParams(false)

      render(<VeteranSelectCellRenderer {...params} />)

      const element = screen.getByText("Novate")
      expect(element).toHaveClass("bg-violet-100")
      expect(element).toHaveClass("text-violet-900")
    })
  })

  describe("edge cases", () => {
    it("handles null value gracefully (defaults to Novate)", () => {
      const params = createMockParams(null)

      render(<VeteranSelectCellRenderer {...params} />)

      expect(screen.getByText("Novate")).toBeInTheDocument()
    })

    it("handles undefined value gracefully (defaults to Novate)", () => {
      const params = createMockParams(undefined)

      render(<VeteranSelectCellRenderer {...params} />)

      expect(screen.getByText("Novate")).toBeInTheDocument()
    })
  })

  describe("styling", () => {
    it("has proper padding and rounded corners for display", () => {
      const params = createMockParams(true)

      render(<VeteranSelectCellRenderer {...params} />)

      const element = screen.getByText("Veterane")
      expect(element).toHaveClass("px-2")
      expect(element).toHaveClass("py-1")
      expect(element).toHaveClass("rounded")
    })

    it("fills the cell width", () => {
      const params = createMockParams(true)

      render(<VeteranSelectCellRenderer {...params} />)

      const container = screen.getByText("Veterane").parentElement
      expect(container).toHaveClass("w-full")
    })
  })
})
