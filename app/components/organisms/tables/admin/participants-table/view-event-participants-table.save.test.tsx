import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import type { AGDataTableProps } from "~/components/organisms/tables/ag-grid/base/types"
import { adminEventsCopy } from "~/copy/admin/events"
import { AdminViewEventParticipantsTable } from "./view-event-participants-table"

const commitJson = vi.hoisted(() => vi.fn())
const success = vi.hoisted(() => vi.fn())
const error = vi.hoisted(() => vi.fn())
const navigate = vi.hoisted(() => vi.fn())

vi.mock("~/components/forms/runtime/commit-json", () => ({ commitJson }))
vi.mock("sonner", () => ({ toast: { success, error } }))

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router")
  return { ...actual, useNavigate: () => navigate }
})

let tableProps: AGDataTableProps<ProfileWithExtraData>

vi.mock("~/components/organisms/tables/ag-grid/base/ag-data-table", () => ({
  AGDataTable: (props: AGDataTableProps<ProfileWithExtraData>) => {
    tableProps = props
    return <div data-testid="grid" />
  },
}))

const participant = {
  id: "ep-1",
  profile_id: "profile-1",
  social_name: "Bia",
  has_paid: false,
  payment: 100,
  attendance_status: "pending",
} as unknown as ProfileWithExtraData

const renderTable = (onParticipantSaved = vi.fn()) => {
  render(
    <AdminViewEventParticipantsTable
      participants={[participant]}
      eventId="event-1"
      onParticipantSaved={onParticipantSaved}
    />,
  )
  return onParticipantSaved
}

const save = (field: string, newValue: unknown) =>
  tableProps.onSave?.({
    field,
    newValue,
    oldValue: null,
    rowData: participant,
    rowId: participant.id,
  })

describe("participants table saving", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    commitJson.mockResolvedValue({ ok: true })
  })

  it("writes an edited cell to the participant route", async () => {
    renderTable()

    await save("payment", 250)

    expect(commitJson).toHaveBeenCalledWith(
      "/api/admin/event-participant",
      { id: "ep-1", profile_id: "profile-1", payment: "250" },
      expect.any(Function),
    )
  })

  it("says the save worked and marks the newsletter list stale", async () => {
    const onParticipantSaved = renderTable()

    await save("payment", 250)

    expect(success).toHaveBeenCalledWith(
      adminEventsCopy.toasts.updateParticipantSuccess,
    )
    expect(onParticipantSaved).toHaveBeenCalled()
  })

  it("says what the server turned the save down for", async () => {
    commitJson.mockResolvedValue({
      ok: false,
      errors: [],
      message: "Escreva o motivo da flag",
    })
    const onParticipantSaved = renderTable()

    await save("payment", 250)

    expect(error).toHaveBeenCalledWith("Escreva o motivo da flag")
    expect(onParticipantSaved).not.toHaveBeenCalled()
  })

  it("falls back to its own words when the refusal carries none", async () => {
    commitJson.mockResolvedValue({ ok: false, errors: [] })
    renderTable()

    await save("payment", 250)

    expect(error).toHaveBeenCalledWith(
      adminEventsCopy.toasts.updateParticipantFailed,
    )
  })

  it("says the save failed when it never reached the server", async () => {
    commitJson.mockRejectedValue(new Error("offline"))
    renderTable()

    await save("payment", 250)

    expect(error).toHaveBeenCalledWith(
      adminEventsCopy.toasts.updateParticipantFailed,
    )
  })

  it("writes nothing for a field the grid does not edit", async () => {
    renderTable()

    await save("social_name", "Outra")

    expect(commitJson).not.toHaveBeenCalled()
  })

  it("keeps has_paid written when a payment lands on a paid row", async () => {
    renderTable()

    tableProps.onCellValueChanged?.({
      colDef: { field: "payment" },
      newValue: 250,
      oldValue: 100,
      data: { ...participant, has_paid: true },
    } as Parameters<NonNullable<typeof tableProps.onCellValueChanged>>[0])

    await vi.waitFor(() =>
      expect(commitJson).toHaveBeenCalledWith(
        "/api/admin/event-participant",
        { id: "ep-1", profile_id: "profile-1", has_paid: "true" },
        expect.any(Function),
      ),
    )
  })
})
