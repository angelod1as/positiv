import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FeedbacksTable } from "./feedbacks-table"
import type { FeedbackWithVerification } from "~/business/feedback/feedback.server"

vi.mock(
  "~/components/organisms/tables/ag-grid/base/ag-data-table",
  () => ({
    AGDataTable: ({
      data,
      emptyMessage,
    }: {
      data: FeedbackWithVerification[]
      emptyMessage: string
    }) => (
      <div data-testid="ag-data-table">
        {data.length === 0 ? (
          <span>{emptyMessage}</span>
        ) : (
          <ul>
            {data.map((f) => (
              <li key={f.id} data-testid="feedback-row">
                {f.name || "Anônimo"} - {f.feedback_text.slice(0, 20)}...
                {f.is_verified && <span data-testid="verified-badge">✓</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    ),
  }),
)

describe("FeedbacksTable", () => {
  const mockFeedbacks: FeedbackWithVerification[] = [
    {
      id: "1",
      name: "João Silva",
      email: "joao@example.com",
      whatsapp: "11999999999",
      has_participated: "once",
      feedback_text: "Este é um feedback muito longo que será truncado na exibição",
      can_contact: true,
      ip_address: "192.168.1.1",
      created_at: "2024-01-15T10:30:00Z",
      is_verified: true,
      profile_id: "profile-123",
      social_name: "João",
      full_name: "João Silva",
    },
    {
      id: "2",
      name: null,
      email: null,
      whatsapp: null,
      has_participated: "never",
      feedback_text: "Feedback anônimo",
      can_contact: false,
      ip_address: "192.168.1.2",
      created_at: "2024-01-14T09:00:00Z",
      is_verified: false,
      profile_id: null,
      social_name: null,
      full_name: null,
    },
  ]

  it("should render the AG Data Table", () => {
    render(<FeedbacksTable feedbacks={mockFeedbacks} />)

    expect(screen.getByTestId("ag-data-table")).toBeInTheDocument()
  })

  it("should render feedback rows", () => {
    render(<FeedbacksTable feedbacks={mockFeedbacks} />)

    const rows = screen.getAllByTestId("feedback-row")
    expect(rows).toHaveLength(2)
  })

  it("should show verified badge for verified feedbacks", () => {
    render(<FeedbacksTable feedbacks={mockFeedbacks} />)

    const badges = screen.getAllByTestId("verified-badge")
    expect(badges).toHaveLength(1)
  })

  it("should show empty message when no feedbacks", () => {
    render(<FeedbacksTable feedbacks={[]} />)

    expect(screen.getByText(/nenhum feedback/i)).toBeInTheDocument()
  })
})
