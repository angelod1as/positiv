import type { ICellRendererParams } from "ag-grid-community"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { VeteranRookieBadgeRenderer } from "./veteran-rookie-badge-renderer"

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

describe("VeteranRookieBadgeRenderer", () => {
  describe("when value is true (veteran)", () => {
    it("renders Veterane badge with veteran variant", () => {
      const params = createMockParams(true)

      render(<VeteranRookieBadgeRenderer {...params} />)

      const badge = screen.getByText("Veterane")
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute("data-slot", "badge")
    })
  })

  describe("when value is false (rookie)", () => {
    it("renders Novate badge with rookie variant", () => {
      const params = createMockParams(false)

      render(<VeteranRookieBadgeRenderer {...params} />)

      const badge = screen.getByText("Novate")
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute("data-slot", "badge")
    })
  })

  describe("edge cases", () => {
    it("handles null value gracefully (defaults to rookie)", () => {
      const params = createMockParams(null)

      render(<VeteranRookieBadgeRenderer {...params} />)

      expect(screen.getByText("Novate")).toBeInTheDocument()
    })

    it("handles undefined value gracefully (defaults to rookie)", () => {
      const params = createMockParams(undefined)

      render(<VeteranRookieBadgeRenderer {...params} />)

      expect(screen.getByText("Novate")).toBeInTheDocument()
    })
  })
})
