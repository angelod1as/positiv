import type { ColDef } from "ag-grid-community"
import { BaseMultiSelectFilter } from "~/components/organisms/tables/ag-grid/filters/base-multi-select-filter"
import { VeteranSelectCellRenderer } from "~/components/organisms/tables/ag-grid/renderers/veteran-select-cell-renderer"
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
      valueFormatter: (params) => (params.value === true ? "Veterane" : "Novate"),
    }),
    cellRenderer: VeteranSelectCellRenderer,
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
