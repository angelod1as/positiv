import type React from "react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import { render, screen, waitFor } from "~/test/test-utils"
import type { ParticipantVsEvent } from "~types/database/entities.types"
import { ParticipantEventHistory } from "./participant-event-history"

const mockParticipantHistory: Array<
  ParticipantVsEvent & { time_event_start: string }
> = [
  {
    id: "1",
    profile_id: "profile-1",
    event_id: "event-1",
    event_title: "Workshop de Introdução",
    event_emoji: "🌱",
    time_event_start: "2024-03-01T10:00:00",
    application_status: "finalised",
    attendance_status: "attended",
    admin_general_notes: "Participou ativamente",
    is_user_applied: true,
    application_date: "2024-02-15T10:00:00",
    created_at: "2024-02-15T10:00:00",
    bond: null,
    notes: null,
    has_paid: false,
    payment: 0,
    referrals: null,
    referred: "",
    companions: null,
    spot_type: "regular",
    cancellation_date: null,
    is_veteran: true,
    approved_to_attend: "approved",
    updated_at: "2024-02-15T10:00:00",
  },
  {
    id: "2",
    profile_id: "profile-1",
    event_id: "event-2",
    event_title: "Roda de Conversa",
    event_emoji: "💬",
    time_event_start: "2024-02-15T14:00:00",
    application_status: "finalised",
    attendance_status: "not-attended",
    admin_general_notes: "Faltou por motivo de saúde",
    is_user_applied: true,
    application_date: "2024-02-01T10:00:00",
    created_at: "2024-02-01T10:00:00",
    bond: null,
    notes: null,
    has_paid: false,
    payment: 0,
    referrals: null,
    referred: "",
    companions: null,
    spot_type: "regular",
    cancellation_date: null,
    is_veteran: true,
    approved_to_attend: "approved",
    updated_at: "2024-02-01T10:00:00",
  },
]

const renderWithRouter = (ui: React.ReactElement) => {
  const router = createMemoryRouter([
    {
      path: "/",
      element: ui,
    },
  ])
  return render(<RouterProvider router={router} />)
}

describe("ParticipantEventHistory", () => {
  it("should render the history section title as 'Histórico de Inscrições'", () => {
    renderWithRouter(<ParticipantEventHistory participantHistory={[]} />)

    expect(screen.getByText("Histórico de Inscrições")).toBeInTheDocument()
  })

  it("should render an AG Grid table with event history", async () => {
    renderWithRouter(
      <ParticipantEventHistory participantHistory={mockParticipantHistory} />,
    )

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument()
    })
  })

  it("should display event information in the table", async () => {
    renderWithRouter(
      <ParticipantEventHistory participantHistory={mockParticipantHistory} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/🌱/)).toBeInTheDocument()
      expect(screen.getByText(/💬/)).toBeInTheDocument()
    })
  })

  it("should display status information with Portuguese labels", async () => {
    renderWithRouter(
      <ParticipantEventHistory participantHistory={mockParticipantHistory} />,
    )

    await waitFor(() => {
      const finalizadoElements = screen.getAllByText("Finalizado")
      expect(finalizadoElements).toHaveLength(2)
      const aprovadeElements = screen.getAllByText("Aprovade")
      expect(aprovadeElements).toHaveLength(2)
      expect(screen.getByText("Compareceu")).toBeInTheDocument()
      expect(screen.getByText("Não compareceu")).toBeInTheDocument()
    })
  })

  it("should display admin notes", async () => {
    renderWithRouter(
      <ParticipantEventHistory participantHistory={mockParticipantHistory} />,
    )

    await waitFor(() => {
      expect(screen.getByText("Participou ativamente")).toBeInTheDocument()
      expect(screen.getByText("Faltou por motivo de saúde")).toBeInTheDocument()
    })
  })

  it("should show empty message when history is empty", async () => {
    renderWithRouter(<ParticipantEventHistory participantHistory={[]} />)

    await waitFor(
      () => {
        expect(
          screen.getByText(/Nenhuma inscrição anterior encontrada/i),
        ).toBeInTheDocument()
      },
      { timeout: 1000 },
    )
  })

  it("should have the correct column headers", async () => {
    renderWithRouter(
      <ParticipantEventHistory participantHistory={mockParticipantHistory} />,
    )

    await waitFor(() => {
      expect(screen.getByText("Nome")).toBeInTheDocument()
      expect(screen.getByText("Status de Processo")).toBeInTheDocument()
      expect(screen.getByText("Status de Aprovação")).toBeInTheDocument()
      expect(screen.getByText("Status de Presença")).toBeInTheDocument()
      expect(
        screen.getByText("Notas gerais da administração para este evento"),
      ).toBeInTheDocument()
    })
  })

  it("should render event titles as clickable links", async () => {
    renderWithRouter(
      <ParticipantEventHistory participantHistory={mockParticipantHistory} />,
    )

    await waitFor(() => {
      const firstEventLink = screen.getByRole("link", {
        name: /Workshop de Introdução/,
      })
      const secondEventLink = screen.getByRole("link", {
        name: /Roda de Conversa/,
      })

      expect(firstEventLink).toBeInTheDocument()
      expect(secondEventLink).toBeInTheDocument()

      expect(firstEventLink).toHaveAttribute(
        "href",
        "/admin/eventos/event-1/participantes/profile-1",
      )
      expect(secondEventLink).toHaveAttribute(
        "href",
        "/admin/eventos/event-2/participantes/profile-1",
      )
    })
  })
})
