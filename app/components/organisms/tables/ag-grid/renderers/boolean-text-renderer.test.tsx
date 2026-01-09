import type { ICellRendererParams } from "ag-grid-community"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { BooleanTextRenderer } from "./boolean-text-renderer"

function createMockParams(
  value: boolean | null | undefined,
): ICellRendererParams {
  return {
    value,
    valueFormatted: String(value ?? ""),
    data: { some_boolean_field: value },
    node: {} as ICellRendererParams["node"],
    colDef: { field: "some_boolean_field" },
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

describe("BooleanTextRenderer", () => {
  describe("when value is true", () => {
    it("renders 'Sim'", () => {
      const params = createMockParams(true)

      render(<BooleanTextRenderer {...params} />)

      expect(screen.getByText("Sim")).toBeInTheDocument()
    })
  })

  describe("when value is false or null", () => {
    it("renders empty string when value is false", () => {
      const params = createMockParams(false)

      const { container } = render(<BooleanTextRenderer {...params} />)

      expect(container.textContent).toBe("")
    })

    it("renders empty string when value is null", () => {
      const params = createMockParams(null)

      const { container } = render(<BooleanTextRenderer {...params} />)

      expect(container.textContent).toBe("")
    })

    it("renders empty string when value is undefined", () => {
      const params = createMockParams(undefined)

      const { container } = render(<BooleanTextRenderer {...params} />)

      expect(container.textContent).toBe("")
    })
  })
})
