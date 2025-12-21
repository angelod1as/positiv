import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { EventCardFooter } from "./event-card-footer"

vi.mock("react-router", () => ({
  useFetcher: () => ({
    Form: ({ children }: { children: React.ReactNode }) => (
      <form>{children}</form>
    ),
    submit: vi.fn(),
    state: "idle",
    data: null,
  }),
}))

vi.mock("~/components/atoms/button/button", () => ({
  Button: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to?: string
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("~/components/molecules/confirm-dialog/confirm-dialog", () => {
  const ConfirmDialog = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  ConfirmDialog.Trigger = ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  )
  return {
    default: ConfirmDialog,
  }
})

vi.mock("~/lib/hooks/use-smart-prefetch", () => ({
  useSmartPrefetch: () => "intent",
}))

describe("EventCardFooter", () => {
  describe("when isAdmin is true", () => {
    it("should render view and edit buttons", () => {
      render(
        <EventCardFooter
          eventId="test-event-id"
          event_status="Registration Open"
          googleLink=""
          is_applied={false}
          dataTestId="test-footer"
          isAdmin={true}
        />,
      )

      const viewButton = screen.getByText(/Ver evento/i)
      const editButton = screen.getByText(/Editar evento/i)

      expect(viewButton).toBeInTheDocument()
      expect(editButton).toBeInTheDocument()
    })

    it("should link to admin event view and edit paths", () => {
      render(
        <EventCardFooter
          eventId="test-event-123"
          event_status="Registration Open"
          googleLink=""
          is_applied={false}
          dataTestId="test-footer"
          isAdmin={true}
        />,
      )

      const viewButton = screen.getByText(/Ver evento/i)
      const editButton = screen.getByText(/Editar evento/i)

      expect(viewButton).toHaveAttribute("href", "/admin/eventos/test-event-123")
      expect(editButton).toHaveAttribute(
        "href",
        "/admin/eventos/novo/test-event-123",
      )
    })
  })

  describe("when isAdmin is false or undefined (backward compatibility)", () => {
    it("should render user apply button when event is open and not applied", () => {
      render(
        <EventCardFooter
          eventId="test-event-id"
          event_status="Registration Open"
          googleLink=""
          is_applied={false}
          dataTestId="test-footer"
          isAdmin={false}
        />,
      )

      const applyButton = screen.getByText(/Fazer inscrição/i)
      expect(applyButton).toBeInTheDocument()
    })

    it("should render cancel button when user is applied", () => {
      render(
        <EventCardFooter
          eventId="test-event-id"
          event_status="Registration Open"
          googleLink=""
          is_applied={true}
          dataTestId="test-footer"
          isAdmin={false}
        />,
      )

      const cancelButton = screen.getByText(/Cancelar inscrição/i)
      expect(cancelButton).toBeInTheDocument()
    })

    it("should work without isAdmin prop (backward compatibility)", () => {
      render(
        <EventCardFooter
          eventId="test-event-id"
          event_status="Registration Open"
          googleLink=""
          is_applied={false}
          dataTestId="test-footer"
        />,
      )

      const applyButton = screen.getByText(/Fazer inscrição/i)
      expect(applyButton).toBeInTheDocument()
    })
  })
})
