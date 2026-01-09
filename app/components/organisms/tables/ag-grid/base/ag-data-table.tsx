import { AG_GRID_LOCALE_BR } from "@ag-grid-community/locale"
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellValueChangedEvent,
  type GridApi,
  type GridReadyEvent,
  type SelectionChangedEvent,
  type StateUpdatedEvent,
} from "ag-grid-community"
import { AgGridReact } from "ag-grid-react"
import { useCallback, useMemo, useState } from "react"
import { escapeHtml } from "~/lib/helpers/escape-html"
import { cn } from "~/lib/utils"
import { AGDataTableToolbar } from "./ag-data-table-toolbar"
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
  context,
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
  persistState = true,
  stateVersion = 1,
  showToolbar = true,
  onClearFilters,
}: AGDataTableProps<TData>) {
  ensureModulesRegistered()

  const [gridApi, setGridApi] = useState<GridApi | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { restoreState, saveState, clearState, hasSavedState } = useGridState(id, {
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
      setGridApi(event.api)
      if (persistState) {
        restoreState(event.api)
      }
      onGridReady?.(event)
    },
    [persistState, restoreState, onGridReady],
  )

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  const handleStateUpdated = useCallback(
    (event: StateUpdatedEvent<TData>) => {
      if (persistState) {
        saveState(event.state)
      }
      onStateUpdated?.(event)
    },
    [persistState, saveState, onStateUpdated],
  )

  const defaultColDef = useMemo(
    () => ({
      minWidth: 100,
      ...(hasSavedState ? {} : { flex: 1 }),
    }),
    [hasSavedState],
  )

  const containerClasses = cn(
    isFullscreen && "fixed inset-0 z-50 bg-background flex flex-col",
    !isFullscreen && !height && "h-[400px]",
    isFullscreen && "h-full",
    className,
  )

  return (
    <div
      data-testid={`ag-data-table-${id}`}
      className={containerClasses}
      style={height && !isFullscreen ? { height } : undefined}
    >
      <div className={cn(isFullscreen && "flex-1", !isFullscreen && "h-full")}>
        <AgGridReact
          theme={gridTheme}
          localeText={AG_GRID_LOCALE_BR}
          defaultColDef={defaultColDef}
          rowData={data}
          columnDefs={columnDefs}
          context={context}
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
          maintainColumnOrder={persistState}
        />
      </div>
      {showToolbar && (
        <div className="mt-2 flex justify-end">
          <AGDataTableToolbar
            gridApi={gridApi}
            clearState={clearState}
            onClearFilters={onClearFilters}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />
        </div>
      )}
    </div>
  )
}
