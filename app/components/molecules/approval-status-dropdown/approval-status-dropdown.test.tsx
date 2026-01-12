import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import { ApprovalStatusDropdown } from "./approval-status-dropdown"

function renderWithRouter(component: React.ReactNode) {
  const router = createMemoryRouter(
    [{ path: "/", element: component }],
    { initialEntries: ["/"] }
  )
  return render(<RouterProvider router={router} />)
}

describe("ApprovalStatusDropdown", () => {
  const defaultProps = {
    value: "pending" as const,
    profileId: "profile-123",
  }

  describe("label", () => {
    it("should render with label 'Status de Aprovação'", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="pending" />
      )

      expect(screen.getByText("Status de Aprovação")).toBeInTheDocument()
    })
  })

  describe("color rendering", () => {
    it("should render with green colors when status is approved", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="approved" />
      )

      const trigger = screen.getByRole("combobox")
      expect(trigger).toHaveClass("bg-green-100")
      expect(trigger).toHaveClass("border-green-500")
    })

    it("should render with yellow colors when status is approved_with_reservations", () => {
      renderWithRouter(
        <ApprovalStatusDropdown
          {...defaultProps}
          value="approved_with_reservations"
        />
      )

      const trigger = screen.getByRole("combobox")
      expect(trigger).toHaveClass("bg-yellow-100")
      expect(trigger).toHaveClass("border-yellow-500")
    })

    it("should render with red colors when status is rejected", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="rejected" />
      )

      const trigger = screen.getByRole("combobox")
      expect(trigger).toHaveClass("bg-red-100")
      expect(trigger).toHaveClass("border-red-500")
    })

    it("should render with neutral colors when status is pending", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="pending" />
      )

      const trigger = screen.getByRole("combobox")
      expect(trigger).toHaveClass("bg-gray-100")
      expect(trigger).toHaveClass("border-gray-300")
    })
  })

  describe("option display", () => {
    it("should display Portuguese label for current status", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="approved" />
      )

      expect(screen.getByText("Aprovade")).toBeInTheDocument()
    })

    it("should display pending status label", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="pending" />
      )

      expect(screen.getByText("Pendente")).toBeInTheDocument()
    })
  })

  describe("interaction", () => {
    it("should not be disabled by default", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="pending" />
      )

      const trigger = screen.getByRole("combobox")
      expect(trigger).not.toBeDisabled()
    })
  })

  describe("accessibility", () => {
    it("should have accessible combobox role", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="pending" />
      )

      expect(screen.getByRole("combobox")).toBeInTheDocument()
    })
  })
})
