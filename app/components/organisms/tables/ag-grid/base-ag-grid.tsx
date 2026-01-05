import type { ColDef } from "ag-grid-community"

interface BaseAgGridProps<TData> {
  rowData: TData[]
  columnDefs: ColDef<TData>[]
  className?: string
}

export function BaseAgGrid<TData>(_props: BaseAgGridProps<TData>) {
  // Skeleton: returns empty div to make tests fail on assertions
  return <div>Skeleton</div>
}
