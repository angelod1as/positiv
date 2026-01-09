import type { ICellRendererParams } from "ag-grid-community"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { WarningIndicatorRenderer } from "./warning-indicator-renderer"

function createMockParams(
  value: string[] | null | undefined,
  field: string,
): ICellRendererParams {
  return {
    value,
    valueFormatted: String(value ?? ""),
    data: { id: "1", [field]: value },
    node: {} as ICellRendererParams["node"],
    colDef: { field },
    column: {} as ICellRendererParams["column"],
    api: {} as ICellRendererParams["api"],
    context: {},
    getValue: () => value ?? "",
    setValue: () => {},
    formatValue: () => String(value ?? ""),
    refreshCell: () => {},
    eGridCell: document.createElement("div"),
    eParentOfValue: document.createElement("div"),
    registerRowDragger: () => {},
    setTooltip: () => {},
  }
}

describe("WarningIndicatorRenderer", () => {
  describe("gender warnings", () => {
    it("renders gender values", () => {
      const params = createMockParams(["Mulher cis"], "gender")

      render(<WarningIndicatorRenderer {...params} />)

      expect(screen.getByText("Mulher cis")).toBeInTheDocument()
    })

    it("highlights trans gender in blue", () => {
      const params = createMockParams(["Mulher trans"], "gender")

      render(<WarningIndicatorRenderer {...params} />)

      const element = screen.getByText("Mulher trans")
      expect(element).toHaveClass("text-blue-700")
    })

    it("highlights travesti in blue", () => {
      const params = createMockParams(["Travesti"], "gender")

      render(<WarningIndicatorRenderer {...params} />)

      const element = screen.getByText("Travesti")
      expect(element).toHaveClass("text-blue-700")
    })

    it("highlights agender variations in blue", () => {
      const params = createMockParams(["Pessoa agênera"], "gender")

      render(<WarningIndicatorRenderer {...params} />)

      const element = screen.getByText("Pessoa agênera")
      expect(element).toHaveClass("text-blue-700")
    })

    it("highlights non-binary variations in blue", () => {
      const params = createMockParams(["Não binário"], "gender")

      render(<WarningIndicatorRenderer {...params} />)

      const element = screen.getByText("Não binário")
      expect(element).toHaveClass("text-blue-700")
    })

    it("does not highlight cis genders", () => {
      const params = createMockParams(["Homem cis"], "gender")

      render(<WarningIndicatorRenderer {...params} />)

      const element = screen.getByText("Homem cis")
      expect(element).not.toHaveClass("text-blue-700")
    })

    it("renders multiple genders with appropriate highlighting", () => {
      const params = createMockParams(["Mulher cis", "Mulher trans"], "gender")

      render(<WarningIndicatorRenderer {...params} />)

      const cisElement = screen.getByText("Mulher cis")
      const transElement = screen.getByText("Mulher trans")

      expect(cisElement).not.toHaveClass("text-blue-700")
      expect(transElement).toHaveClass("text-blue-700")
    })
  })

  describe("orientation warnings", () => {
    it("renders orientation values", () => {
      const params = createMockParams(["Gay"], "orientation")

      render(<WarningIndicatorRenderer {...params} />)

      expect(screen.getByText("Gay")).toBeInTheDocument()
    })

    it("highlights hetero in red", () => {
      const params = createMockParams(["Hétero"], "orientation")

      render(<WarningIndicatorRenderer {...params} />)

      const element = screen.getByText("Hétero")
      expect(element).toHaveClass("text-red-700")
    })

    it("highlights sapiosexual in red", () => {
      const params = createMockParams(["Sapiosexual"], "orientation")

      render(<WarningIndicatorRenderer {...params} />)

      const element = screen.getByText("Sapiosexual")
      expect(element).toHaveClass("text-red-700")
    })

    it("does not highlight gay orientation", () => {
      const params = createMockParams(["Gay"], "orientation")

      render(<WarningIndicatorRenderer {...params} />)

      const element = screen.getByText("Gay")
      expect(element).not.toHaveClass("text-red-700")
    })

    it("does not highlight lesbian orientation", () => {
      const params = createMockParams(["Lésbica"], "orientation")

      render(<WarningIndicatorRenderer {...params} />)

      const element = screen.getByText("Lésbica")
      expect(element).not.toHaveClass("text-red-700")
    })

    it("renders multiple orientations with appropriate highlighting", () => {
      const params = createMockParams(["Gay", "Hétero"], "orientation")

      render(<WarningIndicatorRenderer {...params} />)

      const gayElement = screen.getByText("Gay")
      const heteroElement = screen.getByText("Hétero")

      expect(gayElement).not.toHaveClass("text-red-700")
      expect(heteroElement).toHaveClass("text-red-700")
    })
  })

  describe("edge cases", () => {
    it("renders nothing when value is null", () => {
      const params = createMockParams(null, "gender")

      const { container } = render(<WarningIndicatorRenderer {...params} />)

      expect(container).toBeEmptyDOMElement()
    })

    it("renders nothing when value is undefined", () => {
      const params = createMockParams(undefined, "gender")

      const { container } = render(<WarningIndicatorRenderer {...params} />)

      expect(container).toBeEmptyDOMElement()
    })

    it("renders nothing when value is empty array", () => {
      const params = createMockParams([], "gender")

      const { container } = render(<WarningIndicatorRenderer {...params} />)

      expect(container).toBeEmptyDOMElement()
    })
  })
})
