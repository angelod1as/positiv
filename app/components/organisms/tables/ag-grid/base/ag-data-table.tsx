import {
  AllCommunityModule,
  ModuleRegistry,
} from "ag-grid-community"
import { AgGridReact } from "ag-grid-react"
import { cn } from "~/lib/utils"
import type { AGDataTableProps } from "./types"

let modulesRegistered = false

function ensureModulesRegistered() {
  if (!modulesRegistered) {
    ModuleRegistry.registerModules([AllCommunityModule])
    modulesRegistered = true
  }
}

export function AGDataTable<TData>({
  id,
  data,
  columnDefs,
  className,
}: AGDataTableProps<TData>) {
  ensureModulesRegistered()

  return (
    <div
      data-testid={`ag-data-table-${id}`}
      className={cn("ag-theme-quartz h-[400px]", className)}
    >
      <AgGridReact rowData={data} columnDefs={columnDefs} />
    </div>
  )
}
