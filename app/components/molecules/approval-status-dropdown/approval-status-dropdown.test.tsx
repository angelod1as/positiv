import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
    eventId: "event-456",
  }

  describe("color rendering", () => {
    it("should render with green colors when status is approved", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="approved" />
      )

      const dropdown = screen.getByRole("combobox")
      expect(dropdown).toHaveClass("bg-green-100")
      expect(dropdown).toHaveClass("border-green-500")
    })

    it("should render with yellow colors when status is approved_with_reservations", () => {
      renderWithRouter(
        <ApprovalStatusDropdown
          {...defaultProps}
          value="approved_with_reservations"
        />
      )

      const dropdown = screen.getByRole("combobox")
      expect(dropdown).toHaveClass("bg-yellow-100")
      expect(dropdown).toHaveClass("border-yellow-500")
    })

    it("should render with red colors when status is rejected", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="rejected" />
      )

      const dropdown = screen.getByRole("combobox")
      expect(dropdown).toHaveClass("bg-red-100")
      expect(dropdown).toHaveClass("border-red-500")
    })

    it("should render with neutral colors when status is pending", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="pending" />
      )

      const dropdown = screen.getByRole("combobox")
      expect(dropdown).toHaveClass("bg-gray-100")
      expect(dropdown).toHaveClass("border-gray-300")
    })
  })

  describe("option display", () => {
    it("should display Portuguese label for current status", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="approved" />
      )

      const dropdown = screen.getByRole("combobox")
      expect(dropdown).toHaveValue("approved")
      expect(screen.getByRole("option", { name: "Aprovade" })).toBeInTheDocument()
    })

    it("should show all status options", () => {
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="pending" />
      )

      expect(screen.getByRole("option", { name: "Pendente" })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: "Aprovade" })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: "Aprovade com Ressalvas" })).toBeInTheDocument()
      expect(screen.getByRole("option", { name: "Rejeitade" })).toBeInTheDocument()
    })
  })

  describe("interaction", () => {
    it("should allow selecting a different option", async () => {
      const user = userEvent.setup()
      renderWithRouter(
        <ApprovalStatusDropdown {...defaultProps} value="pending" />
      )

      const dropdown = screen.getByRole("combobox")
      await user.selectOptions(dropdown, "approved")

      expect(dropdown).toHaveValue("approved")
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
