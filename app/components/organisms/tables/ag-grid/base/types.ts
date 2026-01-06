import type {
  CellValueChangedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
  GridState,
  IFilterParams,
  StateUpdatedEvent,
} from "ag-grid-community"

export interface AGDataTableProps<TData> {
  id: string
  data: TData[]
  columnDefs: ColDef<TData>[]

  loading?: boolean
  emptyMessage?: string

  pagination?: boolean
  paginationPageSize?: number
  paginationPageSizeSelector?: number[] | boolean

  rowSelection?: "single" | "multiple"
  onRowSelectionChange?: (selectedRows: TData[]) => void

  quickFilterText?: string

  onCellValueChanged?: (params: CellValueChangedEvent<TData>) => void
  onGridReady?: (params: GridReadyEvent<TData>) => void
  onStateUpdated?: (params: StateUpdatedEvent<TData>) => void

  className?: string
  height?: string

  persistState?: boolean
  stateVersion?: number
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
}

export interface CustomFilterParams extends IFilterParams {
  options: Array<{ value: string; label: string }>
  field: string
  placeholder?: string
  selectAllLabel?: string
  clearLabel?: string
  noResultsLabel?: string
}
