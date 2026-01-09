import { render, screen } from "@testing-library/react"
import { EyeIcon } from "lucide-react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { AGIconButton } from "./ag-icon-button"

function renderWithRouter(element: React.ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
}

describe("AGIconButton", () => {
  describe("rendering", () => {
    it("renders the icon inside a styled container", () => {
      renderWithRouter(
        <AGIconButton to="/test" title="Test">
          <EyeIcon data-testid="eye-icon" />
        </AGIconButton>
      )

      expect(screen.getByTestId("eye-icon")).toBeInTheDocument()
    })

    it("renders as a link when 'to' prop is provided", () => {
      renderWithRouter(
        <AGIconButton to="/admin/test" title="View">
          <EyeIcon />
        </AGIconButton>
      )

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/admin/test")
    })

    it("renders as an anchor with external link props when href is provided", () => {
      renderWithRouter(
        <AGIconButton href="https://wa.me/123" title="WhatsApp" external>
          <EyeIcon />
        </AGIconButton>
      )

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "https://wa.me/123")
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })
  })

  describe("styling", () => {
    it("has border styling for visual indication", () => {
      renderWithRouter(
        <AGIconButton to="/test" title="Test">
          <EyeIcon />
        </AGIconButton>
      )

      const link = screen.getByRole("link")
      expect(link).toHaveClass("border")
    })

    it("has proper padding for the button", () => {
      renderWithRouter(
        <AGIconButton to="/test" title="Test">
          <EyeIcon />
        </AGIconButton>
      )

      const link = screen.getByRole("link")
      expect(link).toHaveClass("p-1")
    })

    it("has hover effect", () => {
      renderWithRouter(
        <AGIconButton to="/test" title="Test">
          <EyeIcon />
        </AGIconButton>
      )

      const link = screen.getByRole("link")
      expect(link.className).toContain("hover:")
    })
  })

  describe("accessibility", () => {
    it("includes title for screen readers", () => {
      renderWithRouter(
        <AGIconButton to="/test" title="View participant">
          <EyeIcon />
        </AGIconButton>
      )

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("title", "View participant")
    })
  })
})
