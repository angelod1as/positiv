import type { ICellRendererParams } from "ag-grid-community"
import { getVeteranRookieColors } from "~/lib/helpers/cell-colors"

export function VeteranSelectCellRenderer(params: ICellRendererParams) {
  const isVeteran = params.value === true
  const label = isVeteran ? "Veterane" : "Novate"
  const colors = getVeteranRookieColors(isVeteran)

  return (
    <div className="flex h-full w-full items-center">
      <span className={`px-2 py-1 rounded text-sm ${colors}`}>{label}</span>
    </div>
  )
}
