import type { ColDef } from "ag-grid-community"
import { BaseMultiSelectFilter } from "~/components/organisms/tables/ag-grid/filters/base-multi-select-filter"
import { getVeteranRookieColors } from "~/lib/helpers/cell-colors"
import { isVeteranOptions } from "~/lib/helpers/propMaps"

interface VeteranColumnParams {
  filterModel: string[]
  onFilterChange: (value: string[]) => void
  editable?: boolean
}

export function getVeteranColumn({
  filterModel,
  onFilterChange,
  editable = false,
}: VeteranColumnParams): ColDef {
  return {
    field: "is_veteran",
    headerName: "Vet ou Nov?",
    headerTooltip: "Veterane ou Novate",
    editable,
    ...(editable && {
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: [true, false],
        valueListMaxHeight: 120,
      },
      valueFormatter: (params) => (params.value ? "Veterane" : "Novate"),
    }),
    cellRenderer: (params: { value: boolean | null }) => {
      const colors = getVeteranRookieColors(params.value)
      const label = params.value ? "Veterane" : "Novate"
      return <span className={`px-2 py-0.5 rounded ${colors}`}>{label}</span>
    },
    filter: BaseMultiSelectFilter,
    filterParams: {
      options: isVeteranOptions,
      field: "is_veteran",
      model: filterModel,
      onModelChange: onFilterChange,
    },
    sortable: true,
  }
}
