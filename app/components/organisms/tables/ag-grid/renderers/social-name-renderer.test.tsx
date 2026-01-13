import type { ICellRendererParams } from "ag-grid-community"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { render, screen } from "~/test/test-utils"
import { SocialNameRenderer } from "./social-name-renderer"

interface MockRowData {
  id?: string
  social_name?: string | null
  full_name: string
}

function createMockParams(rowData: MockRowData): ICellRendererParams {
  return {
    value: rowData.social_name,
    valueFormatted: String(rowData.social_name ?? ""),
    data: rowData,
    node: {} as ICellRendererParams["node"],
    colDef: { field: "social_name" },
    column: {} as ICellRendererParams["column"],
    api: {} as ICellRendererParams["api"],
    context: {},
    getValue: () => rowData.social_name,
    setValue: () => {},
    formatValue: () => String(rowData.social_name ?? ""),
    refreshCell: () => {},
    eGridCell: document.createElement("div"),
    eParentOfValue: document.createElement("div"),
    registerRowDragger: () => {},
    setTooltip: () => {},
  }
}

function renderWithRouter(component: React.ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>)
}

describe("SocialNameRenderer", () => {
  describe("link functionality", () => {
    it("renders name as a link when id is present", () => {
      const params = createMockParams({
        id: "profile-123",
        social_name: "Bia",
        full_name: "Beatriz Silva",
      })

      renderWithRouter(<SocialNameRenderer {...params} />)

      const link = screen.getByRole("link")
      expect(link).toBeInTheDocument()
      expect(link).toHaveTextContent("Bia")
    })

    it("links to correct profile view path", () => {
      const params = createMockParams({
        id: "profile-456",
        social_name: "Ana",
        full_name: "Ana Maria",
      })

      renderWithRouter(<SocialNameRenderer {...params} />)

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/admin/participantes/profile-456")
    })

    it("renders without link when id is missing", () => {
      const params = createMockParams({
        social_name: "Bia",
        full_name: "Beatriz Silva",
      })

      renderWithRouter(<SocialNameRenderer {...params} />)

      expect(screen.queryByRole("link")).not.toBeInTheDocument()
      expect(screen.getByText("Bia")).toBeInTheDocument()
    })
  })

  describe("when social_name is present", () => {
    it("renders the social_name directly", () => {
      const params = createMockParams({
        id: "profile-123",
        social_name: "Bia",
        full_name: "Beatriz Silva",
      })

      renderWithRouter(<SocialNameRenderer {...params} />)

      expect(screen.getByText("Bia")).toBeInTheDocument()
      expect(screen.queryByText("Beatriz")).not.toBeInTheDocument()
    })
  })

  describe("when social_name is null or empty", () => {
    it("renders first name from full_name in italics when social_name is null", () => {
      const params = createMockParams({
        id: "profile-123",
        social_name: null,
        full_name: "João Pedro Silva",
      })

      renderWithRouter(<SocialNameRenderer {...params} />)

      const firstName = screen.getByText("João")
      expect(firstName).toBeInTheDocument()
      expect(firstName.tagName).toBe("I")
    })

    it("renders first name from full_name in italics when social_name is undefined", () => {
      const params = createMockParams({
        id: "profile-123",
        full_name: "Maria Santos",
      })

      renderWithRouter(<SocialNameRenderer {...params} />)

      const firstName = screen.getByText("Maria")
      expect(firstName).toBeInTheDocument()
      expect(firstName.tagName).toBe("I")
    })

    it("renders first name from full_name in italics when social_name is empty string", () => {
      const params = createMockParams({
        id: "profile-123",
        social_name: "",
        full_name: "Carlos Oliveira",
      })

      renderWithRouter(<SocialNameRenderer {...params} />)

      const firstName = screen.getByText("Carlos")
      expect(firstName).toBeInTheDocument()
      expect(firstName.tagName).toBe("I")
    })
  })

  describe("edge cases", () => {
    it("handles empty full_name gracefully", () => {
      const params = createMockParams({
        id: "profile-123",
        social_name: null,
        full_name: "",
      })

      renderWithRouter(<SocialNameRenderer {...params} />)

      expect(screen.getByText("-")).toBeInTheDocument()
    })

    it("handles single-word full_name", () => {
      const params = createMockParams({
        id: "profile-123",
        social_name: null,
        full_name: "Madonna",
      })

      renderWithRouter(<SocialNameRenderer {...params} />)

      const firstName = screen.getByText("Madonna")
      expect(firstName).toBeInTheDocument()
      expect(firstName.tagName).toBe("I")
    })
  })
})
