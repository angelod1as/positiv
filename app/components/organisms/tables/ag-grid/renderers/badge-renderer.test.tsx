import { render, screen } from "@testing-library/react"
import type { ICellRendererParams } from "ag-grid-community"
import { describe, expect, it } from "vitest"
import { VeteranBadgeRenderer } from "./badge-renderer"

function createMockParams(
  value: boolean | null | undefined
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

describe("VeteranBadgeRenderer", () => {
  describe("when value is true (veteran)", () => {
    it("renders Veterano badge with veteran variant", () => {
      const params = createMockParams(true)

      render(<VeteranBadgeRenderer {...params} />)

      const badge = screen.getByText("Veterano")
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute("data-slot", "badge")
    })
  })

  describe("when value is false (rookie)", () => {
    it("renders Novato badge with rookie variant", () => {
      const params = createMockParams(false)

      render(<VeteranBadgeRenderer {...params} />)

      const badge = screen.getByText("Novato")
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute("data-slot", "badge")
    })
  })

  describe("edge cases", () => {
    it("handles null value gracefully (defaults to rookie)", () => {
      const params = createMockParams(null)

      render(<VeteranBadgeRenderer {...params} />)

      expect(screen.getByText("Novato")).toBeInTheDocument()
    })

    it("handles undefined value gracefully (defaults to rookie)", () => {
      const params = createMockParams(undefined)

      render(<VeteranBadgeRenderer {...params} />)

      expect(screen.getByText("Novato")).toBeInTheDocument()
    })
  })
})
