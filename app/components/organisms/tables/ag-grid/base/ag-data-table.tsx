import {
  AllCommunityModule,
  ModuleRegistry,
  type CellValueChangedEvent,
  type GridReadyEvent,
  type SelectionChangedEvent,
  type StateUpdatedEvent,
} from "ag-grid-community"
import { AgGridReact } from "ag-grid-react"
import { escapeHtml } from "~/lib/helpers/escape-html"
import { cn } from "~/lib/utils"
import type { AGDataTableProps } from "./types"
import { useAutoSave } from "./use-auto-save"
import { useGridState } from "./use-grid-state"

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
  onSave,
  autoSaveOptions,
  onCellValueChanged,
  onGridReady,
  onStateUpdated,
  className,
  height,
  persistState = false,
  stateVersion = 1,
}: AGDataTableProps<TData>) {
  ensureModulesRegistered()

  const { restoreState, saveState } = useGridState(id, { version: stateVersion })

  const { handleCellValueChanged: autoSaveHandler } = useAutoSave({
    onSave,
    debounceMs: autoSaveOptions?.debounceMs,
    errorMessage: autoSaveOptions?.errorMessage,
  })

  const safeMessage = escapeHtml(emptyMessage || DEFAULT_EMPTY_MESSAGE)
  const noRowsTemplate = `<span>${safeMessage}</span>`

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

  const handleCellValueChanged = (event: CellValueChangedEvent<TData>) => {
    if (onSave) {
      autoSaveHandler(event)
    }
    onCellValueChanged?.(event)
  }

  const handleGridReady = (event: GridReadyEvent<TData>) => {
    if (persistState) {
      restoreState(event.api)
    }
    onGridReady?.(event)
  }

  const handleStateUpdated = (event: StateUpdatedEvent<TData>) => {
    if (persistState) {
      saveState(event.state)
    }
    onStateUpdated?.(event)
  }

  return (
    <div
      data-testid={`ag-data-table-${id}`}
      className={cn("ag-theme-quartz", !height && "h-[400px]", className)}
      style={height ? { height } : undefined}
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
        onCellValueChanged={handleCellValueChanged}
        onGridReady={handleGridReady}
        onStateUpdated={handleStateUpdated}
      />
    </div>
  )
}
