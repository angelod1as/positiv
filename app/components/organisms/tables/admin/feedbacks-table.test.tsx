import { render, screen } from "@testing-library/react"
import type { ColDef } from "ag-grid-community"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FeedbacksTable } from "./feedbacks-table"
import type { FeedbackWithVerification } from "~/business/feedback/feedback.server"

const commitJson = vi.hoisted(() => vi.fn())
const navigate = vi.hoisted(() => vi.fn())

vi.mock("~/components/forms/runtime/commit-json", () => ({ commitJson }))

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return { ...actual, useNavigate: () => navigate }
})

let capturedColumnDefs: ColDef<FeedbackWithVerification>[] = []
let capturedOnSave:
  | ((params: {
      field: string
      newValue: unknown
      rowData: unknown
    }) => Promise<void>)
  | undefined

vi.mock(
  "~/components/organisms/tables/ag-grid/base/ag-data-table",
  () => ({
    AGDataTable: ({
      data,
      emptyMessage,
      columnDefs,
      onSave,
    }: {
      data: FeedbackWithVerification[]
      emptyMessage: string
      columnDefs: ColDef<FeedbackWithVerification>[]
      onSave?: (params: {
        field: string
        newValue: unknown
        rowData: unknown
      }) => Promise<void>
    }) => {
      capturedColumnDefs = columnDefs
      capturedOnSave = onSave
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
    capturedOnSave = undefined
    vi.clearAllMocks()
    commitJson.mockResolvedValue({ ok: true })
    sessionStorage.clear()
  })

  it("should render the AG Data Table", () => {
    render(<FeedbacksTable feedbacks={mockFeedbacks} />)

    expect(screen.getByTestId("ag-data-table")).toBeInTheDocument()
  })

  it("should render feedback rows", () => {
    render(<FeedbacksTable feedbacks={mockFeedbacks} />)

    const rows = screen.getAllByTestId("feedback-row")
    expect(rows).toHaveLength(2)
  })

  it("should render an editable status column with every status option", () => {
    render(<FeedbacksTable feedbacks={mockFeedbacks} />)

    const statusColumn = getColumn("status")
    expect(statusColumn?.headerName).toBe("Status")
    expect(statusColumn?.editable).toBe(true)
    expect(statusColumn?.cellEditor).toBe("agSelectCellEditor")
    expect(statusColumn?.cellEditorParams).toMatchObject({
      values: ["new", "in_progress", "resolved"],
    })
    expect(
      // @ts-expect-error - AG Grid types the formatter params loosely
      statusColumn?.valueFormatter?.({ value: "resolved" }),
    ).toBe("Resolvido")
  })

  it("should offer a status filter", () => {
    render(<FeedbacksTable feedbacks={mockFeedbacks} />)

    const statusColumn = getColumn("status")
    expect(statusColumn?.filter).toBeDefined()
    expect(statusColumn?.filterParams).toMatchObject({
      field: "status",
      options: [
        { name: "Novo", value: "new" },
        { name: "Em progresso", value: "in_progress" },
        { name: "Resolvido", value: "resolved" },
      ],
    })
  })

  it("should write the status change to the feedback status route", async () => {
    render(<FeedbacksTable feedbacks={mockFeedbacks} />)

    await capturedOnSave?.({
      field: "status",
      newValue: "resolved",
      rowData: mockFeedbacks[0],
    })

    expect(commitJson).toHaveBeenCalledWith(
      "/api/admin/feedback-status",
      { id: "1", status: "resolved" },
      expect.any(Function),
    )
  })

  it("should survive a save that never reached the server", async () => {
    commitJson.mockRejectedValueOnce(new Error("offline"))
    render(<FeedbacksTable feedbacks={mockFeedbacks} />)

    await expect(
      capturedOnSave?.({
        field: "status",
        newValue: "resolved",
        rowData: mockFeedbacks[0],
      }),
    ).resolves.toBeUndefined()
  })

  it("should not submit changes to a non-editable field", async () => {
    render(<FeedbacksTable feedbacks={mockFeedbacks} />)

    await capturedOnSave?.({
      field: "email",
      newValue: "hacker@example.com",
      rowData: mockFeedbacks[0],
    })

    expect(commitJson).not.toHaveBeenCalled()
  })

  it("should show empty message when no feedbacks", () => {
    render(<FeedbacksTable feedbacks={[]} />)

    expect(screen.getByText(/nenhum feedback/i)).toBeInTheDocument()
  })
})
