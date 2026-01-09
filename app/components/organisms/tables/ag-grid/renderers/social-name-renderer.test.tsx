import { render, screen } from "@testing-library/react"
import type { ICellRendererParams } from "ag-grid-community"
import { describe, expect, it } from "vitest"
import { SocialNameRenderer } from "./social-name-renderer"

function createMockParams(
  socialName: string | null | undefined,
  fullName: string
): ICellRendererParams {
  return {
    value: socialName,
    valueFormatted: String(socialName ?? ""),
    data: { social_name: socialName, full_name: fullName },
    node: {} as ICellRendererParams["node"],
    colDef: { field: "social_name" },
    column: {} as ICellRendererParams["column"],
    api: {} as ICellRendererParams["api"],
    context: {},
    getValue: () => socialName,
    setValue: () => {},
    formatValue: () => String(socialName ?? ""),
    refreshCell: () => {},
    eGridCell: document.createElement("div"),
    eParentOfValue: document.createElement("div"),
    registerRowDragger: () => {},
    setTooltip: () => {},
  }
}

describe("SocialNameRenderer", () => {
  describe("when social_name is present", () => {
    it("renders the social_name directly", () => {
      const params = createMockParams("Bia", "Beatriz Silva")

      render(<SocialNameRenderer {...params} />)

      expect(screen.getByText("Bia")).toBeInTheDocument()
      expect(screen.queryByText("Beatriz")).not.toBeInTheDocument()
    })
  })

  describe("when social_name is null or empty", () => {
    it("renders first name from full_name in italics when social_name is null", () => {
      const params = createMockParams(null, "João Pedro Silva")

      render(<SocialNameRenderer {...params} />)

      const firstName = screen.getByText("João")
      expect(firstName).toBeInTheDocument()
      expect(firstName.tagName).toBe("I")
    })

    it("renders first name from full_name in italics when social_name is undefined", () => {
      const params = createMockParams(undefined, "Maria Santos")

      render(<SocialNameRenderer {...params} />)

      const firstName = screen.getByText("Maria")
      expect(firstName).toBeInTheDocument()
      expect(firstName.tagName).toBe("I")
    })

    it("renders first name from full_name in italics when social_name is empty string", () => {
      const params = createMockParams("", "Carlos Oliveira")

      render(<SocialNameRenderer {...params} />)

      const firstName = screen.getByText("Carlos")
      expect(firstName).toBeInTheDocument()
      expect(firstName.tagName).toBe("I")
    })
  })

  describe("edge cases", () => {
    it("handles empty full_name gracefully", () => {
      const params = createMockParams(null, "")

      render(<SocialNameRenderer {...params} />)

      expect(screen.getByText("-")).toBeInTheDocument()
    })

    it("handles single-word full_name", () => {
      const params = createMockParams(null, "Madonna")

      render(<SocialNameRenderer {...params} />)

      const firstName = screen.getByText("Madonna")
      expect(firstName).toBeInTheDocument()
      expect(firstName.tagName).toBe("I")
    })
  })
})
