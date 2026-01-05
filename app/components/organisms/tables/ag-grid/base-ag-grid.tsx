import {
  AllCommunityModule,
  type ColDef,
  ModuleRegistry,
} from "ag-grid-community"
import { AgGridReact } from "ag-grid-react"
import { cn } from "~/lib/utils"

let modulesRegistered = false

function ensureModulesRegistered() {
  if (!modulesRegistered) {
    ModuleRegistry.registerModules([AllCommunityModule])
    modulesRegistered = true
  }
}

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
  ensureModulesRegistered()

  return (
    <div className={cn("ag-theme-quartz h-[400px]", className)}>
      <AgGridReact rowData={rowData} columnDefs={columnDefs} />
    </div>
  )
}
