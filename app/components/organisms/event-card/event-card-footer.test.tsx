import { describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"
import { render, screen } from "~/test/test-utils"
import { EventCardFooter } from "./event-card-footer"

const { mockSubmit, mockTrack } = vi.hoisted(() => ({
  mockSubmit: vi.fn(),
  mockTrack: vi.fn(),
}))

vi.mock("~/lib/hooks/use-analytics", () => ({
  useAnalytics: () => ({ track: mockTrack }),
}))

vi.mock("react-router", () => ({
  useFetcher: () => ({
    Form: ({ children }: { children: React.ReactNode }) => (
      <form>{children}</form>
    ),
    submit: mockSubmit,
    state: "idle",
    data: null,
  }),
}))

vi.mock("~/components/atoms/button/button", () => ({
  Button: ({
    children,
    to,
    linkProps,
    ...props
  }: {
    children: React.ReactNode
    to?: string
    linkProps?: Record<string, unknown>
  }) => (
    <a href={to} {...props} {...linkProps}>
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
    it("should only render view button for admin users", () => {
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

      expect(viewButton).toBeInTheDocument()
      expect(screen.queryByText(/Editar evento/i)).not.toBeInTheDocument()
    })

    it("should link to admin event view path", () => {
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

      expect(viewButton).toHaveAttribute(
        "href",
        "/admin/eventos/test-event-123",
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

      const applyButton = screen.getByText(/Me candidatar/i)
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

      const cancelButton = screen.getByText(/Cancelar candidatura/i)
      expect(cancelButton).toBeInTheDocument()
    })

    it("should render cancel button when user is applied and registrations closed", () => {
      render(
        <EventCardFooter
          eventId="test-event-id"
          event_status="Registration Closed"
          googleLink=""
          is_applied={true}
          dataTestId="test-footer"
          isAdmin={false}
        />,
      )

      const cancelButton = screen.getByText(/Cancelar candidatura/i)
      expect(cancelButton).toBeInTheDocument()
      expect(screen.queryByText(/Candidaturas encerradas/i)).not.toBeInTheDocument()
    })

    it("should render closed button when registrations closed and user is not applied", () => {
      render(
        <EventCardFooter
          eventId="test-event-id"
          event_status="Registration Closed"
          googleLink=""
          is_applied={false}
          dataTestId="test-footer"
          isAdmin={false}
        />,
      )

      const closedButton = screen.getByText(/Candidaturas encerradas/i)
      expect(closedButton).toBeInTheDocument()
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

      const applyButton = screen.getByText(/Me candidatar/i)
      expect(applyButton).toBeInTheDocument()
    })
  })

  describe("when directApply is true", () => {
    const renderFooter = (
      props: Partial<React.ComponentProps<typeof EventCardFooter>> = {},
    ) =>
      render(
        <EventCardFooter
          eventId="test-event-id"
          event_status="Registration Open"
          googleLink=""
          is_applied={false}
          dataTestId="test-footer"
          directApply={true}
          {...props}
        />,
      )

    it("should render the direct application alongside the ordinary one", () => {
      renderFooter()

      expect(screen.getByText(/Me candidatar/i)).toBeInTheDocument()
      expect(
        screen.getByText(/Candidatura direta \(admin\)/i),
      ).toBeInTheDocument()
    })

    it("should submit the direct application for the event", async () => {
      mockSubmit.mockClear()
      const user = userEvent.setup()

      renderFooter({ eventId: "event-123" })

      await user.click(screen.getByText(/Candidatura direta \(admin\)/i))

      expect(mockSubmit).toHaveBeenCalledWith(
        { fetchId: "handleAdminApply", eventId: "event-123" },
        { method: "POST" },
      )
    })

    it("should record the click that skipped the flow", async () => {
      mockTrack.mockClear()
      const user = userEvent.setup()

      renderFooter({ eventId: "event-123" })

      await user.click(screen.getByText(/Candidatura direta \(admin\)/i))

      expect(mockTrack).toHaveBeenCalledWith("event_direct_application_clicked", {
        eventId: "event-123",
      })
    })

    it("should not render it once the person has applied", () => {
      renderFooter({ is_applied: true })

      expect(
        screen.queryByText(/Candidatura direta \(admin\)/i),
      ).not.toBeInTheDocument()
    })

    it("should not render it once registrations are closed", () => {
      renderFooter({ event_status: "Registration Closed" })

      expect(
        screen.queryByText(/Candidatura direta \(admin\)/i),
      ).not.toBeInTheDocument()
    })

    it("should not render it for whoever did not ask for it", () => {
      renderFooter({ directApply: false })

      expect(screen.getByText(/Me candidatar/i)).toBeInTheDocument()
      expect(
        screen.queryByText(/Candidatura direta \(admin\)/i),
      ).not.toBeInTheDocument()
    })
  })
})
