import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import { render, screen, waitFor } from "~/test/test-utils"
import { AdminViewEventParticipantsTable } from "./view-event-participants-table"

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

const mockSessionStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      const { [key]: _, ...rest } = store
      store = rest
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
})()

Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
})

const createMockParticipant = (
  overrides: Partial<ProfileWithExtraData> = {},
): ProfileWithExtraData =>
  ({
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
    ...overrides,
  }) as unknown as ProfileWithExtraData

const mockParticipants = [createMockParticipant()]

const mockParticipantsMultiple = [
  createMockParticipant({
    id: "ep-1",
    profile_id: "profile-1",
    social_name: "Bia",
    full_name: "Beatriz Silva",
    is_veteran: true,
    application_status: "sent_payment_data",
    approved_to_attend: "approved",
  }),
  createMockParticipant({
    id: "ep-2",
    profile_id: "profile-2",
    social_name: "Carlos",
    full_name: "Carlos Santos",
    is_veteran: false,
    application_status: "pending",
    approved_to_attend: "pending",
  }),
  createMockParticipant({
    id: "ep-3",
    profile_id: "profile-3",
    social_name: "Diana",
    full_name: "Diana Costa",
    is_veteran: true,
    application_status: "finalised",
    approved_to_attend: "approved",
  }),
]

function renderWithRouter(
  participants: ProfileWithExtraData[] = mockParticipants,
) {
  return render(
    <MemoryRouter>
      <AdminViewEventParticipantsTable
        participants={participants}
        eventId="event-123"
      />
    </MemoryRouter>,
  )
}

describe("AdminViewEventParticipantsTable", () => {
  beforeEach(() => {
    mockSessionStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    mockSessionStorage.clear()
  })

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

    it("renders participant data in the table", async () => {
      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText("Bia")).toBeInTheDocument()
      })
    })

    it("renders empty message when no participants", async () => {
      renderWithRouter([])

      await waitFor(() => {
        expect(
          screen.getByText("Nenhum participante encontrado"),
        ).toBeInTheDocument()
      })
    })
  })

  describe("column configuration", () => {
    it("renders social_name column pinned left", () => {
      const { container } = renderWithRouter()

      const pinnedLeftCols = container.querySelector(
        ".ag-pinned-left-cols-container",
      )
      expect(pinnedLeftCols).toBeInTheDocument()
    })

    it("renders actions column pinned right", () => {
      const { container } = renderWithRouter()

      const pinnedRightCols = container.querySelector(
        ".ag-pinned-right-cols-container",
      )
      expect(pinnedRightCols).toBeInTheDocument()
    })

    it("renders expected column headers", async () => {
      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText("Nome")).toBeInTheDocument()
      })

      expect(screen.getByText("Vet ou Nov?")).toBeInTheDocument()
      expect(screen.getByText("Eventos")).toBeInTheDocument()
    })
  })

  describe("quick filter (search)", () => {
    it("renders search input", () => {
      renderWithRouter()

      expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument()
    })

    it("filters participants when searching", async () => {
      const user = userEvent.setup()
      renderWithRouter(mockParticipantsMultiple)

      await waitFor(() => {
        expect(screen.getByText("Bia")).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText("Buscar...")
      await user.type(searchInput, "Carlos")

      await waitFor(() => {
        expect(screen.getByText("Carlos")).toBeInTheDocument()
      })
    })
  })

  describe("participant statistics", () => {
    it("displays total participant count", () => {
      renderWithRouter(mockParticipantsMultiple)

      // Should show "3 inscrites" in the header statistics
      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText(/inscrites/)).toBeInTheDocument()
    })

    it("displays veteran and rookie labels in statistics", () => {
      renderWithRouter(mockParticipantsMultiple)

      // The header shows "Geral: X N Y V" - we check for the statistics section
      expect(screen.getByText("Geral:")).toBeInTheDocument()
      expect(screen.getByText("Aceites no processo:")).toBeInTheDocument()
    })
  })

  describe("session storage integration", () => {
    it("persists filter state to session storage", async () => {
      renderWithRouter()

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument()
      })

      // The component should set filter states in sessionStorage on mount
      expect(mockSessionStorage.setItem).toHaveBeenCalled()
    })
  })

  describe("pagination", () => {
    it("renders with pagination enabled", async () => {
      const { container } = renderWithRouter()

      await waitFor(() => {
        expect(screen.getByText("Bia")).toBeInTheDocument()
      })

      const paginationPanel = container.querySelector(".ag-paging-panel")
      expect(paginationPanel).toBeInTheDocument()
    })
  })

  describe("toolbar", () => {
    it("renders toolbar with maximize button", async () => {
      renderWithRouter()

      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument()
      })

      // The table has showToolbar=true, so it should render toolbar elements
      const testId = screen.getByTestId("ag-data-table-participants-table")
      expect(testId).toBeInTheDocument()
    })
  })
})
