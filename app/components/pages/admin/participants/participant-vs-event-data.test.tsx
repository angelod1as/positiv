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

    it("should render payment input", () => {
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      expect(screen.getByLabelText(/pagamento/i)).toBeInTheDocument()
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

  describe("payment status section", () => {
    const paidRequest: PaymentRequestRow = {
      id: "pr-1",
      event_participant_id: "123",
      amount: 220,
      status: "paid",
      payment_mode: "automatic",
      payment_method: "PIX",
      installment_count: 1,
      asaas_customer_id: "cus_1",
      asaas_payment_id: "pay_1",
      invoice_url: "https://sandbox.asaas.com/i/pay_1",
      expires_at: "2099-12-31T00:00:00.000Z",
      paid_at: "2026-01-01T00:00:00.000Z",
      refund_amount: null,
      refunded_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    }

    it("renders Payment Status Section when paymentRequest exists", () => {
      const router = createTestRouter(mockEventParticipant, paidRequest)
      render(<RouterProvider router={router} />)

      expect(screen.getByRole("heading", { level: 4, name: /pagamento/i })).toBeInTheDocument()
    })

    it("renders Reembolsar button when status is paid with Asaas id", () => {
      const router = createTestRouter(mockEventParticipant, paidRequest)
      render(<RouterProvider router={router} />)

      expect(screen.getByRole("button", { name: /reembolsar/i })).toBeInTheDocument()
    })

    it("renders Cancelar pagamento button when status is awaiting_payment (automatic)", () => {
      const awaitingRequest: PaymentRequestRow = {
        ...paidRequest,
        status: "awaiting_payment",
        paid_at: null,
      }
      const router = createTestRouter(mockEventParticipant, awaitingRequest)
      render(<RouterProvider router={router} />)

      expect(screen.getByRole("button", { name: /cancelar pagamento/i })).toBeInTheDocument()
    })

    it("does NOT render cancel button when status is paid", () => {
      const router = createTestRouter(mockEventParticipant, paidRequest)
      render(<RouterProvider router={router} />)

      expect(screen.queryByRole("button", { name: /cancelar pagamento/i })).not.toBeInTheDocument()
    })

    it("does NOT render Reembolsar button when status is not paid", () => {
      const pendingRequest: PaymentRequestRow = {
        ...paidRequest,
        status: "pending",
        paid_at: null,
      }
      const router = createTestRouter(mockEventParticipant, pendingRequest)
      render(<RouterProvider router={router} />)

      expect(screen.queryByRole("button", { name: /reembolsar/i })).not.toBeInTheDocument()
    })

    it("renders Reenviar link button when status is sent_payment_data and payment is pending automatic", () => {
      const awaitingRequest: PaymentRequestRow = {
        ...paidRequest,
        status: "awaiting_payment",
        paid_at: null,
      }
      const router = createTestRouter(
        { ...mockEventParticipant, application_status: "sent_payment_data" },
        awaitingRequest,
      )
      render(<RouterProvider router={router} />)

      expect(screen.getByRole("button", { name: /reenviar link/i })).toBeInTheDocument()
    })
  })

  describe("custom amount flow", () => {
    const awaitingRequest: PaymentRequestRow = {
      id: "pr-1",
      event_participant_id: "123",
      amount: 220,
      status: "awaiting_payment",
      payment_mode: "automatic",
      payment_method: "PIX",
      installment_count: 1,
      asaas_customer_id: "cus_1",
      asaas_payment_id: "pay_1",
      invoice_url: "https://sandbox.asaas.com/i/pay_1",
      expires_at: "2099-12-31T00:00:00.000Z",
      paid_at: null,
      refund_amount: null,
      refunded_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    }

    it("renders the custom amount checkbox", () => {
      const router = createTestRouter(mockEventParticipant, awaitingRequest)
      render(<RouterProvider router={router} />)

      expect(screen.getByRole("checkbox", { name: /valor customizado/i })).toBeInTheDocument()
    })

    it("does NOT send custom_amount on resend when checkbox is off", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(
        { ...mockEventParticipant, application_status: "sent_payment_data" },
        awaitingRequest,
      )
      render(<RouterProvider router={router} />)

      await user.click(screen.getByRole("button", { name: /reenviar link/i }))

      await waitFor(() => {
        expect(mockFetcher.submit).toHaveBeenCalled()
      })

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData
      expect(formData.get("intent")).toBe("resend-payment-link")
      expect(formData.get("custom_amount")).toBeNull()
    })

    it("sends custom_amount on resend when checkbox is on and value is entered", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(
        { ...mockEventParticipant, application_status: "sent_payment_data" },
        awaitingRequest,
      )
      render(<RouterProvider router={router} />)

      await user.click(screen.getByRole("checkbox", { name: /valor customizado/i }))
      const input = screen.getByRole("spinbutton", { name: /valor customizado/i })
      await user.type(input, "150")

      await user.click(screen.getByRole("button", { name: /reenviar link/i }))

      await waitFor(() => {
        expect(mockFetcher.submit).toHaveBeenCalled()
      })

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData
      expect(formData.get("intent")).toBe("resend-payment-link")
      expect(formData.get("custom_amount")).toBe("150")
    })

    it("hides the amount input when the checkbox is unchecked again", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(
        { ...mockEventParticipant, application_status: "sent_payment_data" },
        awaitingRequest,
      )
      render(<RouterProvider router={router} />)

      const checkbox = screen.getByRole("checkbox", { name: /valor customizado/i })
      await user.click(checkbox)
      expect(screen.getByRole("spinbutton", { name: /valor customizado/i })).toBeInTheDocument()

      await user.click(checkbox)
      expect(screen.queryByRole("spinbutton", { name: /valor customizado/i })).not.toBeInTheDocument()
    })

    it("omits custom_amount on resend when the checkbox is unchecked after typing a value", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(
        { ...mockEventParticipant, application_status: "sent_payment_data" },
        awaitingRequest,
      )
      render(<RouterProvider router={router} />)

      const checkbox = screen.getByRole("checkbox", { name: /valor customizado/i })
      await user.click(checkbox)
      await user.type(screen.getByRole("spinbutton", { name: /valor customizado/i }), "150")
      await user.click(checkbox)

      await user.click(screen.getByRole("button", { name: /reenviar link/i }))

      await waitFor(() => {
        expect(mockFetcher.submit).toHaveBeenCalled()
      })

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData
      expect(formData.get("intent")).toBe("resend-payment-link")
      expect(formData.get("custom_amount")).toBeNull()
    })

    it("sends custom_amount when auto-saving application_status change to sent_payment_data", async () => {
      const user = userEvent.setup()
      // Participant isn't yet in sent_payment_data — auto-save will fire
      // when the admin changes the dropdown to that value.
      const router = createTestRouter(mockEventParticipant)
      render(<RouterProvider router={router} />)

      await user.click(screen.getByRole("checkbox", { name: /valor customizado/i }))
      await user.type(screen.getByRole("spinbutton", { name: /valor customizado/i }), "180")

      const statusSelect = screen.getByLabelText(/status de inscrição/i)
      await user.click(statusSelect)
      const options = await screen.findAllByRole("option", {
        name: /dados de pagto enviados/i,
      })
      await user.click(options[0])

      await waitFor(() => {
        expect(mockFetcher.submit).toHaveBeenCalled()
      })

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData
      expect(formData.get("intent")).toBe("update-event-participant")
      expect(formData.get("application_status")).toBe("sent_payment_data")
      expect(formData.get("custom_amount")).toBe("180")
    })
  })
})
