import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "~/test/test-utils"
import type { ProfileGlobal } from "~types/database/entities.types"
import { RecentProfilesTable } from "./recent-profiles-table"

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
}))

vi.mock("~/components/atoms/link/link", () => ({
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
}))

describe("RecentProfilesTable", () => {
  const mockProfiles: ProfileGlobal[] = [
    {
      id: "1",
      social_name: "Ana",
      full_name: "Ana Silva",
      created_at: "2025-01-15T10:00:00Z",
      gender: ["mulher cis"],
      orientation: ["bissexual"],
      is_veteran: false,
      approved_to_attend: "approved",
      attended_events_count: 2,
      last_attended_event_title: "Evento X",
      last_attended_event_date: "2024-12-01T10:00:00Z",
      last_attended_event_id: "event-1",
      user_id: "user-1",
      cpf: null,
      date_of_birth: null,
      email: "ana@test.com",
      where_lives: "Sao Paulo",
      how_came_to_us: null,
      phone: null,
      confirm_phone: null,
      rg: null,
      rg_issuer: null,
      pronouns: null,
      basic_data_filled: true,
      became_veteran_date: null,
      flag: "none",
      flag_notes: null,
      general_notes: null,
      race_color: null,
    } as ProfileGlobal,
    {
      id: "2",
      social_name: null,
      full_name: "Bruno Santos",
      created_at: "2025-01-14T10:00:00Z",
      gender: ["homem cis"],
      orientation: ["heterossexual"],
      is_veteran: true,
      approved_to_attend: "pending",
      attended_events_count: 5,
      last_attended_event_title: "Evento Y",
      last_attended_event_date: "2024-11-15T10:00:00Z",
      last_attended_event_id: "event-2",
      user_id: "user-2",
      cpf: null,
      date_of_birth: null,
      email: "bruno@test.com",
      where_lives: "Rio de Janeiro",
      how_came_to_us: null,
      phone: null,
      confirm_phone: null,
      rg: null,
      rg_issuer: null,
      pronouns: null,
      basic_data_filled: true,
      became_veteran_date: "2024-06-01T10:00:00Z",
      flag: "none",
      flag_notes: null,
      general_notes: null,
      race_color: null,
    } as ProfileGlobal,
  ]

  describe("Basic Rendering", () => {
    it("should render the table with profiles", async () => {
      render(<RecentProfilesTable profiles={mockProfiles} />)

      await waitFor(
        () => {
          expect(screen.getByText("Ana")).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it("should render the AG Grid component", async () => {
      render(<RecentProfilesTable profiles={mockProfiles} />)

      await waitFor(() => {
        expect(screen.getByText("Ana")).toBeInTheDocument()
      })

      const grid = screen.getByRole("grid")
      expect(grid).toBeInTheDocument()
    })

    it("should have correct test id", async () => {
      render(<RecentProfilesTable profiles={mockProfiles} />)

      await waitFor(() => {
        expect(screen.getByText("Ana")).toBeInTheDocument()
      })

      expect(
        screen.getByTestId("ag-data-table-recent-profiles"),
      ).toBeInTheDocument()
    })
  })

  describe("Column Rendering", () => {
    it("should display social name when available", async () => {
      render(<RecentProfilesTable profiles={mockProfiles} />)

      await waitFor(() => {
        expect(screen.getByText("Ana")).toBeInTheDocument()
      })
    })

    it("should display first name in italics when social name is not available", async () => {
      render(<RecentProfilesTable profiles={mockProfiles} />)

      await waitFor(() => {
        // Bruno has no social_name, so first name should be shown
        const brunoElement = screen.getByText("Bruno")
        expect(brunoElement.tagName.toLowerCase()).toBe("i")
      })
    })

    it("should display full name column", async () => {
      render(<RecentProfilesTable profiles={mockProfiles} />)

      await waitFor(() => {
        expect(screen.getByText("Ana Silva")).toBeInTheDocument()
      })

      expect(screen.getByText("Bruno Santos")).toBeInTheDocument()
    })

    it("should display formatted created_at date", async () => {
      render(<RecentProfilesTable profiles={mockProfiles} />)

      await waitFor(() => {
        expect(screen.getByText("Ana")).toBeInTheDocument()
      })

      // Should show formatted date (numeric format like "15/01/25")
      const dateElements = screen.getAllByText(/\d{2}\/\d{2}\/\d{2}/)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })

  describe("Profile Links", () => {
    it("should render profile links with correct href", async () => {
      render(<RecentProfilesTable profiles={mockProfiles} />)

      await waitFor(() => {
        expect(screen.getByText("Ana")).toBeInTheDocument()
      })

      const anaLink = screen.getByText("Ana").closest("a")
      expect(anaLink).toHaveAttribute("href", "/admin/participantes/1")
    })
  })

  describe("Empty State", () => {
    it("should show empty message when no profiles", async () => {
      render(<RecentProfilesTable profiles={[]} />)

      await waitFor(() => {
        expect(screen.getByText("Nenhum perfil recente")).toBeInTheDocument()
      })
    })
  })
})
