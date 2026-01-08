import { render, screen } from "@testing-library/react"
import type { ICellRendererParams } from "ag-grid-community"
import { describe, expect, it } from "vitest"
import type { ProfileFlagStatus } from "~/types/database/entities.types"
import { FlagBadgeRenderer } from "./flag-badge-renderer"

function createMockParams(
  flag: ProfileFlagStatus | undefined,
  flagNotes?: string | null
): ICellRendererParams {
  return {
    value: flag,
    valueFormatted: flag ?? "",
    data: { id: "1", flag, flag_notes: flagNotes },
    node: {} as ICellRendererParams["node"],
    colDef: { field: "flag" },
    column: {} as ICellRendererParams["column"],
    api: {} as ICellRendererParams["api"],
    context: {},
    getValue: () => flag ?? "",
    setValue: () => {},
    formatValue: () => flag ?? "",
    refreshCell: () => {},
    eGridCell: document.createElement("div"),
    eParentOfValue: document.createElement("div"),
    registerRowDragger: () => {},
    setTooltip: () => {},
  }
}

describe("FlagBadgeRenderer", () => {
  describe("when flag is none", () => {
    it("renders nothing", () => {
      const params = createMockParams("none")

      const { container } = render(<FlagBadgeRenderer {...params} />)

      expect(container).toBeEmptyDOMElement()
    })
  })

  describe("when flag is yellow", () => {
    it("renders a yellow flag icon", () => {
      const params = createMockParams("yellow")

      render(<FlagBadgeRenderer {...params} />)

      const flag = screen.getByRole("img", { name: /flag amarela/i })
      expect(flag).toBeInTheDocument()
    })
  })

  describe("when flag is red", () => {
    it("renders a red flag icon", () => {
      const params = createMockParams("red")

      render(<FlagBadgeRenderer {...params} />)

      const flag = screen.getByRole("img", { name: /flag vermelha/i })
      expect(flag).toBeInTheDocument()
    })
  })

  describe("when flag is gray", () => {
    it("renders a gray flag icon", () => {
      const params = createMockParams("gray")

      render(<FlagBadgeRenderer {...params} />)

      const flag = screen.getByRole("img", { name: /flag cinza/i })
      expect(flag).toBeInTheDocument()
    })
  })

  describe("when flagNotes is provided", () => {
    it("passes flagNotes to FlagBadge for tooltip display", () => {
      const params = createMockParams("yellow", "Important note about this participant")

      render(<FlagBadgeRenderer {...params} />)

      const flag = screen.getByRole("img", { name: /flag amarela/i })
      expect(flag).toBeInTheDocument()
    })
  })

  describe("edge cases", () => {
    it("handles missing flag_notes gracefully", () => {
      const params = createMockParams("red", null)

      render(<FlagBadgeRenderer {...params} />)

      const flag = screen.getByRole("img", { name: /flag vermelha/i })
      expect(flag).toBeInTheDocument()
    })

    it("handles undefined flag_notes gracefully", () => {
      const params = createMockParams("gray", undefined)

      render(<FlagBadgeRenderer {...params} />)

      const flag = screen.getByRole("img", { name: /flag cinza/i })
      expect(flag).toBeInTheDocument()
    })

    it("renders nothing when flag value is undefined", () => {
      const params = createMockParams(undefined)

      const { container } = render(<FlagBadgeRenderer {...params} />)

      expect(container).toBeEmptyDOMElement()
    })
  })
})
