import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMemoryRouter, RouterProvider } from "react-router"
import { toast } from "sonner"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { PaymentRequestRow } from "~/business/payment/payment-request.server"
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

const mockPaymentRequestAutomatic: PaymentRequestRow = {
  id: "pr-1",
  event_participant_id: "123",
  amount: 220,
  status: "pending",
  payment_mode: "automatic",
  payment_method: null,
  asaas_customer_id: null,
  asaas_payment_id: null,
  installment_count: null,
  invoice_url: null,
  paid_at: null,
  refunded_at: null,
  refund_amount: null,
  expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
}

const mockPaymentRequestManual: PaymentRequestRow = {
  ...mockPaymentRequestAutomatic,
  payment_mode: "manual",
}

const createTestRouter = (
  eventParticipant: EventParticipantWithEvent,
  paymentRequest?: PaymentRequestRow | null,
) => {
  return createMemoryRouter([
    {
      path: "/",
      element: (
        <ParticipantVsEventData
          eventParticipant={eventParticipant}
          paymentRequest={paymentRequest}
        />
      ),
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

    it("should render payment type selector", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.getByLabelText(/tipo de pagamento/i)).toBeInTheDocument()
    })

    it("should NOT render has_paid checkbox", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.queryByLabelText(/^pago$/i)).not.toBeInTheDocument()
    })

    it("should NOT render payment number input", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.queryByLabelText(/^pagamento$/i)).not.toBeInTheDocument()
    })

    it("should render admin_general_notes textarea", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.getByLabelText(/notas gerais do evento/i)).toBeInTheDocument()
    })
  })

  describe("payment type selector", () => {
    it("should default to automatic when no payment request exists", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      const trigger = screen.getByLabelText(/tipo de pagamento/i)
      expect(trigger).toHaveTextContent("Automático")
    })

    it("should default to manual when payment request is manual", () => {
      const router = createTestRouter(mockEventParticipant, mockPaymentRequestManual)
      render(<RouterProvider router={router} />)

      const trigger = screen.getByLabelText(/tipo de pagamento/i)
      expect(trigger).toHaveTextContent("Manual")
    })

    it("should send payment_mode when application_status changes to sent_payment_data", async () => {
      const user = userEvent.setup()
      const participant = { ...mockEventParticipant, application_status: "pending" as const }
      const router = createTestRouter(participant)
      render(<RouterProvider router={router} />)

      const select = screen.getByLabelText(/status de inscrição/i)
      await user.click(select)

      const options = await screen.findAllByRole("option", { name: /dados de pagto enviados/i })
      await user.click(options[0])

      await waitFor(() => {
        expect(mockFetcher.submit).toHaveBeenCalled()
      })

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData
      expect(formData.get("payment_mode")).toBe("automatic")
      expect(formData.get("application_status")).toBe("sent_payment_data")
    })
  })

  describe("auto-save behavior", () => {
    it("should auto-save when attendance_status changes", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      const select = screen.getByLabelText(/status de presença/i)
      await user.click(select)

      const options = await screen.findAllByRole("option", { name: /compareceu/i })
      await user.click(options[0])

      await waitFor(() => {
        expect(mockFetcher.submit).toHaveBeenCalled()
      })

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData
      expect(formData.get("attendance_status")).toBe("attended")
      expect(formData.get("intent")).toBe("update-event-participant")
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

  describe("resend button visibility", () => {
    it("should show Reenviar link when automatic and sent_payment_data", () => {
      const participant = {
        ...mockEventParticipant,
        application_status: "sent_payment_data" as const,
      }
      const router = createTestRouter(participant, mockPaymentRequestAutomatic)
      render(<RouterProvider router={router} />)

      expect(screen.getByRole("button", { name: /reenviar link/i })).toBeInTheDocument()
    })

    it("should NOT show Reenviar link when manual and sent_payment_data", () => {
      const participant = {
        ...mockEventParticipant,
        application_status: "sent_payment_data" as const,
      }
      const router = createTestRouter(participant, mockPaymentRequestManual)
      render(<RouterProvider router={router} />)

      expect(screen.queryByRole("button", { name: /reenviar link/i })).not.toBeInTheDocument()
    })

    it("should NOT show Reenviar link when no payment request", () => {
      const participant = {
        ...mockEventParticipant,
        application_status: "sent_payment_data" as const,
      }
      const router = createTestRouter(participant)
      render(<RouterProvider router={router} />)

      expect(screen.queryByRole("button", { name: /reenviar link/i })).not.toBeInTheDocument()
    })
  })

  describe("refund button visibility", () => {
    it("should show Reembolsar when automatic and paid", () => {
      const paidRequest = { ...mockPaymentRequestAutomatic, status: "paid" as const }
      const router = createTestRouter(mockEventParticipant, paidRequest)
      render(<RouterProvider router={router} />)

      expect(screen.getByRole("button", { name: /reembolsar/i })).toBeInTheDocument()
    })

    it("should NOT show Reembolsar when manual and paid", () => {
      const paidRequest = { ...mockPaymentRequestManual, status: "paid" as const }
      const router = createTestRouter(mockEventParticipant, paidRequest)
      render(<RouterProvider router={router} />)

      expect(screen.queryByRole("button", { name: /^reembolsar$/i })).not.toBeInTheDocument()
    })
  })

  describe("manual payment controls", () => {
    it("should show Marcar como pago when manual and pending", () => {
      const router = createTestRouter(mockEventParticipant, mockPaymentRequestManual)
      render(<RouterProvider router={router} />)

      expect(screen.getByRole("button", { name: /marcar como pago/i })).toBeInTheDocument()
    })

    it("should show manual amount input when manual and pending", () => {
      const router = createTestRouter(mockEventParticipant, mockPaymentRequestManual)
      render(<RouterProvider router={router} />)

      expect(screen.getByLabelText(/valor:/i)).toBeInTheDocument()
    })

    it("should show Salvar valor button when manual and pending", () => {
      const router = createTestRouter(mockEventParticipant, mockPaymentRequestManual)
      render(<RouterProvider router={router} />)

      expect(screen.getByRole("button", { name: /salvar valor/i })).toBeInTheDocument()
    })

    it("should show Marcar como reembolsado when manual and paid", () => {
      const paidManual = { ...mockPaymentRequestManual, status: "paid" as const }
      const router = createTestRouter(mockEventParticipant, paidManual)
      render(<RouterProvider router={router} />)

      expect(screen.getByRole("button", { name: /marcar como reembolsado/i })).toBeInTheDocument()
    })

    it("should NOT show manual controls when automatic", () => {
      const router = createTestRouter(mockEventParticipant, mockPaymentRequestAutomatic)
      render(<RouterProvider router={router} />)

      expect(screen.queryByRole("button", { name: /marcar como pago/i })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /marcar como reembolsado/i })).not.toBeInTheDocument()
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
