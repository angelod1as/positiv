import {
  AllCommunityModule,
  type ColDef,
  ModuleRegistry,
} from "ag-grid-community"
import { AgGridReact } from "ag-grid-react"
import { cn } from "~/lib/utils"

ModuleRegistry.registerModules([AllCommunityModule])

interface BaseAgGridProps<TData> {
  rowData: TData[]
  columnDefs: ColDef<TData>[]
  className?: string
}

export function BaseAgGrid<TData>({
  rowData,
  columnDefs,
  className,
}: BaseAgGridProps<TData>) {
  return (
    <div className={cn("ag-theme-quartz", className)} style={{ height: 400 }}>
      <AgGridReact rowData={rowData} columnDefs={columnDefs} />
    </div>
  )
}
