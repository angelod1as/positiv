import type { CellValueChangedEvent, ColDef, GridReadyEvent } from "ag-grid-community"

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

  className?: string
  height?: string
}
