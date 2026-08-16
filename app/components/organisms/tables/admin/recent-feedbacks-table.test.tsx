import { render, screen } from "@testing-library/react"
import type { ColDef } from "ag-grid-community"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { FeedbackWithVerification } from "~/business/feedback/feedback.server"
import { RecentFeedbacksTable } from "./recent-feedbacks-table"

let capturedColumnDefs: ColDef<FeedbackWithVerification>[] = []

vi.mock(
  "~/components/organisms/tables/ag-grid/base/ag-data-table",
  () => ({
    AGDataTable: ({
      data,
      emptyMessage,
      columnDefs,
    }: {
      data: FeedbackWithVerification[]
      emptyMessage: string
      columnDefs: ColDef<FeedbackWithVerification>[]
    }) => {
      capturedColumnDefs = columnDefs
      return (
        <div data-testid="ag-data-table">
          {data.length === 0 ? (
            <span>{emptyMessage}</span>
          ) : (
            <ul>
              {data.map((f) => (
                <li key={f.id} data-testid="feedback-row">
                  {f.name || "Anônimo"} - {f.feedback_text.slice(0, 20)}...
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    },
  }),
)

describe("RecentFeedbacksTable", () => {
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
      status: "in_progress",
      profile_id: null,
      social_name: null,
      full_name: null,
    },
  ]

  const getColumn = (field: string) =>
    capturedColumnDefs.find((column) => column.field === field)

  beforeEach(() => {
    capturedColumnDefs = []
  })

  it("should render the AG Data Table", () => {
    render(<RecentFeedbacksTable feedbacks={mockFeedbacks} />)

    expect(screen.getByTestId("ag-data-table")).toBeInTheDocument()
  })

  it("should render feedback rows", () => {
    render(<RecentFeedbacksTable feedbacks={mockFeedbacks} />)

    const rows = screen.getAllByTestId("feedback-row")
    expect(rows).toHaveLength(2)
  })

  it("should not render a verified column", () => {
    render(<RecentFeedbacksTable feedbacks={mockFeedbacks} />)

    expect(getColumn("is_verified")).toBeUndefined()
    expect(
      capturedColumnDefs.some((column) => column.headerName === "Verificado"),
    ).toBe(false)
  })

  it("should render the status column with Portuguese labels", () => {
    render(<RecentFeedbacksTable feedbacks={mockFeedbacks} />)

    const statusColumn = getColumn("status")
    expect(statusColumn?.headerName).toBe("Status")
    expect(
      // @ts-expect-error - AG Grid types the formatter params loosely
      statusColumn?.valueFormatter?.({ value: "in_progress" }),
    ).toBe("Em progresso")
  })

  it("should keep the status column read-only", () => {
    render(<RecentFeedbacksTable feedbacks={mockFeedbacks} />)

    expect(getColumn("status")?.editable).toBeFalsy()
  })

  it("should show empty message when no feedbacks", () => {
    render(<RecentFeedbacksTable feedbacks={[]} />)

    expect(screen.getByText(/nenhum feedback recente/i)).toBeInTheDocument()
  })
})
