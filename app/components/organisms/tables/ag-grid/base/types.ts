import type {
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  GridState,
  IFilterParams,
  IRowNode,
  RowClickedEvent,
  StateUpdatedEvent,
} from "ag-grid-community"
import type { FetcherWithComponents } from "react-router"

export interface AutoSaveParams {
  field: string
  oldValue: unknown
  newValue: unknown
  rowData: unknown
  rowId: string | undefined
}

export interface AutoSaveOptions {
  debounceMs?: number
  errorMessage?: string
}

export interface AGDataTableProps<TData> {
  id: string
  data: TData[]
  columnDefs: ColDef<TData>[]
  context?: Record<string, unknown>
  getRowId?: (params: GetRowIdParams<TData>) => string

  loading?: boolean
  emptyMessage?: string

  pagination?: boolean
  paginationPageSize?: number
  paginationPageSizeSelector?: number[] | boolean
  paginationAutoPageSize?: boolean

  rowSelection?: "single" | "multiple"
  onRowSelectionChange?: (selectedRows: TData[]) => void

  quickFilterText?: string

  onSave?: (params: AutoSaveParams) => Promise<void>
  autoSaveOptions?: AutoSaveOptions
  fetcher?: FetcherWithComponents<{ success?: boolean; error?: string }>

  onCellValueChanged?: (params: CellValueChangedEvent<TData>) => void
  onGridReady?: (params: GridReadyEvent<TData>) => void
  onStateUpdated?: (params: StateUpdatedEvent<TData>) => void
  onRowClicked?: (params: RowClickedEvent<TData>) => void

  className?: string
  height?: string

  persistState?: boolean
  stateVersion?: number

  showToolbar?: boolean
  onClearFilters?: () => void
  headerContent?: React.ReactNode

  /** External filter: returns true if external filter is active */
  isExternalFilterPresent?: () => boolean
  /** External filter: returns true if row passes the filter */
  doesExternalFilterPass?: (node: IRowNode<TData>) => boolean
}

export interface UseGridStateOptions {
  version: number
  debounceMs?: number
}

export interface StoredGridState {
  version: number
  savedAt: number
  gridState: GridState
}

export interface UseGridStateReturn {
  restoreState: (api: GridApi) => void
  saveState: (state: GridState) => void
  clearState: () => void
  isRestored: boolean
  hasSavedState: boolean
}

export interface CustomFilterParams extends IFilterParams {
  options: Array<{ value: string; label: string }>
  placeholder?: string
  selectAllLabel?: string
  clearLabel?: string
  noResultsLabel?: string
}
