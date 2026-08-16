import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { FeedbackWithVerification } from "~/business/feedback/feedback.server"
import { updateFeedbackStatus } from "~/business/feedback/feedback.server"
import { updateFeedbackStatusSchema } from "~/business/feedback/feedback-schema"

vi.mock("~/business/feedback/feedback.server", () => ({
  getAllFeedbacksWithVerification: vi.fn(),
  updateFeedbackStatus: vi.fn(),
}))

const formAction = vi.fn()

vi.mock("remix-forms", () => ({
  formAction: (...args: unknown[]) => formAction(...args),
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
    can_contact: true,
    ip_address: "192.168.1.1",
    created_at: "2024-01-15T10:30:00Z",
    status: "new",
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
    status: "resolved",
    profile_id: null,
    social_name: null,
    full_name: null,
  },
]

import FeedbacksPage, { action } from "./feedbacks-page"

const buildRequest = (fields: Record<string, string>) =>
  new Request("http://localhost/admin/dashboard/feedbacks", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  })

describe("FeedbacksPage action", () => {
  beforeEach(() => {
    formAction.mockReset()
    formAction.mockResolvedValue({ success: true })
  })

  it("should update the feedback status", async () => {
    const request = buildRequest({
      intent: "update-feedback-status",
      id: "1",
      status: "resolved",
    })

    await action({ request } as Parameters<typeof action>[0])

    expect(formAction).toHaveBeenCalledTimes(1)
    expect(formAction.mock.calls[0][0]).toMatchObject({
      schema: updateFeedbackStatusSchema,
      mutation: updateFeedbackStatus,
    })
  })

  it("should tag the result with the intent", async () => {
    const request = buildRequest({
      intent: "update-feedback-status",
      id: "1",
      status: "in_progress",
    })

    await action({ request } as Parameters<typeof action>[0])

    const { transformResult } = formAction.mock.calls[0][0]
    expect(transformResult({ success: true })).toEqual({
      success: true,
      intent: "update-feedback-status",
    })
  })

  it("should ignore an unknown intent", async () => {
    const request = buildRequest({ intent: "delete-everything", id: "1" })

    await action({ request } as Parameters<typeof action>[0])

    expect(formAction).not.toHaveBeenCalled()
  })
})

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
