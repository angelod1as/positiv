import { AG_GRID_LOCALE_BR } from "@ag-grid-community/locale"
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellClassParams,
  type CellValueChangedEvent,
  type GridApi,
  type GridReadyEvent,
  type SelectionChangedEvent,
  type StateUpdatedEvent,
} from "ag-grid-community"
import { AgGridReact } from "ag-grid-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { escapeHtml } from "~/lib/helpers/escape-html"
import { cn } from "~/lib/utils"
import { AGDataTableToolbar } from "./ag-data-table-toolbar"
import { SaveStatusIndicator, type SaveStatus } from "./save-status-indicator"
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
  getRowId,
  loading,
  emptyMessage,
  pagination = false,
  paginationPageSize = 25,
  paginationPageSizeSelector,
  paginationAutoPageSize,
  rowSelection,
  onRowSelectionChange,
  quickFilterText,
  onSave,
  autoSaveOptions,
  fetcher,
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
  headerContent,
}: AGDataTableProps<TData>) {
  ensureModulesRegistered()

  const [gridApi, setGridApi] = useState<GridApi | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { restoreState, saveState, clearState, hasSavedState } = useGridState(
    id,
    {
      version: stateVersion,
    },
  )

  const { handleCellValueChanged: autoSaveHandler, hasPendingSave, isSaving } =
    useAutoSave({
      onSave,
      debounceMs: autoSaveOptions?.debounceMs,
      errorMessage: autoSaveOptions?.errorMessage,
    })

  // Derive save status from fetcher state and local state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (saveStatusTimerRef.current) {
      clearTimeout(saveStatusTimerRef.current)
      saveStatusTimerRef.current = null
    }

    if (hasPendingSave || isSaving) {
      setSaveStatus("saving")
      return
    }

    if (fetcher?.state === "submitting" || fetcher?.state === "loading") {
      setSaveStatus("saving")
      return
    }

    if (fetcher?.data?.success === false) {
      setSaveStatus("error")
      saveStatusTimerRef.current = setTimeout(() => {
        setSaveStatus("idle")
        saveStatusTimerRef.current = null
      }, 3000)
      return
    }

    if (fetcher?.data?.success === true) {
      setSaveStatus("success")
      saveStatusTimerRef.current = setTimeout(() => {
        setSaveStatus("idle")
        saveStatusTimerRef.current = null
      }, 5000)
      return
    }

    setSaveStatus("idle")
  }, [hasPendingSave, isSaving, fetcher?.state, fetcher?.data])

  useEffect(() => {
    return () => {
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current)
        saveStatusTimerRef.current = null
      }
    }
  }, [])

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
      minWidth: 30,
      tooltipValueGetter: (params: { value?: unknown }) => params.value,
      cellStyle: (params: CellClassParams) => {
        if (params.colDef?.editable === true) {
          return { backgroundColor: "rgba(148, 163, 184, 0.15)" }
        }
        return undefined
      },
    }),
    [],
  )


  const containerClasses = cn(
    isFullscreen && "fixed inset-0 z-50 bg-background flex flex-col",
    !isFullscreen && !height && "h-[400px]",
    !isFullscreen && "relative",
    isFullscreen && "h-full",
    className,
  )

  return (
    <div
      data-testid={`ag-data-table-${id}`}
      className={containerClasses}
      style={height && !isFullscreen ? { height } : undefined}
    >
      {headerContent && (
        <div className={cn("mb-2", isFullscreen && "px-4 pt-4")}>
          {headerContent}
        </div>
      )}
      <div className={cn(isFullscreen && "flex-1", !isFullscreen && "h-full")}>
        <AgGridReact
          theme={gridTheme}
          localeText={AG_GRID_LOCALE_BR}
          defaultColDef={defaultColDef}
          rowData={data}
          columnDefs={columnDefs}
          context={context}
          getRowId={getRowId}
          loading={loading}
          rowStyle={onRowClicked ? { cursor: "pointer" } : undefined}
          overlayNoRowsTemplate={noRowsTemplate}
          pagination={pagination}
          paginationPageSize={paginationPageSize}
          paginationPageSizeSelector={paginationPageSizeSelector}
          paginationAutoPageSize={paginationAutoPageSize}
          rowSelection={rowSelectionConfig}
          onSelectionChanged={handleSelectionChanged}
          quickFilterText={quickFilterText}
          onCellValueChanged={handleCellValueChanged}
          onGridReady={handleGridReady}
          onStateUpdated={handleStateUpdated}
          onRowClicked={onRowClicked}
          maintainColumnOrder={persistState}
          tooltipShowMode="whenTruncated"
          tooltipShowDelay={0}
          autoSizeStrategy={
            hasSavedState
              ? undefined
              : {
                  type: "fitCellContents",
                  defaultMinWidth: 30,
                }
          }
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
      {fetcher && <SaveStatusIndicator status={saveStatus} />}
    </div>
  )
}
