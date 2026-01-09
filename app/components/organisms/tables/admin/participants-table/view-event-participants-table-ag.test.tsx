import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { AdminViewEventParticipantsTableAG } from "./view-event-participants-table-ag"

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    useFetcher: () => ({
      submit: vi.fn(),
      state: "idle",
      data: null,
    }),
  }
})

const mockParticipants = [
  {
    profile_id: "profile-1",
    id: "ep-1",
    social_name: "Bia",
    full_name: "Beatriz Silva",
    is_veteran: true,
    attended_events_count: 3,
    last_attended_event_id: "event-prev",
    last_attended_event_title: "Retiro de Verão",
    last_attended_event_date: "2024-06-15T10:00:00Z",
    flag: null,
    flag_notes: null,
    pronouns: ["ela/dela"],
    gender: ["mulher_cis"],
    orientation: ["bi"],
    phone: "11999999999",
    application_status: "payment_data_sent",
    attendance_status: "pending",
    approved_to_attend: "approved",
    has_paid: false,
    payment: 100,
    spot_type: "regular",
    companions: null,
    notes: null,
    admin_general_notes: null,
    was_admin_skipped_last_event: false,
  },
] as unknown as ProfileWithExtraData[]

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <AdminViewEventParticipantsTableAG
        participants={mockParticipants}
        eventId="event-123"
      />
    </MemoryRouter>
  )
}

describe("AdminViewEventParticipantsTableAG", () => {
  describe("rendering", () => {
    it("renders the AG Grid table", () => {
      renderWithRouter()

      expect(screen.getByRole("grid")).toBeInTheDocument()
    })

    it("renders the header with title", () => {
      renderWithRouter()

      expect(screen.getByText("Inscrições")).toBeInTheDocument()
    })

    it("renders participant count statistics", () => {
      renderWithRouter()

      expect(screen.getByText(/inscrites/)).toBeInTheDocument()
    })
  })

  describe("column configuration", () => {
    it("renders social_name column pinned left", () => {
      const { container } = renderWithRouter()

      const pinnedLeftCols = container.querySelector(".ag-pinned-left-cols-container")
      expect(pinnedLeftCols).toBeInTheDocument()
    })

    it("renders actions column pinned right", () => {
      const { container } = renderWithRouter()

      const pinnedRightCols = container.querySelector(".ag-pinned-right-cols-container")
      expect(pinnedRightCols).toBeInTheDocument()
    })
  })
})
