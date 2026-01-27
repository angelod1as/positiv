import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { FeedbackWithVerification } from "~/business/feedback/feedback.server"

vi.mock("~/business/feedback/feedback.server", () => ({
  getAllFeedbacksWithVerification: vi.fn(),
}))

vi.mock("~/components/organisms/tables/admin/feedbacks-table", () => ({
  FeedbacksTable: ({ feedbacks }: { feedbacks: FeedbackWithVerification[] }) => (
    <div data-testid="feedbacks-table">
      {feedbacks.length === 0 ? (
        <span>Nenhum feedback</span>
      ) : (
        <ul>
          {feedbacks.map((f) => (
            <li key={f.id} data-testid="feedback-item">
              {f.name || "Anônimo"}
            </li>
          ))}
        </ul>
      )}
    </div>
  ),
}))

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return {
    ...actual,
    useLoaderData: () => ({ feedbacks: mockFeedbacks }),
  }
})

const mockFeedbacks: FeedbackWithVerification[] = [
  {
    id: "1",
    name: "João Silva",
    email: "joao@example.com",
    whatsapp: "11999999999",
    has_participated: "once",
    feedback_text: "Ótimo evento!",
    ip_address: "192.168.1.1",
    created_at: "2024-01-15T10:30:00Z",
    is_verified: true,
  },
  {
    id: "2",
    name: null,
    email: null,
    whatsapp: null,
    has_participated: "never",
    feedback_text: "Feedback anônimo",
    ip_address: "192.168.1.2",
    created_at: "2024-01-14T09:00:00Z",
    is_verified: false,
  },
]

import FeedbacksPage from "./feedbacks-page"

describe("FeedbacksPage", () => {
  it("should render the page title", () => {
    render(<FeedbacksPage />)

    expect(screen.getByText("Feedbacks")).toBeInTheDocument()
  })

  it("should render the FeedbacksTable component", () => {
    render(<FeedbacksPage />)

    expect(screen.getByTestId("feedbacks-table")).toBeInTheDocument()
  })

  it("should pass feedbacks to the table", () => {
    render(<FeedbacksPage />)

    const items = screen.getAllByTestId("feedback-item")
    expect(items).toHaveLength(2)
  })
})
