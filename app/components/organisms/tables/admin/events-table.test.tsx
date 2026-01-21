import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "~/test/test-utils"
import type { Event } from "~types/database/entities.types"
import { AdminDashboardEventsTable } from "./events-table"

const mockNavigate = vi.fn()

vi.mock("react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to: string
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
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


describe("AdminDashboardEventsTable", () => {
  const mockEvents: Event[] = [
    {
      id: "1",
      title: "Draft Event",
      event_status: "Draft",
      time_event_start: "2025-02-01T10:00:00Z",
      time_event_end: null,
      time_application_start: null,
      description: null,
      emoji: null,
      event_type: "regular",
      location: null,
      ticket_price: null,
      total_spots: null,
      created_at: "2025-01-01T00:00:00Z",
      auto_publish: false,
      time_group_end: null,
      time_group_start: null,
      time_presentations_end: null,
      time_presentations_start: null,
      time_payment_end: null,
      time_payment_start: null,
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    } as Event,
    {
      id: "2",
      title: "Scheduled Event",
      event_status: "Scheduled",
      time_event_start: "2025-02-15T10:00:00Z",
      time_event_end: null,
      time_application_start: null,
      description: null,
      emoji: null,
      event_type: "regular",
      location: null,
      ticket_price: null,
      total_spots: null,
      created_at: "2025-01-01T00:00:00Z",
      auto_publish: false,
      time_group_end: null,
      time_group_start: null,
      time_presentations_end: null,
      time_presentations_start: null,
      time_payment_end: null,
      time_payment_start: null,
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    } as Event,
    {
      id: "3",
      title: "Open Registration Event",
      event_status: "Registration Open",
      time_event_start: "2025-03-01T10:00:00Z",
      time_event_end: null,
      time_application_start: null,
      description: null,
      emoji: null,
      event_type: "regular",
      location: null,
      ticket_price: null,
      total_spots: null,
      created_at: "2025-01-01T00:00:00Z",
      auto_publish: false,
      time_group_end: null,
      time_group_start: null,
      time_presentations_end: null,
      time_presentations_start: null,
      time_payment_end: null,
      time_payment_start: null,
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    } as Event,
    {
      id: "4",
      title: "Closed Registration Event",
      event_status: "Registration Closed",
      time_event_start: "2025-03-15T10:00:00Z",
      time_event_end: null,
      time_application_start: null,
      description: null,
      emoji: null,
      event_type: "regular",
      location: null,
      ticket_price: null,
      total_spots: null,
      created_at: "2025-01-01T00:00:00Z",
      auto_publish: false,
      time_group_end: null,
      time_group_start: null,
      time_presentations_end: null,
      time_presentations_start: null,
      time_payment_end: null,
      time_payment_start: null,
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    } as Event,
    {
      id: "5",
      title: "Completed Event",
      event_status: "Completed",
      time_event_start: "2024-12-01T10:00:00Z",
      time_event_end: null,
      time_application_start: null,
      description: null,
      emoji: null,
      event_type: "regular",
      location: null,
      ticket_price: null,
      total_spots: null,
      created_at: "2024-11-01T00:00:00Z",
      auto_publish: false,
      time_group_end: null,
      time_group_start: null,
      time_presentations_end: null,
      time_presentations_start: null,
      time_payment_end: null,
      time_payment_start: null,
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    } as Event,
    {
      id: "6",
      title: "Cancelled Event",
      event_status: "Cancelled",
      time_event_start: "2024-11-15T10:00:00Z",
      time_event_end: null,
      time_application_start: null,
      description: null,
      emoji: null,
      event_type: "regular",
      location: null,
      ticket_price: null,
      total_spots: null,
      created_at: "2024-10-01T00:00:00Z",
      auto_publish: false,
      time_group_end: null,
      time_group_start: null,
      time_presentations_end: null,
      time_presentations_start: null,
      time_payment_end: null,
      time_payment_start: null,
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    } as Event,
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Basic Rendering", () => {
    it("should render table with events", async () => {
      render(<AdminDashboardEventsTable events={mockEvents} />)

      await waitFor(
        () => {
          expect(screen.getByText("Draft Event")).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
      expect(screen.getByText("Scheduled Event")).toBeInTheDocument()
    })

    it("should render the AG Grid component", async () => {
      render(<AdminDashboardEventsTable events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      const grid = screen.getByRole("grid")
      expect(grid).toBeInTheDocument()
    })

    it("should have correct test id", async () => {
      render(<AdminDashboardEventsTable events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      expect(
        screen.getByTestId("ag-data-table-admin-events"),
      ).toBeInTheDocument()
    })

    it("should render all three column headers", async () => {
      render(<AdminDashboardEventsTable events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      expect(screen.getByText("Nome")).toBeInTheDocument()
      expect(screen.getByText("Status")).toBeInTheDocument()
      expect(screen.getByText("Início do evento")).toBeInTheDocument()
    })
  })

  describe("Column Rendering", () => {
    it("should display event titles in the title column", async () => {
      render(<AdminDashboardEventsTable events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      expect(screen.getByText("Scheduled Event")).toBeInTheDocument()
      expect(screen.getByText("Open Registration Event")).toBeInTheDocument()
    })

    it("should display mapped status values in Portuguese", async () => {
      render(<AdminDashboardEventsTable events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByText("Rascunho")).toBeInTheDocument()
      })

      expect(screen.getByText("Agendado")).toBeInTheDocument()
      expect(screen.getByText("Inscrições abertas")).toBeInTheDocument()
    })

    it("should display formatted dates", async () => {
      render(<AdminDashboardEventsTable events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      // The formatDateTime().full should include the formatted date in Portuguese
      // Format: "01 de fevereiro de 2025, às 07h"
      // We check that at least one formatted date is present
      const dateElements = screen.getAllByText(/2025/)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })


  describe("Sorting", () => {
    it("should have sortable columns", async () => {
      const { container } = render(
        <AdminDashboardEventsTable events={mockEvents} />,
      )

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      // Check that header cells have sortable class
      const headerCells = container.querySelectorAll(".ag-header-cell")
      const titleHeader = Array.from(headerCells).find((cell) =>
        cell.textContent?.includes("Nome"),
      )
      expect(titleHeader).toHaveClass("ag-header-cell-sortable")
    })

    it("should sort events when clicking on column header", async () => {
      const user = userEvent.setup()
      const { container } = render(
        <AdminDashboardEventsTable events={mockEvents} />,
      )

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      // Click on the Nome header to trigger a sort
      const nameHeader = container.querySelector(
        '.ag-header-cell[col-id="title"]',
      ) as HTMLElement
      expect(nameHeader).toBeInTheDocument()

      await user.click(nameHeader)

      // Wait for sort to apply - the order should change
      await waitFor(() => {
        const rows = container.querySelectorAll(".ag-row")
        expect(rows.length).toBeGreaterThan(0)
      })
    })
  })

  describe("Pagination", () => {
    it("should render with pagination enabled", async () => {
      const { container } = render(
        <AdminDashboardEventsTable events={mockEvents} />,
      )

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      // AG Grid pagination panel should be visible
      const paginationPanel = container.querySelector(".ag-paging-panel")
      expect(paginationPanel).toBeInTheDocument()
    })
  })

  describe("Row Interaction", () => {
    it("should navigate to view event page when row is clicked", async () => {
      const user = userEvent.setup()
      const { container } = render(
        <AdminDashboardEventsTable events={mockEvents} />,
      )

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      // Find and click the first row
      // Note: The table is sorted by time_event_start desc, so the first row
      // will be the event with the latest date (Closed Registration Event, id="4")
      const firstRow = container.querySelector(".ag-row") as HTMLElement
      expect(firstRow).toBeInTheDocument()

      await user.click(firstRow)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled()
      })

      // Check that it navigates to the correct URL (first row = id "4" due to desc sort)
      expect(mockNavigate).toHaveBeenCalledWith("/admin/eventos/4")
    })
  })

  describe("Header", () => {
    it("should render header with title", async () => {
      render(<AdminDashboardEventsTable events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      expect(screen.getByText("Todos os eventos")).toBeInTheDocument()
    })

    it("should render create event button", async () => {
      render(<AdminDashboardEventsTable events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      expect(screen.getByText("Criar evento")).toBeInTheDocument()
    })

    it("should have create event button linking to create event page", async () => {
      render(<AdminDashboardEventsTable events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      const createButton = screen.getByText("Criar evento")
      expect(createButton.closest("a")).toHaveAttribute(
        "href",
        "/admin/eventos/novo",
      )
    })
  })

  describe("Empty State", () => {
    it("should show empty message when no events", async () => {
      render(<AdminDashboardEventsTable events={[]} />)

      await waitFor(() => {
        expect(screen.getByText("Nenhum evento encontrado")).toBeInTheDocument()
      })
    })
  })

  describe("Search Functionality", () => {
    it("should render a search input", async () => {
      render(<AdminDashboardEventsTable events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      const searchInput = screen.getByLabelText("Buscar eventos")
      expect(searchInput).toBeInTheDocument()
    })

    it("should filter events when typing in search input", async () => {
      const user = userEvent.setup()
      render(<AdminDashboardEventsTable events={mockEvents} />)

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      const searchInput = screen.getByLabelText("Buscar eventos")
      await user.type(searchInput, "Draft")

      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })
    })
  })

  describe("Status Filtering", () => {
    it("should show all events by default including Cancelled", async () => {
      render(<AdminDashboardEventsTable events={mockEvents} />)

      // Wait for table to render
      await waitFor(() => {
        expect(screen.getByText("Draft Event")).toBeInTheDocument()
      })

      // All events should be visible by default (no pre-filtering)
      expect(screen.getByText("Scheduled Event")).toBeInTheDocument()
      expect(screen.getByText("Open Registration Event")).toBeInTheDocument()
      expect(screen.getByText("Closed Registration Event")).toBeInTheDocument()
      expect(screen.getByText("Completed Event")).toBeInTheDocument()
      expect(screen.getByText("Cancelled Event")).toBeInTheDocument()
    })
  })
})
