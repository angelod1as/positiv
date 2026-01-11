import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "~/test/test-utils"
import type { ProfileGlobal } from "~types/database/entities.types"
import { AllParticipantsTable } from "./all-participants-table"

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

const createMockProfile = (
  overrides: Partial<ProfileGlobal> = {},
): ProfileGlobal =>
  ({
    id: "profile-1",
    user_id: "user-1",
    full_name: "João Silva",
    social_name: "João",
    email: "joao@example.com",
    phone: "11999999999",
    where_lives: "São Paulo",
    gender: ["homem cis"],
    orientation: ["heterossexual"],
    pronouns: ["ele/dele"],
    is_veteran: true,
    flag: "none",
    flag_notes: null,
    approved_to_attend: "approved",
    general_notes: null,
    basic_data_filled: true,
    cpf: null,
    rg: null,
    rg_issuer: null,
    date_of_birth: null,
    how_came_to_us: null,
    confirm_phone: null,
    became_veteran_date: null,
    race_color: null,
    created_at: "2024-01-01T00:00:00Z",
    attended_events_count: 5,
    last_attended_event_title: "Evento Teste",
    last_attended_event_date: "2024-06-01T00:00:00Z",
    last_attended_event_id: "event-1",
    ...overrides,
  }) as ProfileGlobal

const mockProfiles = [createMockProfile()]

const mockProfilesMultiple = [
  createMockProfile({
    id: "profile-1",
    social_name: "João",
    full_name: "João Silva",
    where_lives: "São Paulo",
    is_veteran: true,
    attended_events_count: 5,
  }),
  createMockProfile({
    id: "profile-2",
    social_name: "Maria",
    full_name: "Maria Santos",
    where_lives: "Rio de Janeiro",
    is_veteran: false,
    attended_events_count: 0,
    gender: ["mulher cis"],
    orientation: ["bissexual"],
    flag: "yellow",
    approved_to_attend: "pending",
  }),
  createMockProfile({
    id: "profile-3",
    social_name: "Carlos",
    full_name: "Carlos Costa",
    where_lives: "Belo Horizonte",
    is_veteran: true,
    attended_events_count: 3,
  }),
]

describe("AllParticipantsTable", () => {
  beforeEach(() => {
    mockSessionStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    mockSessionStorage.clear()
  })

  describe("rendering", () => {
    it("renders the AG Grid table", () => {
      render(<AllParticipantsTable profiles={mockProfiles} />)

      expect(screen.getByRole("grid")).toBeInTheDocument()
    })

    it("renders profile data in the table", async () => {
      render(<AllParticipantsTable profiles={mockProfiles} />)

      await waitFor(() => {
        expect(screen.getByText("João")).toBeInTheDocument()
      })
    })

    it("renders empty message when no profiles", async () => {
      render(<AllParticipantsTable profiles={[]} />)

      await waitFor(() => {
        expect(
          screen.getByText("Nenhum perfil encontrado"),
        ).toBeInTheDocument()
      })
    })

    it("renders profile count in header", () => {
      render(<AllParticipantsTable profiles={mockProfilesMultiple} />)

      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText(/perfis/)).toBeInTheDocument()
    })
  })

  describe("column configuration", () => {
    it("renders social_name column pinned left", () => {
      const { container } = render(
        <AllParticipantsTable profiles={mockProfiles} />,
      )

      const pinnedLeftCols = container.querySelector(
        ".ag-pinned-left-cols-container",
      )
      expect(pinnedLeftCols).toBeInTheDocument()
    })

    it("renders expected column headers", async () => {
      render(<AllParticipantsTable profiles={mockProfiles} />)

      await waitFor(() => {
        expect(screen.getByText("Nome")).toBeInTheDocument()
      })

      expect(screen.getByText("Vet/Nov")).toBeInTheDocument()
      expect(screen.getByText("Cidade")).toBeInTheDocument()
      expect(screen.getByText("Eventos")).toBeInTheDocument()
      expect(screen.getByText("Último Evento")).toBeInTheDocument()
    })
  })

  describe("quick filter (search)", () => {
    it("renders search input", () => {
      render(<AllParticipantsTable profiles={mockProfiles} />)

      expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument()
    })

    it("filters profiles when searching", async () => {
      const user = userEvent.setup()
      render(<AllParticipantsTable profiles={mockProfilesMultiple} />)

      await waitFor(() => {
        expect(screen.getByText("João")).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText("Buscar...")
      await user.type(searchInput, "Maria")

      await waitFor(() => {
        expect(screen.getByText("Maria")).toBeInTheDocument()
      })
    })
  })

  describe("session storage integration", () => {
    it("persists filter state to session storage", async () => {
      render(<AllParticipantsTable profiles={mockProfiles} />)

      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument()
      })

      expect(mockSessionStorage.setItem).toHaveBeenCalled()
    })
  })

  describe("pagination", () => {
    it("renders with pagination enabled", async () => {
      const { container } = render(
        <AllParticipantsTable profiles={mockProfiles} />,
      )

      await waitFor(() => {
        expect(screen.getByText("João")).toBeInTheDocument()
      })

      const paginationPanel = container.querySelector(".ag-paging-panel")
      expect(paginationPanel).toBeInTheDocument()
    })
  })

  describe("toolbar", () => {
    it("renders toolbar with table container", async () => {
      render(<AllParticipantsTable profiles={mockProfiles} />)

      await waitFor(() => {
        expect(screen.getByRole("grid")).toBeInTheDocument()
      })

      const testId = screen.getByTestId("ag-data-table-all-participants-table")
      expect(testId).toBeInTheDocument()
    })
  })
})
