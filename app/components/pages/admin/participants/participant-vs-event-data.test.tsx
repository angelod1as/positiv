import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { EventParticipantWithEvent } from "~types/database/entities.types"
import { ParticipantVsEventData } from "./participant-vs-event-data"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const createMockFetcher = (data?: { success: boolean; intent?: string; errors?: Record<string, string[]> }) => ({
  submit: vi.fn(),
  state: "idle" as const,
  formData: undefined,
  data,
  formAction: undefined,
  formMethod: undefined,
  formEncType: undefined,
  text: undefined,
  json: undefined,
  key: "",
  Form: () => null,
  load: vi.fn(),
})

let mockFetcher = createMockFetcher()

vi.mock("react-router", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-router")>()
  return {
    ...original,
    useFetcher: () => mockFetcher,
  }
})

const mockEventParticipant: EventParticipantWithEvent = {
  id: "123",
  event_id: "event-123",
  profile_id: "profile-123",
  application_date: "2024-01-01",
  application_status: "finalised",
  attendance_status: "pending",
  spot_type: "regular",
  payment: 100,
  has_paid: false,
  admin_general_notes: "Some admin notes",
  bond: "Test bond",
  companions: "Test companions",
  notes: "Test notes",
  referrals: "Test referrals",
  referred: "Test referred",
  event_title: "Test Event",
  event_emoji: "🎉",
  is_user_applied: true,
  cancellation_date: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
  was_selected_for_rotation: false,
}

const createTestRouter = (eventParticipant: EventParticipantWithEvent) => {
  return createMemoryRouter([
    {
      path: "/",
      element: <ParticipantVsEventData eventParticipant={eventParticipant} />,
    },
  ])
}

describe("ParticipantVsEventData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetcher = createMockFetcher()
  })

  describe("No Salvar button - auto-save instead", () => {
    it("should NOT render a Salvar button", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.queryByRole("button", { name: /salvar/i })).not.toBeInTheDocument()
    })
  })

  describe("renders form fields", () => {
    it("should render attendance status select", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.getByLabelText(/status de presença/i)).toBeInTheDocument()
    })

    it("should render application status select", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.getByLabelText(/status de inscrição/i)).toBeInTheDocument()
    })

    it("should render spot type select", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.getByLabelText(/tipo de vaga/i)).toBeInTheDocument()
    })

    it("should render payment input", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.getByLabelText(/pagamento/i)).toBeInTheDocument()
    })

    it("should render has_paid checkbox", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.getByLabelText(/pago/i)).toBeInTheDocument()
    })

    it("should render admin_general_notes textarea", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.getByLabelText(/notas gerais do evento/i)).toBeInTheDocument()
    })
  })

  describe("auto-save behavior", () => {
    it("should auto-save when attendance_status changes", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      const select = screen.getByLabelText(/status de presença/i)
      await user.click(select)

      // Use getAllByRole and select the first match to handle radix portal duplicates
      const options = await screen.findAllByRole("option", { name: /compareceu/i })
      await user.click(options[0])

      await waitFor(() => {
        expect(mockFetcher.submit).toHaveBeenCalled()
      })

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData
      expect(formData.get("attendance_status")).toBe("attended")
      expect(formData.get("intent")).toBe("update-event-participant")
    })

    it("should auto-save when has_paid checkbox changes", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      const checkbox = screen.getByLabelText(/pago/i)
      await user.click(checkbox)

      await waitFor(() => {
        expect(mockFetcher.submit).toHaveBeenCalled()
      })

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData
      expect(formData.get("has_paid")).toBe("true")
    })

    it("should auto-save admin_general_notes on blur", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      const textarea = screen.getByLabelText(/notas gerais do evento/i)
      await user.clear(textarea)
      await user.type(textarea, "New notes for this event")
      await user.tab()

      await waitFor(() => {
        expect(mockFetcher.submit).toHaveBeenCalled()
      })

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData
      expect(formData.get("admin_general_notes")).toBe("New notes for this event")
    })
  })

  describe("toast feedback", () => {
    it("should show success toast when save succeeds", async () => {
      mockFetcher = createMockFetcher({ success: true, intent: "update-event-participant" })

      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Dados atualizados com sucesso")
      })
    })

    it("should show error toast when save fails", async () => {
      mockFetcher = createMockFetcher({ success: false, intent: "update-event-participant" })

      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Erro ao salvar")
      })
    })
  })

  describe("displays participant responses", () => {
    it("should display bond response", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.getByText("Test bond")).toBeInTheDocument()
    })

    it("should display companions response", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.getByText("Test companions")).toBeInTheDocument()
    })

    it("should display notes response", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.getByText("Test notes")).toBeInTheDocument()
    })
  })
})
