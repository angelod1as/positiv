import { AG_GRID_LOCALE_BR } from "@ag-grid-community/locale"
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellValueChangedEvent,
  type GridOptions,
  type GridReadyEvent,
  type SelectionChangedEvent,
  type StateUpdatedEvent,
} from "ag-grid-community"
import { AgGridReact } from "ag-grid-react"
import { useCallback } from "react"
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

const gridTheme = themeQuartz.withParams({
  rowBorder: true,
  columnBorder: true,
  headerRowBorder: true,
  headerColumnBorder: true,
  spacing: 7,
})

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
  onRowClicked,
  className,
  height,
  persistState = false,
  stateVersion = 1,
}: AGDataTableProps<TData>) {
  ensureModulesRegistered()

  const { restoreState, saveState } = useGridState(id, {
    version: stateVersion,
  })

  const { handleCellValueChanged: autoSaveHandler } = useAutoSave({
    onSave,
    debounceMs: autoSaveOptions?.debounceMs,
    errorMessage: autoSaveOptions?.errorMessage,
  })

  const safeMessage = escapeHtml(emptyMessage || DEFAULT_EMPTY_MESSAGE)
  const noRowsTemplate = `<span>${safeMessage}</span>`

  const rowSelectionConfig = rowSelection
    ? {
        mode:
          rowSelection === "multiple"
            ? ("multiRow" as const)
            : ("singleRow" as const),
        checkboxes: rowSelection === "multiple",
      }
    : undefined

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<TData>) => {
      if (onRowSelectionChange) {
        const selectedRows = event.api.getSelectedRows()
        onRowSelectionChange(selectedRows)
      }
    },
    [onRowSelectionChange],
  )

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<TData>) => {
      if (onSave && event.oldValue !== event.newValue) {
        autoSaveHandler(event)
      }
      onCellValueChanged?.(event)
    },
    [onSave, autoSaveHandler, onCellValueChanged],
  )

  const handleGridReady = useCallback(
    (event: GridReadyEvent<TData>) => {
      if (persistState) {
        restoreState(event.api)
      }
      onGridReady?.(event)
    },
    [persistState, restoreState, onGridReady],
  )

  const handleStateUpdated = useCallback(
    (event: StateUpdatedEvent<TData>) => {
      if (persistState) {
        saveState(event.state)
      }
      onStateUpdated?.(event)
    },
    [persistState, saveState, onStateUpdated],
  )

  const gridOptions: GridOptions<TData> = {
    defaultColDef: {
      flex: 1,
      minWidth: 100,
    },
    columnDefs,
    paginationAutoPageSize: true,
    pagination: true,
  }

  return (
    <div
      data-testid={`ag-data-table-${id}`}
      className={cn(!height && "h-[400px]", className)}
      style={height ? { height } : undefined}
    >
      <AgGridReact
        gridOptions={gridOptions}
        theme={gridTheme}
        localeText={AG_GRID_LOCALE_BR}
        rowData={data}
        columnDefs={columnDefs}
        loading={loading}
        rowStyle={onRowClicked ? { cursor: "pointer" } : undefined}
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
        onRowClicked={onRowClicked}
      />
    </div>
  )
}
