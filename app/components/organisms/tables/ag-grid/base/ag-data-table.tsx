import {
  AllCommunityModule,
  ModuleRegistry,
  type SelectionChangedEvent,
} from "ag-grid-community"
import { AgGridReact } from "ag-grid-react"
import { cn } from "~/lib/utils"
import type { AGDataTableProps } from "./types"

let modulesRegistered = false

function ensureModulesRegistered() {
  if (!modulesRegistered) {
    ModuleRegistry.registerModules([AllCommunityModule])
    modulesRegistered = true
  }
}

const DEFAULT_EMPTY_MESSAGE = "Nenhum registro encontrado"

export function AGDataTable<TData>({
  id,
  data,
  columnDefs,
  loading,
  emptyMessage,
  pagination = false,
  paginationPageSize = 25,
  paginationPageSizeSelector,
  rowSelection,
  onRowSelectionChange,
  quickFilterText,
  className,
}: AGDataTableProps<TData>) {
  ensureModulesRegistered()

  const noRowsTemplate = `<span>${emptyMessage || DEFAULT_EMPTY_MESSAGE}</span>`

  const rowSelectionConfig = rowSelection
    ? {
        mode: rowSelection === "multiple" ? ("multiRow" as const) : ("singleRow" as const),
        checkboxes: rowSelection === "multiple",
      }
    : undefined

  const handleSelectionChanged = (event: SelectionChangedEvent<TData>) => {
    if (onRowSelectionChange) {
      const selectedRows = event.api.getSelectedRows()
      onRowSelectionChange(selectedRows)
    }
  }

  return (
    <div
      data-testid={`ag-data-table-${id}`}
      className={cn("ag-theme-quartz h-[400px]", className)}
    >
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        loading={loading}
        overlayNoRowsTemplate={noRowsTemplate}
        pagination={pagination}
        paginationPageSize={paginationPageSize}
        paginationPageSizeSelector={paginationPageSizeSelector}
        rowSelection={rowSelectionConfig}
        onSelectionChanged={handleSelectionChanged}
        quickFilterText={quickFilterText}
      />
    </div>
  )
}
