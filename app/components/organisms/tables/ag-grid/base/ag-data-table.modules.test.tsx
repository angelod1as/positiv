import type { ColDef, GridApi } from "ag-grid-community"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, screen, waitFor } from "~/test/test-utils"
import { BaseMultiSelectFilter } from "../filters/base-multi-select-filter"
import { AGDataTable } from "./ag-data-table"

type Row = {
  id: string
  name: string
  status: string
  notes: string
  attended: boolean
}

const rows: Row[] = [
  { id: "1", name: "Ana", status: "a", notes: "", attended: false },
  { id: "2", name: "Bia", status: "b", notes: "", attended: true },
]

const columnDefs: ColDef<Row>[] = [
  {
    field: "name",
    headerTooltip: "Name",
    cellClass: () => "ag-cell-compact",
    pinned: "left",
  },
  {
    field: "status",
    editable: true,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: ["a", "b"] },
    filter: BaseMultiSelectFilter,
    filterParams: {
      options: [
        { value: "a", label: "A" },
        { value: "b", label: "B" },
      ],
      field: "status",
    },
  },
  {
    field: "notes",
    editable: true,
    cellEditor: "agLargeTextCellEditor",
    cellEditorPopup: true,
  },
  {
    field: "attended",
    editable: true,
    cellEditor: "agCheckboxCellEditor",
    cellRenderer: "agCheckboxCellRenderer",
  },
  {
    colId: "plain",
    headerName: "Plain",
    valueGetter: (params) => params.data?.name,
    editable: true,
  },
]

const agGridMessages = (spy: ReturnType<typeof vi.spyOn>) =>
  spy.mock.calls
    .map((args) => args.map(String).join(" "))
    .filter((message) => message.includes("AG Grid"))

describe("AGDataTable module registration", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it("has every module the admin tables rely on", async () => {
    let api: GridApi<Row> | undefined

    render(
      <AGDataTable
        id="modules-test"
        data={rows}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        pagination
        paginationPageSize={10}
        paginationPageSizeSelector={[10, 20]}
        rowSelection="multiple"
        showSearch
        quickFilterText="Ana"
        persistState
        showToolbar
        onRowClicked={() => {}}
        isExternalFilterPresent={() => false}
        doesExternalFilterPass={() => true}
        onGridReady={(event) => {
          api = event.api
        }}
      />,
    )

    await waitFor(() => expect(api).toBeDefined())
    const grid = api as GridApi<Row>

    await act(async () => {
      const listener = () => {}
      grid.addEventListener("filterChanged", listener)
      grid.removeEventListener("filterChanged", listener)
      grid.getDisplayedRowCount()
      grid.getRowNode("1")
      grid.forEachNode(() => {})
      grid.refreshCells({ force: true })
      grid.setFilterModel({ status: ["a"] })
      grid.setFilterModel(null)
      grid.resetColumnState()
      grid.getSelectedRows()
      grid.setState({})
    })

    for (const colKey of ["status", "notes", "attended", "plain"]) {
      act(() => grid.startEditingCell({ rowIndex: 0, colKey }))
      await waitFor(() => expect(grid.getEditingCells()).toHaveLength(1))
      await waitFor(() =>
        expect(
          document.querySelector(".ag-cell-inline-editing, .ag-popup-editor"),
        ).not.toBeNull(),
      )
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
      act(() => grid.stopEditing(true))
      await waitFor(() => expect(grid.getEditingCells()).toHaveLength(0))
    }

    expect(screen.getByRole("grid")).toBeInTheDocument()
    expect([...agGridMessages(errorSpy), ...agGridMessages(warnSpy)]).toEqual(
      [],
    )
  })
})
