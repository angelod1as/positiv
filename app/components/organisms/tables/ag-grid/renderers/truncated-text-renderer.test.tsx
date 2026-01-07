import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ICellRendererParams } from "ag-grid-community"
import { describe, expect, it } from "vitest"
import { TruncatedTextRenderer } from "./truncated-text-renderer"

function createMockParams(
  value: string | null | undefined,
  truncateLength?: number
): ICellRendererParams & { truncateLength?: number } {
  return {
    value,
    valueFormatted: String(value ?? ""),
    truncateLength,
    // Required ICellRendererParams properties (mocked)
    data: { id: "1" },
    node: {} as ICellRendererParams["node"],
    colDef: { field: "notes" },
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

describe("TruncatedTextRenderer", () => {
  describe("when value is shorter than truncate length", () => {
    it("renders full text without truncation", () => {
      const params = createMockParams("Short text")

      render(<TruncatedTextRenderer {...params} />)

      expect(screen.getByText("Short text")).toBeInTheDocument()
      expect(screen.queryByText("...")).not.toBeInTheDocument()
    })

    it("renders full text when exactly at truncate length", () => {
      const text = "a".repeat(25) // Exactly 25 characters (default truncate length)
      const params = createMockParams(text)

      render(<TruncatedTextRenderer {...params} />)

      expect(screen.getByText(text)).toBeInTheDocument()
    })
  })

  describe("when value exceeds truncate length", () => {
    it("renders truncated text with ellipsis", () => {
      const longText = "This is a very long text that should be truncated"
      const params = createMockParams(longText)

      render(<TruncatedTextRenderer {...params} />)

      // Should show first 25 chars + "..."
      expect(screen.getByText("This is a very long text ...")).toBeInTheDocument()
      expect(screen.queryByText(longText)).not.toBeInTheDocument()
    })

    it("shows tooltip with full text on hover", async () => {
      const user = userEvent.setup()
      const longText = "This is a very long text that should be truncated and show tooltip"
      const params = createMockParams(longText)

      render(<TruncatedTextRenderer {...params} />)

      const truncatedElement = screen.getByText("This is a very long text ...")
      await user.hover(truncatedElement)

      // Tooltip should appear with full text
      expect(await screen.findByRole("tooltip")).toHaveTextContent(longText)
    })

    it("respects custom truncateLength parameter", () => {
      const text = "This should truncate at 10"
      const params = createMockParams(text, 10)

      render(<TruncatedTextRenderer {...params} />)

      // Should show first 10 chars + "..."
      expect(screen.getByText("This shoul...")).toBeInTheDocument()
    })
  })

  describe("edge cases", () => {
    it("handles null value gracefully", () => {
      const params = createMockParams(null)

      const { container } = render(<TruncatedTextRenderer {...params} />)

      // Should render a span element (not crash)
      expect(container.querySelector("span")).toBeInTheDocument()
    })

    it("handles undefined value gracefully", () => {
      const params = createMockParams(undefined)

      const { container } = render(<TruncatedTextRenderer {...params} />)

      // Should render a span element (not crash)
      expect(container.querySelector("span")).toBeInTheDocument()
    })

    it("handles empty string", () => {
      const params = createMockParams("")

      const { container } = render(<TruncatedTextRenderer {...params} />)

      // Should render a span element (not crash)
      expect(container.querySelector("span")).toBeInTheDocument()
    })
  })
})
